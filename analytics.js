/* ===================================================================
   Analytics — Google Analytics 4 (GA4)
   -------------------------------------------------------------------
   Ne s'active QUE si CONFIG.ga4MeasurementId est renseigné (G-XXXXXXXXXX).
   Tant qu'il est vide, ce fichier ne charge rien et n'affiche rien.

   Respect de la Loi 25 (Québec) / RGPD :
   Google Consent Mode v2 — aucun cookie de mesure n'est déposé avant
   que le visiteur ait cliqué « Accepter ». Le choix est mémorisé 6 mois.
   =================================================================== */
const Analytics = (() => {
    const CONSENT_KEY  = 'ssc_consent_analytics';
    const CONSENT_DAYS = 180;

    const measurementId = (typeof CONFIG !== 'undefined' && CONFIG.ga4MeasurementId) || '';

    /* ── État du consentement : 'granted' | 'denied' | null (pas encore choisi) ── */
    function _storedConsent() {
        try {
            const raw = localStorage.getItem(CONSENT_KEY);
            if (!raw) return null;
            const { value, date } = JSON.parse(raw);
            const ageDays = (Date.now() - date) / 86400000;
            if (ageDays > CONSENT_DAYS) { localStorage.removeItem(CONSENT_KEY); return null; }
            return value;
        } catch { return null; }
    }
    function _saveConsent(value) {
        try { localStorage.setItem(CONSENT_KEY, JSON.stringify({ value, date: Date.now() })); }
        catch { /* mode privé : le choix ne sera pas mémorisé */ }
    }

    /* ── Chargement de gtag.js + Consent Mode ── */
    function _boot() {
        window.dataLayer = window.dataLayer || [];
        window.gtag = function () { window.dataLayer.push(arguments); };

        // Par défaut : tout refusé. Rien n'est stocké tant que le visiteur n'a pas accepté.
        gtag('consent', 'default', {
            ad_storage:              'denied',
            ad_user_data:            'denied',
            ad_personalization:      'denied',
            analytics_storage:       'denied',
            functionality_storage:   'granted',
            security_storage:        'granted',
            wait_for_update:         500
        });

        gtag('js', new Date());
        gtag('config', measurementId, { anonymize_ip: true });

        const s = document.createElement('script');
        s.async = true;
        s.src   = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(measurementId);
        document.head.appendChild(s);
    }

    function _grant() {
        gtag('consent', 'update', {
            analytics_storage: 'granted',
            ad_storage:        'denied',   // aucune publicité sur le site
            ad_user_data:      'denied',
            ad_personalization:'denied'
        });
    }

    /* ── Bannière de consentement ── */
    function _showBanner() {
        if (document.getElementById('sscConsentBar')) return;

        const bar = document.createElement('div');
        bar.id = 'sscConsentBar';
        bar.setAttribute('role', 'dialog');
        bar.setAttribute('aria-label', 'Consentement aux statistiques de visite');
        bar.style.cssText = `
            position:fixed; left:1rem; right:1rem; bottom:1rem; z-index:9998;
            max-width:640px; margin:0 auto;
            background:#FFFEF9; border:1.5px solid #E7E0D4; border-radius:16px;
            box-shadow:0 16px 48px rgba(28,25,23,.14);
            padding:1.15rem 1.35rem; font-family:'DM Sans',sans-serif;
            display:flex; flex-wrap:wrap; gap:.9rem; align-items:center;
            animation:sscConsentIn .35s ease-out;
        `;
        bar.innerHTML = `
            <p style="flex:1 1 260px; margin:0; font-size:.88rem; line-height:1.5; color:#1C1917">
                Nous utilisons des statistiques de visite anonymes pour améliorer le site.
                Aucune donnée n'est vendue ni utilisée à des fins publicitaires.
            </p>
            <div style="display:flex; gap:.6rem; flex:0 0 auto; margin-left:auto">
                <button type="button" id="sscConsentNo"
                    style="padding:.75rem 1.05rem; border-radius:8px; cursor:pointer;
                           border:1.5px solid #E7E0D4; background:transparent;
                           color:#78716C; font-family:inherit; font-size:.85rem; font-weight:500">
                    Refuser
                </button>
                <button type="button" id="sscConsentYes"
                    style="padding:.75rem 1.25rem; border-radius:8px; cursor:pointer;
                           border:none; background:#14532D; color:#fff;
                           font-family:inherit; font-size:.85rem; font-weight:600">
                    Accepter
                </button>
            </div>
        `;

        const style = document.createElement('style');
        style.textContent = '@keyframes sscConsentIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}';
        document.head.appendChild(style);
        document.body.appendChild(bar);

        bar.querySelector('#sscConsentYes').addEventListener('click', () => {
            _saveConsent('granted'); _grant(); bar.remove();
        });
        bar.querySelector('#sscConsentNo').addEventListener('click', () => {
            _saveConsent('denied'); bar.remove();
        });
    }

    /* ── API publique ─────────────────────────────────────────────── */

    /**
     * Envoie un événement à GA4. Sans effet si GA4 n'est pas configuré
     * ou si le visiteur a refusé les statistiques.
     * @param {string} name   ex. 'add_to_cart', 'purchase'
     * @param {object} params paramètres GA4 (value, currency, items…)
     */
    function track(name, params = {}) {
        if (!measurementId || typeof gtag !== 'function') return;
        try { gtag('event', name, params); }
        catch (err) { console.warn('⚠️ Analytics:', err.message); }
    }

    /** Permet au visiteur de revenir sur son choix (lien « Statistiques » en pied de page). */
    function reopenConsent() {
        try { localStorage.removeItem(CONSENT_KEY); } catch {}
        if (measurementId) _showBanner();
    }

    /** true si GA4 est branché et le visiteur a accepté la mesure. */
    function isActive() {
        return !!measurementId && _storedConsent() === 'granted';
    }

    /* ── Démarrage ────────────────────────────────────────────────── */
    if (measurementId) {
        _boot();
        const consent = _storedConsent();
        if (consent === 'granted') {
            _grant();
        } else if (consent === null) {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', _showBanner);
            } else {
                _showBanner();
            }
        }
    }

    return { track, reopenConsent, isActive };
})();
