const CONFIG = {
    domain:          'medipharma.ca',         // ← Domaine GoDaddy
    adminEmail:      'admin@medipharma.ca',   // ← Email de l'administrateur
    adminUsername:   'eltajoseph29',          // ← Nom d'utilisateur de l'administrateur
    whatsappNumber:  '14384029247',           // ← Numéro WhatsApp sans + ni espaces
    web3formsKey:    '',                       // ← Clé Web3Forms pour les notifications email (voir NOTIFICATIONS-SETUP.md)
    paypal: {
        handle: 'TON_COMPTE_PAYPAL', // ex: 'mediafrica' → paypal.me/mediafrica
        currency: 'CAD'
    },
    stripe: {
        publishableKey:     '', // ← Clé publique Stripe (pk_live_... ou pk_test_...)
        checkoutFunctionUrl: ''  // ← URL de la Cloud Function "createCheckoutSession" (voir STRIPE-SETUP.md)
    },
    firebase: {
        apiKey: 'AIzaSyB7LeycuOSH_-jTHiHAqMJQcNmavudJ19Q',
        authDomain: 'medipharma-59f91.firebaseapp.com',
        projectId: 'medipharma-59f91',
        storageBucket: 'medipharma-59f91.firebasestorage.app',
        messagingSenderId: '997014467512',
        appId: '1:997014467512:web:b2de9a225d307d7a77954d'
    },

    // ── Régions (portails) ──
    // Devise affichée par région. Modifiable (ex. International en USD/XOF).
    regions: {
        canada:        { label: 'Canada',        currency: 'CAD', symbol: '$' },
        international: { label: 'International',  currency: 'CAD', symbol: '$' }
    },
    defaultRegion: 'canada',

    // ── Prix à deux niveaux ──
    // Chaque produit : { unite: prix détail (client), gros: prix grossiste }.
    // Le prix de gros n'est affiché qu'aux comptes marqués « grossiste ».
    // Les 10 liquides ont les prix réels du dossier (gros / détail).
    // Pour les autres, "unite" est à confirmer par le client dans l'admin.
    prices: {
        // ── Vitamines Liquides (1500 ml) ──
        "Vitamine C Liquide":          { unite: 24.99, gros: 12.99 },
        "Vitamine D3 Liquide":         { unite: 24.99, gros: 12.99 },
        "Zinc Liquide":                { unite: 24.99, gros: 12.99 },
        "Multivitamines Liquide":      { unite: 24.99, gros: 12.99 },
        "Mélatonine Liquide":          { unite: 19.99, gros: 10.99 },
        "Vitamine B12 Liquide":        { unite: 29.99, gros: 14.99 },
        "B-Complexe Liquide":          { unite: 24.99, gros: 13.99 },
        "Hair, Skin & Nails Liquide":  { unite: 24.99, gros: 12.99 },
        "Elderberry (Sureau) Liquide": { unite: 34.99, gros: 15.99 },
        "Collagène Liquide":           { unite: 34.99, gros: 15.99 },

        // ── Gummies ── (unité = à confirmer par le client)
        "Multivitamines Adultes":      { unite: 22.99, gros: 12.99 },
        "Multivitamines Enfants":      { unite: 22.99, gros: 12.99 },
        "Multivitamines Femmes":       { unite: 22.99, gros: 12.99 },
        "Vitamine C Gummies":          { unite: 22.99, gros: 12.99 },
        "Vitamine D3 Gummies":         { unite: 22.99, gros: 12.99 },
        "Vitamine B12 Gummies":        { unite: 27.99, gros: 14.99 },
        "B-Complex Gummies":           { unite: 24.99, gros: 13.99 },
        "Magnésium Gummies":           { unite: 22.99, gros: 12.99 }
    },

    /**
     * Retourne le prix à appliquer pour un produit selon le rôle.
     * @param {string} name  Nom exact du produit (= <h3> de la carte)
     * @param {boolean} grossiste  true → prix de gros, sinon prix unité
     * @returns {number|null}
     */
    priceFor(name, grossiste) {
        const p = this.prices[name];
        if (p == null) return null;
        if (typeof p === 'number') return p;           // rétro-compat (ancien format)
        return grossiste ? (p.gros ?? p.unite ?? null) : (p.unite ?? null);
    },

    /** true si le produit a un prix de gros distinct défini. */
    hasGros(name) {
        const p = this.prices[name];
        return !!(p && typeof p === 'object' && p.gros != null);
    },

    /** Formate un montant en devise de la région courante. */
    formatPrice(amount, region) {
        if (amount == null) return 'Sur devis';
        const reg = this.regions[region || this.currentRegion() || this.defaultRegion] || { symbol: '$' };
        return amount.toLocaleString('fr-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ' + reg.symbol;
    },

    /** Région choisie par le visiteur (localStorage), sinon défaut. */
    currentRegion() {
        try { return localStorage.getItem('ssc_region') || this.defaultRegion; }
        catch { return this.defaultRegion; }
    }
};

// Surcharges de prix définies dans le panneau admin (localStorage 'ssc_prices')
// Format attendu : { "Nom produit": { unite: x, gros: y } }
try {
    const _overrides = JSON.parse(localStorage.getItem('ssc_prices') || 'null');
    if (_overrides && typeof _overrides === 'object') {
        for (const k in _overrides) CONFIG.prices[k] = _overrides[k];
    }
} catch (e) { /* ignore */ }

// Initialise Firebase dès que les clés sont renseignées
if (typeof firebase !== 'undefined' && CONFIG.firebase.apiKey) {
    firebase.initializeApp(CONFIG.firebase);
} else if (typeof firebase !== 'undefined' && !CONFIG.firebase.apiKey) {
    console.info('ℹ️ Solutions Santé Canada : Firebase non configuré — mode local (comptes et commandes stockés dans ce navigateur uniquement).');
}
