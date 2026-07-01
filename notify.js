/**
 * Notify — envoie des notifications email via Web3Forms (https://web3forms.com).
 * Service gratuit compatible sites statiques (GitHub Pages) : un POST JSON avec
 * la clé d'accès envoie un email à l'adresse propriétaire de la clé.
 *
 * Configuration : renseigner CONFIG.web3formsKey dans config.js
 * (voir NOTIFICATIONS-SETUP.md). Tant que la clé est vide, rien n'est envoyé
 * (repli silencieux) — le site fonctionne normalement.
 */
const Notify = (() => {
    const ENDPOINT = 'https://api.web3forms.com/submit';

    function _key() {
        return (typeof CONFIG !== 'undefined' && CONFIG.web3formsKey) ? CONFIG.web3formsKey : '';
    }

    function _send(subject, fields) {
        const key = _key();
        if (!key) return;   // notifications non configurées → silencieux
        fetch(ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({
                access_key: key,
                subject,
                from_name: 'Solutions Santé Canada',
                ...fields
            })
        }).catch(() => {});   // en cas d'échec réseau, ne bloque jamais l'utilisateur
    }

    /** Appelé depuis auth.js après inscription réussie */
    function inscription(user) {
        const region = (typeof Region !== 'undefined' && Region.get) ? Region.get() : '';
        const statut = user.isGrossiste ? 'Grossiste (en attente de validation)' : 'Client';
        _send('🆕 Nouvelle inscription — ' + (user.displayName || user.email || 'Client'), {
            nom:      user.displayName || '',
            username: user.username    || '',
            email:    user.email       || '',
            statut,
            portail:  region || 'canada',
            date:     new Date().toLocaleString('fr-CA')
        });
    }

    /** Appelé depuis cart.js / b2b-orders.js après commande confirmée */
    function commande(order) {
        const lignes = (order.items || []).map(i =>
            `${i.name} × ${i.qty || i.quantity} — ${i.prix != null ? i.prix.toFixed(2) + ' $' : 'Sur devis'}`
        ).join('\n');
        _send('🛒 Nouvelle commande ' + (order.id || ''), {
            id_commande: order.id       || '',
            client:      order.client   || '',
            email:       order.email    || '',
            total:       order.total != null ? order.total.toFixed(2) + ' $' : 'Sur devis',
            produits:    lignes,
            date:        new Date().toLocaleString('fr-CA')
        });
    }

    return { inscription, commande };
})();
