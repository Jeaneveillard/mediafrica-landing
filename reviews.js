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

    /* ── Injection du modal de soumission (une seule fois) ── */
    function _injectModal() {
        if (document.getElementById('reviewModal')) return;
        document.body.insertAdjacentHTML('beforeend', `
        <div class="auth-backdrop" id="reviewBackdrop"></div>
        <div class="auth-modal" id="reviewModal" role="dialog" aria-modal="true">
            <button type="button" class="auth-close" id="reviewClose" aria-label="Fermer"><i class="fa-solid fa-xmark"></i></button>
            <h3 class="review-modal-title">Laisser un avis</h3>
            <div class="review-stars" id="reviewStars">
                ${[1,2,3,4,5].map(v => `<button type="button" class="review-star" data-value="${v}" aria-label="${v} étoile${v>1?'s':''}"><i class="fa-solid fa-star"></i></button>`).join('')}
            </div>
            <p class="review-rating-label" id="reviewRatingLabel">Choisissez une note</p>
            <textarea class="review-textarea" id="reviewComment" maxlength="300" placeholder="Partagez votre expérience..."></textarea>
            <div class="review-char-count" id="reviewCharCount">0 / 300</div>
            <p class="auth-error" id="reviewError"></p>
            <button type="button" class="btn-auth" id="reviewSubmitBtn" disabled>Envoyer</button>
        </div>`);
    }

    let _selectedRating = 0;

    function _setRating(value) {
        _selectedRating = value;
        document.querySelectorAll('#reviewStars .review-star').forEach(btn => {
            btn.classList.toggle('active', Number(btn.dataset.value) <= value);
        });
        const label = document.getElementById('reviewRatingLabel');
        if (label) label.textContent = value ? `Note : ${value} / 5` : 'Choisissez une note';
        _updateSubmitState();
    }

    function _updateSubmitState() {
        const btn = document.getElementById('reviewSubmitBtn');
        const comment = document.getElementById('reviewComment');
        if (!btn || !comment) return;
        btn.disabled = !(_selectedRating > 0 && comment.value.trim().length > 0);
    }

    function openModal() {
        _injectModal();
        const mine = getMine();
        _setRating(mine ? mine.rating : 0);
        const comment = document.getElementById('reviewComment');
        if (comment) {
            comment.value = mine ? mine.comment : '';
            document.getElementById('reviewCharCount').textContent = `${comment.value.length} / 300`;
        }
        const error = document.getElementById('reviewError');
        if (error) error.textContent = '';
        document.getElementById('reviewModal')?.classList.add('open');
        document.getElementById('reviewBackdrop')?.classList.add('open');
        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        document.getElementById('reviewModal')?.classList.remove('open');
        document.getElementById('reviewBackdrop')?.classList.remove('open');
        document.body.style.overflow = '';
    }

    function _updateButtonLabel() {
        const btn = document.getElementById('leaveReviewBtn');
        if (!btn) return;
        const user = typeof Auth !== 'undefined' ? Auth.currentUser() : null;
        if (!user) { btn.innerHTML = '<i class="fa-solid fa-star"></i> Laisser un avis'; return; }
        const mine = getMine();
        btn.innerHTML = mine
            ? '<i class="fa-solid fa-star"></i> Modifier mon avis'
            : '<i class="fa-solid fa-star"></i> Laisser un avis';
    }

    function _wireEvents() {
        document.getElementById('leaveReviewBtn')?.addEventListener('click', () => {
            const user = typeof Auth !== 'undefined' ? Auth.currentUser() : null;
            if (!user) { Auth.openModal('review'); return; }
            openModal();
        });

        document.addEventListener('click', e => {
            if (e.target.closest('#reviewClose') || e.target.id === 'reviewBackdrop') closeModal();
            const starBtn = e.target.closest('.review-star');
            if (starBtn) _setRating(Number(starBtn.dataset.value));
            if (e.target.id === 'reviewSubmitBtn' && !e.target.disabled) _handleSubmit();
        });

        document.addEventListener('input', e => {
            if (e.target.id === 'reviewComment') {
                document.getElementById('reviewCharCount').textContent = `${e.target.value.length} / 300`;
                _updateSubmitState();
            }
        });

        document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

        document.addEventListener('auth:changed', () => { _updateButtonLabel(); });
    }

    async function _handleSubmit() {
        const comment = document.getElementById('reviewComment')?.value || '';
        const error = document.getElementById('reviewError');
        try {
            await submit(_selectedRating, comment);
            closeModal();
            await _refresh();
            _updateButtonLabel();
        } catch (e) {
            if (error) error.textContent = e.message;
        }
    }

    async function init() {
        _wireEvents();
        await _refresh();
        _updateButtonLabel();
    }

    return { init, submit, getAll, getMine, openModal };
})();

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { if (document.getElementById('testimonialsGrid')) Reviews.init(); });
} else {
    if (document.getElementById('testimonialsGrid')) Reviews.init();
}
