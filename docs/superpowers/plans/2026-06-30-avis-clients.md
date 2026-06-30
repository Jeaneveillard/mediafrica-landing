# Avis clients — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permettre aux clients connectés de soumettre un avis (1-5 étoiles + commentaire) affiché publiquement dans la section témoignages de la page d'accueil, avec stockage Firestore/localStorage dual-mode comme le reste du site.

**Architecture:** Nouveau module `reviews.js` autonome suivant le pattern `_fbReady()` déjà utilisé par `cart.js`/`auth.js` : Firestore si `CONFIG.firebase.apiKey` est renseigné, sinon `localStorage`. Le module expose une API publique (`Reviews.init/submit/getAll/getMine`) et s'auto-initialise au chargement de `index.html`. Réutilise les classes CSS `.auth-modal`/`.auth-backdrop`/`.testi-card` existantes pour la cohérence visuelle.

**Tech Stack:** HTML/CSS/JS vanilla (pas de framework), Firebase v9 compat SDK (Firestore), localStorage.

## Global Constraints

- Aucun framework de test automatisé dans ce projet (site statique, pas de `package.json` avec scripts de test). La vérification se fait avec `node --check <fichier>.js` pour la syntaxe, et avec les outils `mcp__Claude_Preview__*` (preview_start, preview_eval, preview_fill, preview_click) pour le comportement réel dans le navigateur — c'est la pratique déjà suivie dans ce projet.
- Un avis par compte utilisateur : la clé d'unicité est `user.uid` si disponible (mode Firebase), sinon `user.email.toLowerCase()` (mode local) — un utilisateur en mode local n'a jamais de `uid`.
- Publication immédiate, aucune modération.
- Les 5 témoignages statiques existants dans `index.html` restent inchangés et ne sont jamais supprimés par ce travail.
- Style : réutiliser `var(--green)`, `var(--gold)`, `var(--muted)`, `var(--border)` etc. déjà définis dans `style.css` — ne pas introduire de nouvelles couleurs.

---

### Task 1: Module de données `reviews.js` (stockage, soumission, lecture)

**Files:**
- Create: `reviews.js`

**Interfaces:**
- Consumes: `Auth.currentUser()` (retourne `null` ou un objet `{ uid?, displayName?, username?, email }` — défini dans `auth.js:800`), `firebase.firestore()` (SDK global si `firebase.apps.length > 0`).
- Produces: `Reviews.submit(rating, comment)` → `Promise<{id, userId, userName, rating, comment, createdAt, route}>`, `Reviews.getAll()` → `Promise<Array<même forme>>` triés du plus récent au plus ancien, `Reviews.getMine()` → objet ou `null` (synchrone, basé sur le dernier `getAll()` résolu).

- [ ] **Step 1: Créer `reviews.js` avec la couche de données**

```js
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
```

- [ ] **Step 2: Vérifier la syntaxe**

Run: `cd "C:\Users\jeane\Desktop\Amboul\mediafrica-landing" && node --check reviews.js`
Expected: aucune sortie (succès silencieux).

- [ ] **Step 3: Commit**

```bash
cd "C:\Users\jeane\Desktop\Amboul\mediafrica-landing"
git add reviews.js
git commit -m "feat(reviews): module de données avis clients (Firestore/localStorage)"
```

---

### Task 2: Rendu des avis dans la grille de témoignages

**Files:**
- Modify: `reviews.js` (ajout des fonctions de rendu)

**Interfaces:**
- Consumes: `Reviews.getAll()` (Task 1), DOM `#testimonialsGrid`, `#reviewsSummary` (créés dans Task 4).
- Produces: `Reviews._render()` — fonction interne appelée après chaque `getAll()`/`submit()` réussi, ne fait rien si les conteneurs n'existent pas dans la page (permet de charger `reviews.js` sans erreur sur une page sans section témoignages).

- [ ] **Step 1: Ajouter les fonctions de rendu dans `reviews.js`**

Insérer juste avant le `return { submit, getAll, getMine };` :

```js
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
```

Puis remplacer la ligne `return { submit, getAll, getMine };` par :

```js
    return { submit, getAll, getMine, _refresh };
```

- [ ] **Step 2: Vérifier la syntaxe**

Run: `cd "C:\Users\jeane\Desktop\Amboul\mediafrica-landing" && node --check reviews.js`
Expected: aucune sortie.

- [ ] **Step 3: Commit**

