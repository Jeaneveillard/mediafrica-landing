/**
 * Pricing — affiche le bon prix sur chaque carte produit selon le rôle.
 *  • Client normal  → prix à l'unité (détail)
 *  • Grossiste connecté → prix de gros (affiché uniquement aux grossistes)
 * Se re-rend automatiquement au login/logout (event 'auth:changed')
 * et au changement de portail/devise (event 'region:changed').
 */
const Pricing = (() => {

    function _name(card) {
        const h3 = card.querySelector('h3');
        // textContent décode &amp; → & ; on normalise les espaces
        return h3 ? h3.textContent.replace(/\s+/g, ' ').trim() : '';
    }

    function _isGrossiste() {
        return typeof Auth !== 'undefined' && Auth.isGrossiste && Auth.isGrossiste();
    }

    function _render(card) {
        if (typeof CONFIG === 'undefined') return;
        const name  = _name(card);
        const unite = CONFIG.priceFor(name, false);
        if (unite == null) return;                 // produit sans prix défini → on n'affiche rien
        const gros     = CONFIG.priceFor(name, true);
        const grossiste = _isGrossiste();

        // Retire un éventuel prix codé en dur dans la ligne de dosage du catalogue
        card.querySelectorAll('.cat-dosage span').forEach(sp => {
            if (/\$|CAD/.test(sp.textContent)) sp.remove();
        });

        // Élément cible : .produit-prix (index) sinon on (ré)utilise/crée .product-price
        let el = card.querySelector('.produit-prix') || card.querySelector('.product-price');
        if (!el) {
            el = document.createElement('div');
            el.className = 'product-price';
            const body = card.querySelector('.cat-card-body') || card;
            body.appendChild(el);
        }

        if (grossiste && gros != null) {
            el.innerHTML =
                `<span class="pp-amount pp-gros">${CONFIG.formatPrice(gros)}</span>` +
                `<span class="pp-tag pp-tag-gros"><i class="fa-solid fa-tags"></i> Prix grossiste</span>`;
            el.classList.add('is-gros');
        } else {
            el.innerHTML =
                `<span class="pp-amount">${CONFIG.formatPrice(unite)}</span>` +
                `<span class="pp-tag">à l'unité</span>`;
            el.classList.remove('is-gros');
        }
    }

    function render() {
        document.querySelectorAll('.cat-card, .produit-card--photo').forEach(_render);
    }

    function init() {
        render();
        document.addEventListener('auth:changed', render);
        document.addEventListener('region:changed', render);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    return { render };
})();
