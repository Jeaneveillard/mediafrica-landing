/**
 * Pricing — règles d'affichage des prix :
 *  • Non connecté              → aucun prix visible ("Connectez-vous")
 *  • Client connecté           → prix à l'unité uniquement
 *  • Grossiste validé par admin → prix de gros (flag isGrossiste + grossisteValidated)
 */
const Pricing = (() => {

    function _user() {
        return (typeof Auth !== 'undefined' && Auth.currentUser) ? Auth.currentUser() : null;
    }

    function _isGrossisteValide() {
        const u = _user();
        return !!(u && u.isGrossiste && u.grossisteValidated);
    }

    function _name(card) {
        const h3 = card.querySelector('h3');
        return h3 ? h3.textContent.replace(/\s+/g, ' ').trim() : '';
    }

    function _render(card) {
        if (typeof CONFIG === 'undefined') return;

        let el = card.querySelector('.produit-prix') || card.querySelector('.product-price');
        if (!el) {
            el = document.createElement('div');
            el.className = 'product-price';
            const body = card.querySelector('.cat-card-body') || card;
            body.appendChild(el);
        }

        // Retire les prix codés en dur dans les badges .cat-dosage
        card.querySelectorAll('.cat-dosage span').forEach(sp => {
            if (/\$|CAD/.test(sp.textContent)) sp.remove();
        });

        const connected = !!_user();

        // Visiteur non connecté → invitation à se connecter
        if (!connected) {
            el.innerHTML =
                `<button type="button" class="pp-login-prompt" onclick="if(typeof Auth!=='undefined')Auth.openModal()">` +
                `<i class="fa-solid fa-lock"></i> Connectez-vous pour voir le prix</button>`;
            el.classList.remove('is-gros');
            return;
        }

        const name  = _name(card);
        const unite = CONFIG.priceFor(name, false);
        if (unite == null) return; // produit sans prix → rien

        const isAdmin = typeof Auth !== 'undefined' && Auth.isAdmin && Auth.isAdmin();

        if (isAdmin) {
            // Admin : voit les deux prix clairement, sans barré
            const gros = CONFIG.priceFor(name, true);
            el.innerHTML =
                `<span class="pp-amount">${CONFIG.formatPrice(unite)}</span>` +
                `<span class="pp-tag">à l'unité</span>` +
                (gros != null && gros !== unite
                    ? `<span class="pp-sep">·</span>` +
                      `<span class="pp-amount pp-gros">${CONFIG.formatPrice(gros)}</span>` +
                      `<span class="pp-tag pp-tag-gros"><i class="fa-solid fa-tags"></i> gros</span>`
                    : ``);
            el.classList.remove('is-gros');
        } else if (_isGrossisteValide()) {
            const gros = CONFIG.priceFor(name, true);
            el.innerHTML =
                `<span class="pp-amount pp-gros">${CONFIG.formatPrice(gros ?? unite)}</span>` +
                `<span class="pp-tag pp-tag-gros"><i class="fa-solid fa-tags"></i> Prix grossiste</span>` +
                `<span class="pp-unite-ref">${CONFIG.formatPrice(unite)} à l'unité</span>`;
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
        document.addEventListener('prices:changed', render);   // prix admin chargés depuis Firestore
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    return { render };
})();