```bash
cd "C:\Users\jeane\Desktop\Amboul\mediafrica-landing"
git add reviews.js
git commit -m "feat(reviews): rendu des avis dynamiques + note moyenne"
```

---

### Task 3: Modal de soumission (étoiles, commentaire) + initialisation

**Files:**
- Modify: `reviews.js` (ajout HTML modal, wiring, `init()`)
- Modify: `cart.css` (styles modal avis, étoiles, bouton)

**Interfaces:**
- Consumes: `Auth.openModal('review')` (modifié dans Task 4), `Auth.currentUser()`, événement `auth:changed` (déclenché par `auth.js:44`).
- Produces: `Reviews.init()` — injecte le HTML du modal, câble les événements, lance `_refresh()` initial, écoute `auth:changed` pour mettre à jour le libellé du bouton.

- [ ] **Step 1: Ajouter l'injection HTML et le wiring dans `reviews.js`**

Insérer juste avant le `return { submit, getAll, getMine, _refresh };` :

```js
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
```

Remplacer la ligne `return { submit, getAll, getMine, _refresh };` par :

```js
    return { init, submit, getAll, getMine, openModal };
})();

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { if (document.getElementById('testimonialsGrid')) Reviews.init(); });
} else {
    if (document.getElementById('testimonialsGrid')) Reviews.init();
}
```

Note : le `})();` de fermeture de l'IIFE déplacé ici remplace celui qui suivait `return { submit, getAll, getMine, _refresh };` dans l'état précédent du fichier — il ne doit y avoir qu'une seule fermeture `})();` à la fin du fichier.

- [ ] **Step 2: Ajouter les styles dans `cart.css`**

Ajouter à la fin de `cart.css` :

```css
/* ── Avis clients ── */
.btn-leave-review {
    margin-top: 1.5rem;
    padding: .7rem 1.5rem;
    background: var(--green);
    color: #fff;
    border: none;
    border-radius: 999px;
    font-family: var(--font-body);
    font-size: .9rem;
    font-weight: 600;
    cursor: pointer;
    transition: opacity .2s;
}
.btn-leave-review:hover { opacity: .9; }

.reviews-summary {
    display: none;
    align-items: center;
    gap: .4rem;
    margin-top: 1rem;
    font-weight: 700;
    color: var(--text);
    font-size: 1.05rem;
}

.testi-stars { margin-bottom: 1rem; font-size: .9rem; }
.testi-stars i { margin-right: 2px; }

.review-modal-title { font-size: 1.3rem; margin-bottom: 1.25rem; color: var(--text); }

.review-stars { display: flex; gap: .5rem; margin-bottom: .5rem; }
.review-star {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 1.6rem;
    color: var(--border);
    padding: .2rem;
    transition: color .15s, transform .1s;
}
.review-star:hover { transform: scale(1.1); }
.review-star.active { color: var(--gold); }

.review-rating-label { font-size: .85rem; color: var(--muted); margin-bottom: 1rem; }

.review-textarea {
    width: 100%;
    min-height: 100px;
    padding: .75rem 1rem;
    border: 1px solid var(--border);
    border-radius: 10px;
    font-family: var(--font-body);
    font-size: .95rem;
    resize: vertical;
}
.review-textarea:focus { outline: none; border-color: var(--green); }

.review-char-count { text-align: right; font-size: .78rem; color: var(--muted); margin: .35rem 0 1rem; }

#reviewSubmitBtn:disabled { opacity: .5; cursor: not-allowed; }
```

- [ ] **Step 3: Vérifier la syntaxe JS**

Run: `cd "C:\Users\jeane\Desktop\Amboul\mediafrica-landing" && node --check reviews.js`
Expected: aucune sortie.

- [ ] **Step 4: Commit**

```bash
cd "C:\Users\jeane\Desktop\Amboul\mediafrica-landing"
git add reviews.js cart.css
git commit -m "feat(reviews): modal de soumission (étoiles, commentaire) + init"
```

---

### Task 4: Intégration dans `index.html` et `auth.js`

**Files:**
- Modify: `index.html:408-473` (bouton + conteneurs + script tag)
- Modify: `auth.js:516-531` (`_afterAuthSuccess`)

**Interfaces:**
- Consumes: `Reviews.openModal()` (Task 3).
- Produces: page fonctionnelle de bout en bout.

- [ ] **Step 1: Ajouter le bouton et les conteneurs dans `index.html`**

Remplacer (autour de la ligne 408-415) :

