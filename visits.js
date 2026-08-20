/* ===================================================================
   Visits — compteur de visites maison (Firestore)
   -------------------------------------------------------------------
   Alimente l'onglet « Statistiques » du panneau d'administration, pour
   consulter la fréquentation sans passer par Google Analytics.

   Vie privée : comptage strictement ANONYME et agrégé.
   Aucun cookie, aucun identifiant, aucune IP, aucune donnée personnelle —
   seulement des compteurs par jour. N'étant pas un traceur au sens de la
   Loi 25 / RGPD, il n'est pas soumis au consentement : il compte donc
   100 % des visiteurs, là où GA4 perd ceux qui refusent la bannière.

   Structure Firestore — un document par jour :
     stats/2026-08-19 = {
       date: '2026-08-19',
       vues: 128,                      // pages chargées
       visites: 47,                    // sessions distinctes
       pages: { 'index': 60, 'catalogue': 45, ... }
     }
   =================================================================== */
const Visits = (() => {
    const SESSION_KEY = 'ssc_visite_en_cours';

    function _today() {
        // Heure de l'Est (Montréal) pour que « aujourd'hui » corresponde à
        // la journée du client, pas au fuseau du visiteur.
        const d = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Toronto' });
        return d; // format YYYY-MM-DD
    }

    /** Nom de page lisible, utilisable comme clé Firestore (pas de point ni de /). */
    function _pageKey() {
        let p = location.pathname.split('/').pop() || 'index';
        p = p.replace(/\.html$/, '');
        if (!p) p = 'index';
        return p.replace(/[^a-zA-Z0-9_-]/g, '') || 'index';
    }

    function _firestorePret() {
        return typeof firebase !== 'undefined'
            && typeof firebase.firestore === 'function'
            && typeof CONFIG !== 'undefined' && CONFIG.firebase && CONFIG.firebase.apiKey;
    }

    /** L'équipe ne se compte pas elle-même (ADM et DEV). */
    function _estEquipe() {
        try {
            if (localStorage.getItem('ssc_admin_session')) return true;
            const u = firebase.auth && firebase.auth().currentUser;
            if (!u || !u.email) return false;
            const email = u.email.toLowerCase();
            const ae = (CONFIG.adminEmail || '').toLowerCase();
            const de = (CONFIG.devEmail   || '').toLowerCase();
            return (ae && email === ae) || (de && email === de);
        } catch { return false; }
    }

    /** true la première fois de la session : sert à distinguer visites et pages vues. */
    function _nouvelleSession() {
        try {
            if (sessionStorage.getItem(SESSION_KEY)) return false;
            sessionStorage.setItem(SESSION_KEY, '1');
            return true;
        } catch { return false; }   // navigation privée stricte : compté en page vue seulement
    }

    /** Enregistre la visite courante. Silencieux en cas d'échec (hors ligne, etc.). */
    function _compter() {
        if (!_firestorePret()) return;
        if (location.protocol === 'file:') return;
        if (_estEquipe()) return;

        const jour = _today();
        const inc  = firebase.firestore.FieldValue.increment(1);

        // L'objet `pages` doit être imbriqué explicitement : avec set(), une clé
        // « pages.index » créerait un champ nommé littéralement ainsi, au lieu
        // d'alimenter la map `pages`. Seul update() interprète la notation pointée.
        const maj = { date: jour, vues: inc, pages: {} };
        maj.pages[_pageKey()] = inc;
        if (_nouvelleSession()) maj.visites = inc;

        firebase.firestore().collection('stats').doc(jour)
            .set(maj, { merge: true })
            .catch(err => console.debug('Compteur de visites indisponible :', err.message));
    }

    /* ── Lecture (panneau d'administration) ───────────────────────── */

    /**
     * Retourne les statistiques des N derniers jours, du plus ancien au plus récent.
     * @param {number} jours 7, 30…
     * @returns {Promise<Array<{date,vues,visites,pages}>>}
     */
    async function derniersJours(jours = 30) {
        if (!_firestorePret()) return [];

        const attendus = [];
        for (let i = jours - 1; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            attendus.push(d.toLocaleDateString('en-CA', { timeZone: 'America/Toronto' }));
        }

        const snap = await firebase.firestore().collection('stats')
            .where('date', '>=', attendus[0])
            .get();

        const parJour = {};
        snap.forEach(doc => { parJour[doc.id] = doc.data(); });

        // Les jours sans visite n'ont pas de document : on les rend à zéro
        // pour que le graphique ne saute pas de dates.
        return attendus.map(d => ({
            date:    d,
            vues:    (parJour[d] && parJour[d].vues)    || 0,
            visites: (parJour[d] && parJour[d].visites) || 0,
            pages:   (parJour[d] && parJour[d].pages)   || {}
        }));
    }

    /** Agrège les pages les plus vues sur une série renvoyée par derniersJours(). */
    function pagesPopulaires(serie) {
        const total = {};
        serie.forEach(j => {
            for (const page in j.pages) total[page] = (total[page] || 0) + j.pages[page];
        });
        return Object.entries(total)
            .map(([page, vues]) => ({ page, vues }))
            .sort((a, b) => b.vues - a.vues);
    }

    /* ── Démarrage : on ne compte pas le panneau d'administration ── */
    if (!/admin\.html$/.test(location.pathname)) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', _compter);
        } else {
            _compter();
        }
    }

    return { derniersJours, pagesPopulaires };
})();
