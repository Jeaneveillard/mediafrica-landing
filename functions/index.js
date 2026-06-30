const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const Stripe = require('stripe');

const STRIPE_SECRET_KEY = defineSecret('STRIPE_SECRET_KEY');

// Crée une session Stripe Checkout pour une commande du panier ou B2B.
// Appelée depuis cart.js (voir CONFIG.stripe.checkoutFunctionUrl dans config.js).
exports.createCheckoutSession = onRequest(
    { secrets: [STRIPE_SECRET_KEY], cors: true, region: 'northamerica-northeast1' },
    async (req, res) => {
        if (req.method !== 'POST') {
            res.status(405).json({ error: 'Méthode non autorisée' });
            return;
        }
        try {
            const stripe = Stripe(STRIPE_SECRET_KEY.value());
            const { items, currency, factureNum, customerEmail, successUrl, cancelUrl } = req.body || {};

            if (!Array.isArray(items) || items.length === 0) {
                res.status(400).json({ error: 'Panier vide' });
                return;
            }

            const line_items = items
                .filter(i => i.unitPrice != null)
                .map(i => ({
                    price_data: {
                        currency: (currency || 'CAD').toLowerCase(),
                        product_data: { name: i.name },
                        unit_amount: Math.round(i.unitPrice * 100)
                    },
                    quantity: i.qty || 1
                }));

            if (line_items.length === 0) {
                res.status(400).json({ error: 'Aucun article avec prix défini (devis requis)' });
                return;
            }

            const session = await stripe.checkout.sessions.create({
                mode: 'payment',
                payment_method_types: ['card'],
                line_items,
                customer_email: customerEmail || undefined,
                success_url: successUrl || 'https://medipharma.ca/facture.html?paye=1',
                cancel_url:  cancelUrl  || 'https://medipharma.ca',
                metadata: { factureNum: factureNum || '' }
            });

            res.status(200).json({ url: session.url, id: session.id });
        } catch (e) {
            console.error('Stripe Checkout Session error:', e);
            res.status(500).json({ error: e.message });
        }
    }
);