```html
    <section class="section testimonials" id="temoignages">
        <div class="container">
            <div class="section-header reveal">
                <span class="section-tag">Confiance</span>
                <h2>Ce que nos <em>clients disent</em></h2>
                <p>La satisfaction de nos patients est notre plus grande récompense.</p>
            </div>
            <div class="testimonials-grid">
```

par :

```html
    <section class="section testimonials" id="temoignages">
        <div class="container">
            <div class="section-header reveal">
                <span class="section-tag">Confiance</span>
                <h2>Ce que nos <em>clients disent</em></h2>
                <p>La satisfaction de nos patients est notre plus grande récompense.</p>
                <div class="reviews-summary" id="reviewsSummary"></div>
                <button type="button" class="btn-leave-review" id="leaveReviewBtn">
                    <i class="fa-solid fa-star"></i> Laisser un avis
                </button>
            </div>
            <div class="testimonials-grid" id="testimonialsGrid">
```

- [ ] **Step 2: Ajouter le script `reviews.js` dans `index.html`**

Trouver la ligne `<script src="auth.js"></script>` (ligne 632) et ajouter juste après :

```html
    <script src="auth.js"></script>
    <script src="reviews.js"></script>
```

- [ ] **Step 3: Ajouter le cas `'review'` dans `_afterAuthSuccess()` (`auth.js:516-531`)**

Remplacer :

```js
    function _afterAuthSuccess() {
        closeModal();
        if (_pendingAction === 'checkout' && typeof Cart !== 'undefined') {
            Cart.openPanel();
            return;
        }
```

par :

```js
    function _afterAuthSuccess() {
        closeModal();
        if (_pendingAction === 'checkout' && typeof Cart !== 'undefined') {
            Cart.openPanel();
            return;
        }
        if (_pendingAction === 'review' && typeof Reviews !== 'undefined') {
            Reviews.openModal();
            return;
        }
```

- [ ] **Step 4: Vérifier la syntaxe**

Run: `cd "C:\Users\jeane\Desktop\Amboul\mediafrica-landing" && node --check auth.js && node --check reviews.js`
Expected: aucune sortie.

- [ ] **Step 5: Commit**

```bash
cd "C:\Users\jeane\Desktop\Amboul\mediafrica-landing"
git add index.html auth.js
git commit -m "feat(reviews): cablage bouton/page d'accueil + redirection post-connexion"
```

---

### Task 5: Vérification end-to-end dans le navigateur de prévisualisation

**Files:** aucun fichier modifié — vérification uniquement.

- [ ] **Step 1: Démarrer le serveur de prévisualisation**

Utiliser `mcp__Claude_Preview__preview_start` avec `name: "mediafrica"` (config existante dans `.claude/launch.json`). Noter le `serverId` retourné pour les étapes suivantes.

- [ ] **Step 2: Naviguer vers la page d'accueil et vérifier l'état initial (non connecté)**

Appeler `mcp__Claude_Preview__preview_eval` avec :
```js
window.location.href = '/index.html'; 'navigating'
```
Puis, après un court délai, appeler à nouveau `preview_eval` avec :
```js
(function(){
  const btn = document.getElementById('leaveReviewBtn');
  return JSON.stringify({ btnText: btn?.textContent.trim(), summaryVisible: getComputedStyle(document.getElementById('reviewsSummary')).display !== 'none' });
})()
```
Expected: `btnText` contient `"Laisser un avis"`, `summaryVisible` est `false` (aucun avis dynamique au départ).

- [ ] **Step 3: Vérifier qu'aucune erreur console n'apparaît**

Appeler `mcp__Claude_Preview__preview_console_logs`.
Expected: aucune ligne `[error]` liée à `reviews.js` (le message info habituel "Firebase non configuré" est normal).

- [ ] **Step 4: Cliquer sur "Laisser un avis" sans être connecté → le modal de connexion s'ouvre**

```js
document.getElementById('leaveReviewBtn').click(); 'clicked'
```
Puis vérifier :
```js
document.getElementById('authModal')?.classList.contains('open')
```
Expected: `true`.

- [ ] **Step 5: Créer un compte local de test via le formulaire d'inscription**

```js
document.querySelector('.auth-tab[data-tab="register"]').click(); 'tab-switched'
```
Puis utiliser `mcp__Claude_Preview__preview_fill` pour remplir `#regName` = `Test Avis`, `#regUsername` = `test_avis`, `#regEmail` = `test-avis@example.com`, `#regPassword` = `test1234`.
Puis :
```js
document.getElementById('registerForm').requestSubmit(); 'submitted'
```
Expected (via `preview_eval` ensuite) : `Auth.currentUser()` retourne un objet avec `email: "test-avis@example.com"`.

