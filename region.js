/**
 * Region — portails Canada / International.
 *  • Au 1er visit : fenêtre de choix du portail.
 *  • Bouton de bascule dans l'entête (rouvre le choix).
 *  • Mémorise le choix (localStorage 'ssc_region').
 *  • Applique body[data-region] + filtre les éléments [data-region-only="canada|international"].
 *  • Émet l'évènement 'region:changed' (écouté par Pricing pour la devise).
 */
const Region = (() => {
    const KEY = 'ssc_region';

    function get() { try { return localStorage.getItem(KEY); } catch { return null; } }

    function _label(r) {
        if (typeof CONFIG !== 'undefined' && CONFIG.regions && CONFIG.regions[r]) return CONFIG.regions[r].label;
        return r === 'international' ? 'International' : 'Canada';
    }
    function _flag(r) { return r === 'international' ? '🌍' : '🍁'; }

    function set(r) {
        if (r !== 'canada' && r !== 'international') r = 'canada';
        try { localStorage.setItem(KEY, r); } catch (e) {}
        _apply(r);
        closeModal();
        document.dispatchEvent(new CustomEvent('region:changed', { detail: { region: r } }));
    }

    function _apply(r) {
        document.body.setAttribute('data-region', r);
        // Contenu spécifique à une région
        document.querySelectorAll('[data-region-only]').forEach(el => {
            const want = el.getAttribute('data-region-only');
            el.style.display = (!want || want === r) ? '' : 'none';
        });
        // Libellés "région courante" un peu partout
        document.querySelectorAll('.region-name').forEach(el => el.textContent = _label(r));
        document.querySelectorAll('.region-switch-btn .rs-label').forEach(el => el.textContent = _label(r));
        document.querySelectorAll('.region-switch-btn .rs-flag').forEach(el => el.textContent = _flag(r));
    }

    /* ── Fenêtre de choix ── */
    function _injectModal() {
        if (document.getElementById('regionModal')) return;
        document.body.insertAdjacentHTML('beforeend', `
        <div class="region-modal" id="regionModal" role="dialog" aria-modal="true">
            <div class="region-box">
                <img src="assets/logo-ssc.png" alt="Solutions Santé Canada" class="region-logo">
                <h2>Bienvenue chez MediPharma</h2>
                <p>Choisissez votre portail pour une expérience adaptée à votre région.</p>
                <div class="region-options">
                    <button type="button" class="region-card" data-region="canada">
                        <span class="region-card-flag">🍁</span>
                        <strong>Canada</strong>
                        <span class="region-card-sub">Livraison nationale</span>
                    </button>
                    <button type="button" class="region-card" data-region="international">
                        <span class="region-card-flag">🌍</span>
                        <strong>International</strong>
                        <span class="region-card-sub">Guinée Conakry · Burkina Faso · Côte d'Ivoire</span>
                    </button>
                </div>
            </div>
        </div>`);
        document.querySelectorAll('#regionModal .region-card').forEach(btn =>
            btn.addEventListener('click', () => set(btn.dataset.region))
        );
    }

    function openModal()  { _injectModal(); document.getElementById('regionModal')?.classList.add('open'); }
    function closeModal() { document.getElementById('regionModal')?.classList.remove('open'); }

    /* ── Bouton bascule dans l'entête ── */
    function _injectSwitch() {
        const actions = document.querySelector('.nav-actions');
        if (!actions || document.querySelector('.region-switch-btn')) return;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'region-switch-btn';
        btn.setAttribute('aria-label', 'Changer de portail');
        btn.innerHTML = `<span class="rs-flag">🍁</span><span class="rs-label">Canada</span><i class="fa-solid fa-chevron-down"></i>`;
        btn.addEventListener('click', openModal);
        actions.insertBefore(btn, actions.firstChild);
    }

    function init() {
        _injectSwitch();
        const current = get();
        if (current) {
            _apply(current);
        } else {
            // Pas encore de choix : on applique le défaut et on propose le choix
            _apply(typeof CONFIG !== 'undefined' ? CONFIG.defaultRegion : 'canada');
            openModal();
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    return { get, set, openModal, closeModal };
})();
