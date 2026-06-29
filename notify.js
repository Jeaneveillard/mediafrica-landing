/**
 * Notify — envoie des notifications email via Netlify Forms.
 * Netlify intercepte la soumission et transfère l'email à l'adresse configurée
 * dans l'onglet "Forms" > "Form notifications" du projet Netlify.
 *
 * Deux formulaires cachés doivent exister dans le HTML :
 *   #notify-inscription  (name="notify-inscription" data-netlify="true")
 *   #notify-commande     (name="notify-commande"    data-netlify="true")
 */
const Notify = (() => {

    function _submit(formId, data) {
        const form = document.getElementById(formId);
        if (!form) return;
        const fd = new FormData();
        fd.append('form-name', form.getAttribute('name'));
        Object.entries(data).forEach(([k, v]) => fd.append(k, v ?? ''));
        fetch('/', { method: 'POST', body: fd }).catch(() => {});
    }

    /** Appelé depuis auth.js après inscription réussie */
    function inscription(user) {
        const region = (typeof Region !== 'undefined' && Region.get) ? Region.get() : '';
        const statut = user.isGrossiste ? 'Grossiste (en attente de validation)' : 'Client';
        _submit('notify-inscription', {
            nom:      user.displayName || '',
            username: user.username    || '',
            email:    user.email       || '',
            statut,
            portail:  region || 'canada',
            date:     new Date().toLocaleString('fr-CA')
        });
    }

    /** Appelé depuis cart.js après commande confirmée */
    function commande(order) {
        const lignes = (order.items || []).map(i =>
            `${i.name} × ${i.qty || i.quantity} — ${i.prix != null ? i.prix.toFixed(2)+' $' : 'Sur devis'}`
        ).join('\n');
        _submit('notify-commande', {
            id_commande: order.id       || '',
            client:      order.client   || '',
            email:       order.email    || '',
            total:       order.total != null ? order.total.toFixed(2)+' $' : 'Sur devis',
            produits:    lignes,
            date:        new Date().toLocaleString('fr-CA')
        });
    }

    return { inscription, commande };
})();