- [ ] **Step 6: Vérifier que le modal d'avis s'est ouvert automatiquement après connexion**

```js
document.getElementById('reviewModal')?.classList.contains('open')
```
Expected: `true` (grâce au `_pendingAction === 'review'` câblé dans Task 4).

- [ ] **Step 7: Sélectionner une note et soumettre un avis**

```js
document.querySelector('#reviewStars .review-star[data-value="5"]').click(); 'rated'
```
Puis utiliser `preview_fill` pour écrire `Excellent service, je recommande !` dans `#reviewComment`.
Puis :
```js
document.getElementById('reviewSubmitBtn').click(); 'submitted-review'
```

- [ ] **Step 8: Vérifier que l'avis apparaît dans la grille et que la moyenne s'affiche**

```js
(function(){
  const cards = document.querySelectorAll('.testi-card--dynamic');
  const summary = document.getElementById('reviewsSummary');
  return JSON.stringify({ count: cards.length, lastComment: cards[0]?.querySelector('p')?.textContent, summary: summary.textContent.trim(), summaryVisible: getComputedStyle(summary).display !== 'none' });
})()
```
Expected: `count: 1`, `lastComment` contient `"Excellent service, je recommande !"`, `summary` contient `"5.0"` et `"1 avis"`, `summaryVisible: true`.

- [ ] **Step 9: Vérifier que le bouton affiche "Modifier mon avis" après soumission**

```js
document.getElementById('leaveReviewBtn').textContent.trim()
```
Expected: contient `"Modifier mon avis"`.

- [ ] **Step 10: Vérifier la persistance après rechargement de page**

```js
window.location.reload(); 'reloading'
```
Puis, après un court délai, ré-exécuter la vérification de l'étape 8.
Expected: même résultat (`count: 1`, mêmes données) — confirme que `localStorage` (`ssc_reviews`) a bien persisté l'avis.

- [ ] **Step 11: Nettoyer les données de test**

```js
localStorage.removeItem('ssc_reviews');
localStorage.removeItem('ssc_users');
localStorage.removeItem('ssc_session');
'cleaned'
```

- [ ] **Step 12: Commit final si des ajustements ont été faits pendant la vérification**

```bash
cd "C:\Users\jeane\Desktop\Amboul\mediafrica-landing"
git status --short
```
Si des fichiers ont été modifiés pour corriger un problème découvert pendant la vérification, les committer avec un message décrivant le correctif. Sinon, ne rien committer (Task 5 est une vérification, pas une modification).

---

## Self-Review (effectué par l'auteur du plan)

**Couverture du spec :**
- Bouton conditionnel selon l'état de connexion → Task 3 (`_wireEvents`) + Task 4 (`_afterAuthSuccess`). ✅
- Un avis par compte (création ou mise à jour) → Task 1 (`submit`, clé `_userId`). ✅
- Étoiles 1-5 + commentaire → Task 3 (modal). ✅
- Stockage Firestore/localStorage dual-mode → Task 1. ✅
- Témoignages statiques conservés, avis dynamiques ajoutés à la suite → Task 2 (`_renderGrid` n'ajoute que `.testi-card--dynamic`, ne touche jamais aux 5 cartes statiques). ✅
- Tri du plus récent au plus ancien → Task 1 (`_sortDesc`, `orderBy('createdAt', 'desc')`). ✅
- Note moyenne affichée si ≥ 1 avis dynamique → Task 2 (`_renderSummary`). ✅
- Publication immédiate, pas de modération → aucune étape de validation ajoutée nulle part. ✅
- Repli silencieux sur erreur Firestore → Task 1 (`try/catch` dans `submit`/`getAll`). ✅

**Cohérence des types/signatures :** `Reviews.submit(rating, comment)`, `Reviews.getAll()`, `Reviews.getMine()`, `Reviews.openModal()`, `Reviews.init()` — noms identiques entre la définition (Tasks 1-3) et les usages (Task 4, `auth.js`). Le champ `id`/`userId` est cohérent partout (toujours dérivé de `_userId(user)`).

**Hors scope confirmé non traité :** modération admin, réponse du commerçant, avis avec photo, avis par produit — aucune trace dans le plan, conforme au spec.
