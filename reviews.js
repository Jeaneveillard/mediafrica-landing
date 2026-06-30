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

    function _esc(str) {
        return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    function _initials(name) {
        return String(name || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('') || '?';
    }

    function _starsHTML(rating) {
        let html = '';
        for (let i = 1; i <= 5; i++) {
            html += `<i class="fa-solid fa-star" style="color:${i <= rating ? 'var(--gold)' : 'var(--border)'}"></i>`;
        }
        return html;
    }

    /* ── Injecte les avis dynamiques après les témoignages statiques ── */
    function _renderGrid(reviews) {
        const grid = document.getElementById('testimonialsGrid');
        if (!grid) return;
        grid.querySelectorAll('.testi-card--dynamic').forEach(el => el.remove());
        reviews.forEach(r => {
            const card = document.createElement('div');
            card.className = 'testi-card testi-card--dynamic reveal';
            card.innerHTML = `
                <div class="testi-stars">${_starsHTML(r.rating)}</div>
                <p>"${_esc(r.comment)}"</p>
                <div class="testi-user">
                    <div class="testi-avatar">${_esc(_initials(r.userName))}</div>
                    <div class="testi-info">
                        <strong>${_esc(r.userName)}</strong>
                        ${r.route ? `<span>${_esc(r.route)}</span>` : ''}
                    </div>
                </div>`;
            grid.appendChild(card);
        });
    }

    /* ── Note moyenne affichée dans l'en-tête de section ── */
    function _renderSummary(reviews) {
        const el = document.getElementById('reviewsSummary');
        if (!el) return;
        if (!reviews.length) { el.style.display = 'none'; return; }
        const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
        el.innerHTML = `${avg.toFixed(1)} <i class="fa-solid fa-star" style="color:var(--gold)"></i> · ${reviews.length} avis`;
        el.style.display = 'inline-flex';
    }

    async function _refresh() {
        const reviews = await getAll();
        _renderGrid(reviews);
        _renderSummary(reviews);
        return reviews;
    }

    return { submit, getAll, getMine, _refresh };
})();
