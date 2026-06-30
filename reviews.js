/* ── Avis clients : étoiles + commentaire ──
   Firestore si configuré (CONFIG.firebase.apiKey), sinon localStorage.
   Pattern identique à cart.js / auth.js (_fbReady()). */
const Reviews = (() => {
    const STORAGE_KEY = 'ssc_reviews';
    let _cache = [];   // dernière liste résolue par getAll()

    function _fbReady() {
        return typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length > 0;
    }

    function _userId(user) {
        return user.uid || (user.email || '').toLowerCase();
    }

    function _userLabel(user) {
        return user.displayName || user.username || (user.email ? user.email.split('@')[0] : 'Client');
    }

    function _getLocal() {
        try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
    }
    function _saveLocal(list) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    }

    function _sortDesc(list) {
        return list.slice().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    }

    /* ── Crée ou met à jour l'avis de l'utilisateur connecté ── */
    async function submit(rating, comment) {
        const user = typeof Auth !== 'undefined' ? Auth.currentUser() : null;
        if (!user) throw new Error('Connexion requise');

        rating = Math.max(1, Math.min(5, Math.round(Number(rating))));
        comment = String(comment || '').trim().slice(0, 300);
        if (!comment) throw new Error('Le commentaire est requis');

        const id = _userId(user);
        const review = {
            id,
            userId: id,
            userName: _userLabel(user),
            rating,
            comment,
            createdAt: Date.now(),
            route: user.route || null
        };

        if (_fbReady()) {
            try {
                await firebase.firestore().collection('reviews').doc(id).set(review);
                return review;
            } catch (e) {
                console.warn('⚠️ Avis non enregistré sur Firestore, repli local :', e.message);
            }
        }
        const list = _getLocal().filter(r => r.id !== id);
        list.push(review);
        _saveLocal(list);
        return review;
    }

    /* ── Tous les avis, triés du plus récent au plus ancien ── */
    async function getAll() {
        if (_fbReady()) {
            try {
                const snap = await firebase.firestore().collection('reviews').orderBy('createdAt', 'desc').get();
                _cache = snap.docs.map(d => d.data());
                return _cache;
            } catch (e) {
                console.warn('⚠️ Lecture Firestore impossible, repli local :', e.message);
            }
        }
        _cache = _sortDesc(_getLocal());
        return _cache;
    }

    /* ── Avis existant de l'utilisateur connecté (synchrone, basé sur le cache) ── */
    function getMine() {
        const user = typeof Auth !== 'undefined' ? Auth.currentUser() : null;
        if (!user) return null;
        const id = _userId(user);
        return _cache.find(r => r.id === id) || null;
    }

    return { submit, getAll, getMine };
})();
