# MediAfrica — Panier, Comptes & Paiement PayPal — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter un panier localStorage, des comptes clients Firebase Auth et un redirect PayPal au checkout sur le site statique MediAfrica.

**Architecture:** Le panier vit dans localStorage (fonctionne sans login, persiste entre les pages). Firebase Auth gère les comptes via email/mot de passe. Au checkout : tous les produits ont un prix → redirect PayPal ; sinon → redirect WhatsApp avec le détail du panier. Les commandes sont sauvegardées dans Firestore. Tout Firebase + PayPal est configuré dans un seul `config.js`. Cart.js et Auth.js s'injectent eux-mêmes dans le DOM (panel, modal, icônes navbar), donc il suffit d'ajouter les balises `<script>` à chaque page.

**Tech Stack:** Vanilla JS (ES6 IIFEs), Firebase JS SDK v9 compat (CDN), Firestore, PayPal.me

---

## Carte des fichiers

| Fichier | Action | Responsabilité |
|---|---|---|
| `config.js` | Créer | Handle PayPal, clés Firebase, prix produits |
| `cart.js` | Créer | CRUD panier (localStorage), rendu panneau, logique checkout |
| `auth.js` | Créer | Firebase Auth, modal login/inscription, état navbar |
| `cart.css` | Créer | Styles : panneau panier, modal auth, icônes navbar, badge |
| `mon-compte.html` | Créer | Page profil + historique commandes |
| `index.html` | Modifier | SDK Firebase + scripts; boutons "Ajouter" sur cartes produits |
| `script.js` | Modifier | Appels `Cart.init()` + `Auth.init()` |
| `catalogue.html` | Modifier | SDK Firebase + scripts; boutons add-to-cart sur chaque carte |
| `catalogue.js` | Modifier | Handler add-to-cart, exclusion du modal |
| `aide.html` | Modifier | SDK Firebase + scripts |
| `livraison.html` | Modifier | SDK Firebase + scripts |
| `communaute.html` | Modifier | SDK Firebase + scripts |

---

## Task 1: config.js

**Files:**
- Create: `config.js`

- [ ] **Step 1.1: Créer config.js**

```js
const CONFIG = {
    paypal: {
        handle: 'TON_COMPTE_PAYPAL', // ex: 'mediafrica' → paypal.me/mediafrica
        currency: 'CAD'
    },
    firebase: {
        apiKey: '',
        authDomain: '',
        projectId: '',
        storageBucket: '',
        messagingSenderId: '',
        appId: ''
    },
    prices: {
        // Clé = nom EXACT du produit tel qu'affiché dans le catalogue (h3)
        // Exemple :
        // "Paracétamol 500mg": 12.99,
        // "Vitamine C 1000mg": 8.99,
        // "Hair Growth Formula": 24.99,
        // Produit absent ici → affiché "Sur devis" dans le panier
    }
};

// Initialise Firebase dès que les clés sont renseignées
if (typeof firebase !== 'undefined' && CONFIG.firebase.apiKey) {
    firebase.initializeApp(CONFIG.firebase);
}
```

- [ ] **Step 1.2: Commit**

```bash
git add config.js
git commit -m "feat: add config.js (PayPal, Firebase, prices)"
```

---

## Task 2: cart.css

**Files:**
- Create: `cart.css`

- [ ] **Step 2.1: Créer cart.css**

```css
/* ── Navbar : icônes panier + compte ── */
.nav-actions {
    display: flex;
    align-items: center;
    gap: .5rem;
    margin-left: auto;
    margin-right: 1rem;
}
.nav-cart-btn,
.nav-account-btn {
    background: none;
    border: none;
    cursor: pointer;
    position: relative;
    font-size: 1.25rem;
    color: var(--text);
    padding: .4rem;
    border-radius: 50%;
    transition: background .2s;
    display: flex;
    align-items: center;
    justify-content: center;
}
.nav-cart-btn:hover,
.nav-account-btn:hover { background: var(--ivory); }

.cart-badge {
    position: absolute;
    top: -4px; right: -4px;
    background: #ef4444;
    color: #fff;
    font-size: .65rem;
    font-weight: 700;
    min-width: 18px; height: 18px;
    border-radius: 999px;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
}

/* ── Account dropdown ── */
.nav-account { position: relative; }
.account-dropdown {
    position: absolute;
    right: 0; top: calc(100% + .5rem);
    background: #fff;
    border: 1px solid var(--border);
    border-radius: 12px;
    box-shadow: var(--shadow);
    min-width: 200px;
    padding: .5rem 0;
    z-index: 1000;
    display: none;
    flex-direction: column;
}
.account-dropdown.open { display: flex; }
.account-dropdown a,
.account-dropdown button {
    background: none;
    border: none;
    text-align: left;
    padding: .75rem 1.25rem;
    font-family: var(--font-body);
    font-size: .9rem;
    color: var(--text);
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: .6rem;
    text-decoration: none;
    transition: background .15s;
}
.account-dropdown a:hover,
.account-dropdown button:hover { background: var(--ivory); }
.account-greeting {
    padding: .75rem 1.25rem;
    font-size: .85rem;
    color: var(--muted);
    border-bottom: 1px solid var(--border);
}

/* ── Cart backdrop ── */
.cart-backdrop,
.auth-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,.45);
    z-index: 1100;
    opacity: 0;
    pointer-events: none;
    transition: opacity .3s;
}
.cart-backdrop.open,
.auth-backdrop.open {
    opacity: 1;
    pointer-events: all;
}

/* ── Cart panel ── */
.cart-panel {
    position: fixed;
    top: 0; right: 0;
    width: min(420px, 100vw);
    height: 100vh;
    background: #fff;
    z-index: 1200;
    display: flex;
    flex-direction: column;
    box-shadow: -4px 0 30px rgba(0,0,0,.12);
    transform: translateX(100%);
    transition: transform .35s cubic-bezier(.4,0,.2,1);
}
.cart-panel.open { transform: translateX(0); }

.cart-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.5rem 1.5rem 1rem;
    border-bottom: 1px solid var(--border);
}
.cart-header h3 { font-size: 1.4rem; margin: 0; }
.cart-close {
    background: none; border: none; cursor: pointer;
    font-size: 1.2rem; color: var(--muted);
    padding: .4rem; border-radius: 50%;
    transition: background .2s;
}
.cart-close:hover { background: var(--ivory); color: var(--text); }

.cart-items {
    flex: 1;
    overflow-y: auto;
    padding: 1rem 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.cart-item {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--border);
}
.cart-item:last-child { border-bottom: none; }
.cart-item-info { flex: 1; min-width: 0; }
.cart-item-tag {
    display: inline-block;
    font-size: .7rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: .05em;
    color: var(--green);
    background: var(--green-pale);
    padding: 2px 8px;
    border-radius: 999px;
    margin-bottom: .35rem;
}
.cart-item-name {
    display: block;
    font-size: .95rem;
    font-weight: 600;
    margin-bottom: .2rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.cart-item-unit {
    font-size: .8rem;
    color: var(--muted);
}
.cart-item-controls {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: .4rem;
}
.cart-qty {
    display: flex;
    align-items: center;
    gap: .4rem;
    border: 1px solid var(--border);
    border-radius: 999px;
    padding: 2px 6px;
}
.cart-qty span { font-size: .9rem; min-width: 1.5rem; text-align: center; }
.qty-minus, .qty-plus {
    background: none; border: none; cursor: pointer;
    font-size: 1rem; color: var(--text);
    padding: 0 4px; line-height: 1;
}
.cart-line-total {
    font-size: .85rem;
    font-weight: 600;
    color: var(--green);
}
.cart-remove {
    background: none; border: none; cursor: pointer;
    color: var(--muted); font-size: .8rem;
    padding: 2px 4px; border-radius: 4px;
    transition: color .2s;
}
.cart-remove:hover { color: #ef4444; }

/* Cart footer */
.cart-footer {
    padding: 1.25rem 1.5rem;
    border-top: 1px solid var(--border);
    background: #fff;
}
.cart-total {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    font-size: 1.05rem;
}
.cart-total strong { font-size: 1.2rem; color: var(--green); }
.btn-checkout {
    width: 100%;
    padding: .9rem;
    background: var(--green);
    color: #fff;
    border: none;
    border-radius: 999px;
    font-family: var(--font-body);
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: .5rem;
    transition: opacity .2s;
}
.btn-checkout:hover { opacity: .9; }

/* Cart empty state */
.cart-empty {
    flex: 1;
    display: none;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    color: var(--muted);
    padding: 2rem;
}
.cart-empty i { font-size: 3rem; opacity: .3; }
.cart-empty p { font-size: 1rem; }

/* ── Auth modal ── */
.auth-modal {
    position: fixed;
    top: 50%; left: 50%;
    transform: translate(-50%, -50%) scale(.95);
    background: #fff;
    border-radius: 20px;
    box-shadow: var(--shadow-lg);
    z-index: 1300;
    width: min(440px, 95vw);
    padding: 2rem;
    opacity: 0;
    pointer-events: none;
    transition: opacity .25s, transform .25s;
}
.auth-modal.open {
    opacity: 1;
    pointer-events: all;
    transform: translate(-50%, -50%) scale(1);
}
.auth-close {
    position: absolute;
    top: 1rem; right: 1rem;
    background: none; border: none; cursor: pointer;
    font-size: 1.1rem; color: var(--muted);
    padding: .35rem; border-radius: 50%;
    transition: background .2s;
}
.auth-close:hover { background: var(--ivory); }

.auth-tabs {
    display: flex;
    gap: .5rem;
    margin-bottom: 1.5rem;
    background: var(--ivory);
    padding: 4px;
    border-radius: 999px;
}
.auth-tab {
    flex: 1;
    background: none;
    border: none;
    padding: .6rem 1rem;
    border-radius: 999px;
    font-family: var(--font-body);
    font-size: .9rem;
    font-weight: 500;
    cursor: pointer;
    color: var(--muted);
    transition: all .2s;
}
.auth-tab.active {
    background: #fff;
    color: var(--text);
    font-weight: 600;
    box-shadow: 0 1px 6px rgba(0,0,0,.08);
}

.auth-form { display: flex; flex-direction: column; gap: 1rem; }
.auth-form--hidden { display: none; }
.auth-group { display: flex; flex-direction: column; gap: .35rem; }
.auth-group label { font-size: .85rem; font-weight: 600; }
.auth-group input {
    padding: .75rem 1rem;
    border: 1px solid var(--border);
    border-radius: 10px;
    font-family: var(--font-body);
    font-size: .95rem;
    transition: border-color .2s;
}
.auth-group input:focus {
    outline: none;
    border-color: var(--green);
}
.auth-error {
    font-size: .85rem;
    color: #ef4444;
    min-height: 1.2em;
}
.btn-auth {
    padding: .85rem;
    background: var(--green);
    color: #fff;
    border: none;
    border-radius: 999px;
    font-family: var(--font-body);
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: opacity .2s;
}
.btn-auth:hover { opacity: .9; }

/* ── Page Mon Compte ── */
.account-page {
    max-width: 800px;
    margin: 120px auto 80px;
    padding: 0 1.5rem;
}
.account-page h1 { font-size: 2.5rem; margin-bottom: .5rem; }
.account-section {
    background: #fff;
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 2rem;
    margin-top: 2rem;
}
.account-section h2 { font-size: 1.4rem; margin-bottom: 1.5rem; color: var(--green); }
.profile-row {
    display: flex;
    gap: 1rem;
    align-items: center;
    flex-wrap: wrap;
}
.profile-avatar {
    width: 60px; height: 60px;
    background: var(--green);
    color: #fff;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 1.5rem; font-weight: 700;
    flex-shrink: 0;
}
.profile-info strong { display: block; font-size: 1.1rem; }
.profile-info span { color: var(--muted); font-size: .9rem; }
.btn-logout {
    margin-left: auto;
    background: none;
    border: 1px solid var(--border);
    padding: .5rem 1.2rem;
    border-radius: 999px;
    font-family: var(--font-body);
    font-size: .9rem;
    cursor: pointer;
    color: var(--muted);
    transition: all .2s;
    display: flex; align-items: center; gap: .5rem;
}
.btn-logout:hover { border-color: #ef4444; color: #ef4444; }

.order-card {
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 1.25rem;
    margin-bottom: 1rem;
}
.order-card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: .75rem;
}
.order-date { font-size: .85rem; color: var(--muted); }
.order-status {
    font-size: .75rem;
    font-weight: 700;
    padding: 3px 10px;
    border-radius: 999px;
    text-transform: uppercase;
    letter-spacing: .04em;
}
.status-sent    { background: #fef3c7; color: #92400e; }
.status-processing { background: #dbeafe; color: #1e3a8a; }
.status-delivered  { background: #dcfce7; color: #166534; }
.order-items { list-style: none; margin: 0 0 .75rem; padding: 0; }
.order-items li { font-size: .9rem; color: var(--muted); padding: .2rem 0; }
.order-items li::before { content: "• "; }
.order-total { font-weight: 700; font-size: .95rem; }
.order-method { font-size: .8rem; color: var(--muted); margin-top: .25rem; }
.orders-empty { text-align: center; color: var(--muted); padding: 2rem 0; }

/* ── Add-to-cart button (catalogue + index) ── */
.add-to-cart-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: .4rem;
    width: 100%;
    padding: .65rem;
    background: var(--green);
    color: #fff;
    border: none;
    border-radius: 999px;
    font-family: var(--font-body);
    font-size: .85rem;
    font-weight: 600;
    cursor: pointer;
    transition: opacity .2s;
    margin-top: .5rem;
}
.add-to-cart-btn:hover { opacity: .85; }
.add-to-cart-btn:disabled { opacity: .6; cursor: default; }
```

- [ ] **Step 2.2: Commit**

```bash
git add cart.css
git commit -m "feat: add cart.css (panel, auth modal, navbar icons)"
```

---

## Task 3: cart.js

**Files:**
- Create: `cart.js`

- [ ] **Step 3.1: Créer cart.js**

```js
const Cart = (() => {
    const KEY = 'mediafrica_cart';

    /* ── Storage ── */
    function getItems() {
        try { return JSON.parse(localStorage.getItem(KEY)) || []; }
        catch { return []; }
    }
    function _save(items) {
        localStorage.setItem(KEY, JSON.stringify(items));
        _updateBadge();
    }

    /* ── Public API ── */
    function add(product) {
        const items = getItems();
        const existing = items.find(i => i.id === product.id);
        if (existing) { existing.quantity += 1; }
        else { items.push({ ...product, quantity: 1 }); }
        _save(items);
        _renderItems();
        _flash();
    }
    function remove(id) {
        _save(getItems().filter(i => i.id !== id));
        _renderItems();
    }
    function update(id, qty) {
        if (qty <= 0) { remove(id); return; }
        const items = getItems();
        const item = items.find(i => i.id === id);
        if (item) item.quantity = qty;
        _save(items);
        _renderItems();
    }
    function clear() { _save([]); _renderItems(); }
    function getCount() { return getItems().reduce((s, i) => s + i.quantity, 0); }
    function getTotal() {
        const items = getItems();
        if (items.some(i => i.unitPrice === null || i.unitPrice === undefined)) return null;
        return items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
    }

    /* ── Badge ── */
    function _updateBadge() {
        document.querySelectorAll('.cart-badge').forEach(b => {
            const c = getCount();
            b.textContent = c;
            b.style.display = c > 0 ? 'flex' : 'none';
        });
    }

    /* ── Visual feedback on add ── */
    function _flash() {
        const btn = document.querySelector('#cartToggle');
        if (!btn) return;
        btn.style.transform = 'scale(1.3)';
        setTimeout(() => btn.style.transform = '', 200);
    }

    /* ── Render cart items ── */
    function _renderItems() {
        const itemsEl  = document.getElementById('cartItems');
        const emptyEl  = document.getElementById('cartEmpty');
        const footerEl = document.getElementById('cartFooter');
        const totalEl  = document.getElementById('cartTotal');
        if (!itemsEl) return;

        const items = getItems();
        if (items.length === 0) {
            itemsEl.innerHTML = '';
            if (emptyEl)  emptyEl.style.display  = 'flex';
            if (footerEl) footerEl.style.display = 'none';
            return;
        }
        if (emptyEl)  emptyEl.style.display  = 'none';
        if (footerEl) footerEl.style.display = 'block';

        itemsEl.innerHTML = items.map(item => {
            const hasPrice = item.unitPrice !== null && item.unitPrice !== undefined;
            const lineTotal = hasPrice ? (item.unitPrice * item.quantity).toFixed(2) + ' CAD' : 'Sur devis';
            const unitLabel = hasPrice ? item.unitPrice.toFixed(2) + ' CAD / unité' : 'Prix sur demande';
            return `
            <div class="cart-item" data-id="${item.id}">
                <div class="cart-item-info">
                    <span class="cart-item-tag">${item.category}</span>
                    <strong class="cart-item-name">${item.name}</strong>
                    <span class="cart-item-unit">${unitLabel}</span>
                </div>
                <div class="cart-item-controls">
                    <div class="cart-qty">
                        <button type="button" class="qty-minus" data-id="${item.id}">−</button>
                        <span>${item.quantity}</span>
                        <button type="button" class="qty-plus" data-id="${item.id}">+</button>
                    </div>
                    <span class="cart-line-total">${lineTotal}</span>
                    <button type="button" class="cart-remove" data-id="${item.id}" aria-label="Supprimer">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
            </div>`;
        }).join('');

        itemsEl.querySelectorAll('.qty-minus').forEach(btn =>
            btn.addEventListener('click', () => {
                const item = getItems().find(i => i.id === btn.dataset.id);
                if (item) update(item.id, item.quantity - 1);
            })
        );
        itemsEl.querySelectorAll('.qty-plus').forEach(btn =>
            btn.addEventListener('click', () => {
                const item = getItems().find(i => i.id === btn.dataset.id);
                if (item) update(item.id, item.quantity + 1);
            })
        );
        itemsEl.querySelectorAll('.cart-remove').forEach(btn =>
            btn.addEventListener('click', () => remove(btn.dataset.id))
        );

        const total = getTotal();
        if (totalEl) totalEl.textContent = total !== null ? total.toFixed(2) + ' CAD' : 'Sur devis';
    }

    /* ── Panel open/close ── */
    function openPanel() {
        _renderItems();
        document.getElementById('cartPanel')?.classList.add('open');
        document.getElementById('cartBackdrop')?.classList.add('open');
        document.body.style.overflow = 'hidden';
    }
    function closePanel() {
        document.getElementById('cartPanel')?.classList.remove('open');
        document.getElementById('cartBackdrop')?.classList.remove('open');
        document.body.style.overflow = '';
    }

    /* ── Checkout ── */
    function _processCheckout() {
        const items = getItems();
        if (items.length === 0) return;

        const user   = typeof Auth !== 'undefined' ? Auth.currentUser() : null;
        const total  = getTotal();
        const handle = typeof CONFIG !== 'undefined' ? CONFIG.paypal.handle : '';

        // Save to Firestore
        if (user && typeof firebase !== 'undefined' && firebase.apps.length) {
            firebase.firestore().collection('orders').add({
                userId:        user.uid,
                userEmail:     user.email,
                items: items.map(i => ({
                    name:      i.name,
                    category:  i.category,
                    qty:       i.quantity,
                    unitPrice: i.unitPrice ?? null,
                    lineTotal: i.unitPrice != null ? i.unitPrice * i.quantity : null
                })),
                total:         total,
                currency:      'CAD',
                paymentMethod: (total !== null && handle && handle !== 'TON_COMPTE_PAYPAL') ? 'paypal' : 'whatsapp',
                status:        'sent',
                createdAt:     firebase.firestore.FieldValue.serverTimestamp()
            });
        }

        clear();
        closePanel();

        if (total !== null && handle && handle !== 'TON_COMPTE_PAYPAL') {
            const currency = (typeof CONFIG !== 'undefined') ? CONFIG.paypal.currency : 'CAD';
            window.open(`https://www.paypal.com/paypalme/${handle}/${total.toFixed(2)}${currency}`, '_blank');
        } else {
            const userName = user ? (user.displayName || user.email) : 'Client';
            const lines = items.map(i => {
                const p = i.unitPrice != null ? (i.unitPrice * i.quantity).toFixed(2) + ' CAD' : 'Sur devis';
                return `• ${i.name} × ${i.quantity} — ${p}`;
            }).join('\n');
            const totalLine = total !== null ? `\n💰 *Total : ${total.toFixed(2)} CAD*` : '\n💰 *Total : Sur devis*';
            const msg = `🛒 *Nouvelle commande MediAfrica*\n\n${lines}${totalLine}\n\n👤 *Client :* ${userName}`;
            window.open(`https://wa.me/14384029247?text=${encodeURIComponent(msg)}`, '_blank');
        }
    }

    /* ── DOM injection ── */
    function _injectHTML() {
        // Cart panel
        if (!document.getElementById('cartPanel')) {
            document.body.insertAdjacentHTML('beforeend', `
            <div class="cart-backdrop" id="cartBackdrop"></div>
            <aside class="cart-panel" id="cartPanel" aria-label="Panier">
                <div class="cart-header">
                    <h3><i class="fa-solid fa-cart-shopping"></i> Mon Panier</h3>
                    <button type="button" class="cart-close" id="cartClose" aria-label="Fermer">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>
                <div class="cart-items" id="cartItems"></div>
                <div class="cart-empty" id="cartEmpty" style="display:none">
                    <i class="fa-solid fa-cart-shopping"></i>
                    <p>Votre panier est vide</p>
                </div>
                <div class="cart-footer" id="cartFooter" style="display:none">
                    <div class="cart-total">
                        <span>Total</span>
                        <strong id="cartTotal">—</strong>
                    </div>
                    <button type="button" class="btn-checkout" id="btnCheckout">
                        <i class="fa-solid fa-lock"></i> Passer au paiement
                    </button>
                </div>
            </aside>`);
        }

        // Nav icons (before .hamburger or at end of nav-inner)
        if (!document.getElementById('cartToggle')) {
            const navInner   = document.querySelector('.nav-inner');
            const hamburger  = navInner?.querySelector('.hamburger');
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'nav-actions';
            actionsDiv.innerHTML = `
                <button type="button" class="nav-cart-btn" id="cartToggle" aria-label="Panier">
                    <i class="fa-solid fa-cart-shopping"></i>
                    <span class="cart-badge" id="cartBadge" style="display:none">0</span>
                </button>`;
            if (navInner) {
                if (hamburger) navInner.insertBefore(actionsDiv, hamburger);
                else navInner.appendChild(actionsDiv);
            }
        }
    }

    /* ── Init ── */
    function init() {
        _injectHTML();
        _updateBadge();
        _renderItems();

        document.getElementById('cartToggle')  ?.addEventListener('click', openPanel);
        document.getElementById('cartClose')   ?.addEventListener('click', closePanel);
        document.getElementById('cartBackdrop')?.addEventListener('click', closePanel);
        document.addEventListener('keydown', e => { if (e.key === 'Escape') closePanel(); });

        document.getElementById('btnCheckout')?.addEventListener('click', () => {
            if (typeof Auth !== 'undefined' && !Auth.currentUser()) {
                closePanel();
                Auth.openModal('checkout');
            } else {
                _processCheckout();
            }
        });
    }

    return { init, add, remove, update, clear, getItems, getTotal, getCount, openPanel, closePanel };
})();
```

- [ ] **Step 3.2: Commit**

```bash
git add cart.js
git commit -m "feat: add cart.js (localStorage cart, panel, checkout)"
```

---

## Task 4: auth.js

**Files:**
- Create: `auth.js`

- [ ] **Step 4.1: Créer auth.js**

```js
const Auth = (() => {
    let _user          = null;
    let _pendingAction = null; // 'checkout' ou null

    /* ── Erreurs Firebase → FR ── */
    function _err(code) {
        return ({
            'auth/user-not-found':     'Aucun compte avec cet email.',
            'auth/wrong-password':     'Mot de passe incorrect.',
            'auth/invalid-credential': 'Email ou mot de passe incorrect.',
            'auth/email-already-in-use': 'Cet email est déjà utilisé.',
            'auth/weak-password':      'Mot de passe trop court (minimum 6 caractères).',
            'auth/invalid-email':      'Adresse email invalide.',
            'auth/too-many-requests':  'Trop de tentatives. Réessayez dans quelques minutes.',
        })[code] || 'Une erreur est survenue. Réessayez.';
    }

    /* ── Navbar state ── */
    function _updateNavbar(user) {
        const wrap = document.getElementById('navAccountWrap');
        if (!wrap) return;
        const dropdown = wrap.querySelector('.account-dropdown');
        if (!dropdown) return;

        if (user) {
            const name = user.displayName || user.email.split('@')[0];
            dropdown.innerHTML = `
                <span class="account-greeting">Bonjour, <strong>${name}</strong></span>
                <a href="mon-compte.html"><i class="fa-solid fa-user"></i> Mon Compte</a>
                <button type="button" data-action="logout">
                    <i class="fa-solid fa-right-from-bracket"></i> Se déconnecter
                </button>`;
        } else {
            dropdown.innerHTML = '';
        }
    }

    /* ── Modal helpers ── */
    function openModal(action) {
        _pendingAction = action || null;
        document.getElementById('authModal')   ?.classList.add('open');
        document.getElementById('authBackdrop')?.classList.add('open');
        document.body.style.overflow = 'hidden';
    }
    function closeModal() {
        document.getElementById('authModal')   ?.classList.remove('open');
        document.getElementById('authBackdrop')?.classList.remove('open');
        document.body.style.overflow = '';
        ['loginError', 'registerError'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = '';
        });
    }
    function _switchTab(tab) {
        document.querySelectorAll('.auth-tab').forEach(t =>
            t.classList.toggle('active', t.dataset.tab === tab)
        );
        const lf = document.getElementById('loginForm');
        const rf = document.getElementById('registerForm');
        if (lf) lf.classList.toggle('auth-form--hidden', tab !== 'login');
        if (rf) rf.classList.toggle('auth-form--hidden', tab !== 'register');
    }

    /* ── DOM injection ── */
    function _injectHTML() {
        // Auth modal
        if (!document.getElementById('authModal')) {
            document.body.insertAdjacentHTML('beforeend', `
            <div class="auth-backdrop" id="authBackdrop"></div>
            <div class="auth-modal" id="authModal" role="dialog" aria-modal="true">
                <button type="button" class="auth-close" id="authClose" aria-label="Fermer">
                    <i class="fa-solid fa-xmark"></i>
                </button>
                <div class="auth-tabs">
                    <button type="button" class="auth-tab active" data-tab="login">Se connecter</button>
                    <button type="button" class="auth-tab" data-tab="register">Créer un compte</button>
                </div>
                <form class="auth-form" id="loginForm">
                    <div class="auth-group">
                        <label for="loginEmail">Email</label>
                        <input type="email" id="loginEmail" required placeholder="votre@email.com" autocomplete="email">
                    </div>
                    <div class="auth-group">
                        <label for="loginPassword">Mot de passe</label>
                        <input type="password" id="loginPassword" required placeholder="••••••••" autocomplete="current-password">
                    </div>
                    <p class="auth-error" id="loginError"></p>
                    <button type="submit" class="btn-auth">Se connecter</button>
                </form>
                <form class="auth-form auth-form--hidden" id="registerForm">
                    <div class="auth-group">
                        <label for="regName">Nom complet</label>
                        <input type="text" id="regName" required placeholder="Jean Dupont" autocomplete="name">
                    </div>
                    <div class="auth-group">
                        <label for="regEmail">Email</label>
                        <input type="email" id="regEmail" required placeholder="votre@email.com" autocomplete="email">
                    </div>
                    <div class="auth-group">
                        <label for="regPassword">Mot de passe</label>
                        <input type="password" id="regPassword" required placeholder="Minimum 6 caractères"
                               minlength="6" autocomplete="new-password">
                    </div>
                    <p class="auth-error" id="registerError"></p>
                    <button type="submit" class="btn-auth">Créer mon compte</button>
                </form>
            </div>`);
        }

        // Account icon in nav (appended to .nav-actions injected by cart.js)
        if (!document.getElementById('accountToggle')) {
            const navActions = document.querySelector('.nav-actions');
            if (navActions) {
                navActions.insertAdjacentHTML('beforeend', `
                <div class="nav-account" id="navAccountWrap">
                    <button type="button" class="nav-account-btn" id="accountToggle" aria-label="Mon compte">
                        <i class="fa-solid fa-circle-user"></i>
                    </button>
                    <div class="account-dropdown" id="accountDropdown"></div>
                </div>`);
            }
        }
    }

    /* ── Init ── */
    function init() {
        if (typeof firebase === 'undefined' || !firebase.apps.length) return;

        _injectHTML();

        firebase.auth().onAuthStateChanged(user => {
            _user = user;
            _updateNavbar(user);
            if (user && _pendingAction === 'checkout') {
                _pendingAction = null;
                closeModal();
                if (typeof Cart !== 'undefined') Cart.openPanel();
            }
        });

        // Account icon toggle
        document.getElementById('accountToggle')?.addEventListener('click', e => {
            e.stopPropagation();
            if (!_user) { openModal(); return; }
            document.getElementById('accountDropdown')?.classList.toggle('open');
        });
        document.addEventListener('click', e => {
            if (!e.target.closest('#navAccountWrap'))
                document.getElementById('accountDropdown')?.classList.remove('open');
        });

        // Modal close
        document.getElementById('authClose')   ?.addEventListener('click', closeModal);
        document.getElementById('authBackdrop')?.addEventListener('click', closeModal);
        document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

        // Tabs
        document.querySelectorAll('.auth-tab').forEach(tab =>
            tab.addEventListener('click', () => _switchTab(tab.dataset.tab))
        );

        // Login
        document.getElementById('loginForm')?.addEventListener('submit', e => {
            e.preventDefault();
            const email    = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            firebase.auth().signInWithEmailAndPassword(email, password)
                .catch(err => {
                    document.getElementById('loginError').textContent = _err(err.code);
                });
        });

        // Register
        document.getElementById('registerForm')?.addEventListener('submit', e => {
            e.preventDefault();
            const name     = document.getElementById('regName').value.trim();
            const email    = document.getElementById('regEmail').value;
            const password = document.getElementById('regPassword').value;
            firebase.auth().createUserWithEmailAndPassword(email, password)
                .then(cred => cred.user.updateProfile({ displayName: name }))
                .catch(err => {
                    document.getElementById('registerError').textContent = _err(err.code);
                });
        });

        // Logout (event delegation on dropdown)
        document.addEventListener('click', e => {
            if (e.target.closest('[data-action="logout"]')) firebase.auth().signOut();
        });
    }

    function currentUser() { return _user; }

    return { init, openModal, closeModal, currentUser };
})();
```

- [ ] **Step 4.2: Commit**

```bash
git add auth.js
git commit -m "feat: add auth.js (Firebase Auth, login/register modal)"
```

---

## Task 5: Mettre à jour index.html

**Files:**
- Modify: `index.html`

- [ ] **Step 5.1: Ajouter Firebase SDK + scripts dans `<head>` de index.html**

Ajouter juste avant `<link rel="stylesheet" href="style.css">` :

```html
    <link rel="stylesheet" href="cart.css">
```

- [ ] **Step 5.2: Ajouter Firebase SDK + scripts avant `<script src="script.js">` en bas de index.html**

Remplacer :
```html
    <script src="script.js"></script>
```
Par :
```html
    <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js"></script>
    <script src="config.js"></script>
    <script src="cart.js"></script>
    <script src="auth.js"></script>
    <script src="script.js"></script>
```

- [ ] **Step 5.3: Remplacer les boutons "Commander" des cartes produits dans la section `#produits`**

Pour chaque `.produit-card`, remplacer le `<a href="#commander" class="produit-btn">Commander</a>` par un bouton add-to-cart. Les 6 cartes ont les noms et catégories suivants — remplacer exactement :

Carte 1 (Paracétamol) :
```html
<button type="button" class="add-to-cart-btn"
        data-name="Paracétamol & Ibuprofène"
        data-category="Antidouleur">
    <i class="fa-solid fa-cart-plus"></i> Ajouter au panier
</button>
```
Carte 2 (Antipaludéens) :
```html
<button type="button" class="add-to-cart-btn"
        data-name="Antipaludéens"
        data-category="Antipaludéen">
    <i class="fa-solid fa-cart-plus"></i> Ajouter au panier
</button>
```
Carte 3 (Antidiarrhéiques) :
```html
<button type="button" class="add-to-cart-btn"
        data-name="Antidiarrhéiques & Réhydratation"
        data-category="Digestif">
    <i class="fa-solid fa-cart-plus"></i> Ajouter au panier
</button>
```
Carte 4 (Antiseptiques) :
```html
<button type="button" class="add-to-cart-btn"
        data-name="Antiseptiques & Pansements"
        data-category="Antiseptique">
    <i class="fa-solid fa-cart-plus"></i> Ajouter au panier
</button>
```
Carte 5 (Vitamines) :
```html
<button type="button" class="add-to-cart-btn"
        data-name="Vitamines & Suppléments"
        data-category="Nutrition">
    <i class="fa-solid fa-cart-plus"></i> Ajouter au panier
</button>
```
Carte 6 (Antiallergiques) :
```html
<button type="button" class="add-to-cart-btn"
        data-name="Antiallergiques"
        data-category="Allergie">
    <i class="fa-solid fa-cart-plus"></i> Ajouter au panier
</button>
```

- [ ] **Step 5.4: Commit**

```bash
git add index.html
git commit -m "feat(index): add Firebase scripts, cart.css, add-to-cart buttons"
```

---

## Task 6: Mettre à jour script.js

**Files:**
- Modify: `script.js`

- [ ] **Step 6.1: Ajouter `Cart.init()` et `Auth.init()` au bas du DOMContentLoaded**

À la fin du bloc `document.addEventListener('DOMContentLoaded', () => { ... })`, juste avant le `});` de fermeture, ajouter :

```js
    // Init cart + auth
    if (typeof Cart !== 'undefined') Cart.init();
    if (typeof Auth !== 'undefined') Auth.init();

    // Add-to-cart on index.html product cards
    document.querySelectorAll('.add-to-cart-btn[data-name]').forEach(btn => {
        btn.addEventListener('click', () => {
            if (typeof Cart === 'undefined') return;
            const name      = btn.dataset.name;
            const category  = btn.dataset.category || '';
            const unitPrice = (typeof CONFIG !== 'undefined' && CONFIG.prices?.[name] != null)
                ? CONFIG.prices[name]
                : null;
            const id = name.toLowerCase()
                .normalize('NFD').replace(/[̀-ͯ]/g, '')
                .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
            Cart.add({ id, name, category, unitPrice });

            const orig = btn.innerHTML;
            btn.innerHTML = '<i class="fa-solid fa-check"></i> Ajouté !';
            btn.disabled = true;
            setTimeout(() => { btn.innerHTML = orig; btn.disabled = false; }, 1500);
        });
    });
```

- [ ] **Step 6.2: Vérification console**

Ouvrir index.html dans le navigateur. Ouvrir la console. Exécuter :
```js
Cart.add({ id: 'test', name: 'Test', category: 'Test', unitPrice: 9.99 });
console.log(Cart.getItems()); // doit retourner [{id:'test', ...}]
Cart.remove('test');
```
Attendu : aucune erreur, badge s'affiche puis disparaît.

- [ ] **Step 6.3: Commit**

```bash
git add script.js
git commit -m "feat(script): init Cart and Auth, add-to-cart handler"
```

---

## Task 7: Mettre à jour catalogue.html

**Files:**
- Modify: `catalogue.html`

- [ ] **Step 7.1: Ajouter cart.css dans `<head>` de catalogue.html**

Ajouter après `<link rel="stylesheet" href="catalogue.css">` :
```html
    <link rel="stylesheet" href="cart.css">
```

- [ ] **Step 7.2: Ajouter Firebase SDK + scripts avant `<script src="catalogue.js">` en bas de catalogue.html**

Remplacer :
```html
    <script src="catalogue.js"></script>
```
Par :
```html
    <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js"></script>
    <script src="config.js"></script>
    <script src="cart.js"></script>
    <script src="auth.js"></script>
    <script src="catalogue.js"></script>
```

- [ ] **Step 7.3: Ajouter le bouton "Ajouter au panier" sur chaque `.cat-card` dans catalogue.html**

Pour chaque bloc `<div class="cat-card" ...>`, ajouter juste avant le `<a href="index.html#commander" class="cat-btn">` existant (qu'on garde en fallback pour B2B) :

```html
<button type="button" class="add-to-cart-btn">
    <i class="fa-solid fa-cart-plus"></i> Ajouter au panier
</button>
```

Le bouton "Commander" B2B existant reste en dessous (renommer sa classe en `cat-btn-b2b` pour le distinguer, et changer son style à `background: transparent; color: var(--green); border: 1px solid var(--green);`).

Note : le texte visible de `cat-btn` actuel est `<i class="fa-solid fa-cart-shopping"></i> Commander`. Le remplacer par `<i class="fa-solid fa-file-alt"></i> Devis B2B` pour clarifier son rôle.

- [ ] **Step 7.4: Commit**

```bash
git add catalogue.html
git commit -m "feat(catalogue): add Firebase scripts, add-to-cart buttons"
```

---

## Task 8: Mettre à jour catalogue.js

**Files:**
- Modify: `catalogue.js`

- [ ] **Step 8.1: Ajouter la fonction slugify et le handler add-to-cart**

En haut de `catalogue.js`, après la ligne `document.addEventListener('DOMContentLoaded', () => {`, ajouter :

```js
    // Slugify for cart IDs
    function slugify(str) {
        return str.toLowerCase()
            .normalize('NFD').replace(/[̀-ͯ]/g, '')
            .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    }
```

- [ ] **Step 8.2: Ajouter `Cart.init()` et `Auth.init()`**

Après `filterCards();` (ligne d'init existante), ajouter :

```js
    if (typeof Cart !== 'undefined') Cart.init();
    if (typeof Auth !== 'undefined') Auth.init();
```

- [ ] **Step 8.3: Modifier le handler de clic sur les cartes pour exclure le nouveau bouton**

Localiser :
```js
    cards.forEach(card => {
        card.style.cursor = 'pointer';
        card.addEventListener('click', e => {
            if (e.target.closest('.cat-btn')) return;
            openModal(card);
        });
    });
```
Remplacer par :
```js
    cards.forEach(card => {
        card.style.cursor = 'pointer';
        card.addEventListener('click', e => {
            if (e.target.closest('.cat-btn') || e.target.closest('.add-to-cart-btn')) return;
            openModal(card);
        });
    });
```

- [ ] **Step 8.4: Ajouter le handler add-to-cart via event delegation sur le grid**

Après le bloc `cards.forEach(...)` (mais toujours dans DOMContentLoaded), ajouter :

```js
    // Add-to-cart handler (event delegation)
    grid.addEventListener('click', e => {
        const btn = e.target.closest('.add-to-cart-btn');
        if (!btn || typeof Cart === 'undefined') return;
        const card     = btn.closest('.cat-card');
        if (!card) return;
        const name     = card.querySelector('h3')?.textContent.trim() || '';
        const category = card.querySelector('.cat-tag')?.textContent.trim() || '';
        const id       = slugify(name);
        const unitPrice = (typeof CONFIG !== 'undefined' && CONFIG.prices?.[name] != null)
            ? CONFIG.prices[name]
            : null;
        Cart.add({ id, name, category, unitPrice });
        const orig = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-check"></i> Ajouté !';
        btn.disabled = true;
        setTimeout(() => { btn.innerHTML = orig; btn.disabled = false; }, 1500);
    });
```

- [ ] **Step 8.5: Vérification**

Ouvrir catalogue.html dans le navigateur. Cliquer "Ajouter au panier" sur un produit. Vérifier :
- Le badge de la navbar affiche "1"
- Ouvrir le panneau → le produit apparaît
- Cliquer + → quantité monte à 2
- Cliquer 🗑 → produit disparaît
- Le clic sur la carte (hors bouton) → le modal produit s'ouvre toujours

- [ ] **Step 8.6: Commit**

```bash
git add catalogue.js
git commit -m "feat(catalogue.js): add-to-cart handler, Auth+Cart init"
```

---

## Task 9: Mettre à jour les pages secondaires

**Files:**
- Modify: `aide.html`, `livraison.html`, `communaute.html`

- [ ] **Step 9.1: Ajouter cart.css dans le `<head>` des 3 pages**

Dans chacune des 3 pages, ajouter juste après `<link rel="stylesheet" href="style.css">` :
```html
    <link rel="stylesheet" href="cart.css">
```

- [ ] **Step 9.2: Ajouter Firebase SDK + scripts dans les 3 pages**

Dans chacune des 3 pages, remplacer `<script src="script.js"></script>` par :
```html
    <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js"></script>
    <script src="config.js"></script>
    <script src="cart.js"></script>
    <script src="auth.js"></script>
    <script src="script.js"></script>
```

- [ ] **Step 9.3: Commit**

```bash
git add aide.html livraison.html communaute.html
git commit -m "feat(pages): add Firebase scripts and cart.css to secondary pages"
```

---

## Task 10: Créer mon-compte.html

**Files:**
- Create: `mon-compte.html`

- [ ] **Step 10.1: Créer mon-compte.html**

```html
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mon Compte | MediAfrica</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="style.css">
    <link rel="stylesheet" href="cart.css">
</head>
<body>

    <nav class="navbar scrolled" id="navbar">
        <div class="nav-inner">
            <a href="index.html" class="logo">
                <img src="assets/logo-clean.png" alt="MediAfrica Solutions Santé" class="logo-img">
            </a>
            <div class="nav-links" id="navLinks">
                <a href="index.html">Accueil</a>
                <a href="catalogue.html">Catalogue</a>
                <a href="livraison.html">Livraison</a>
                <a href="index.html#commander" class="btn-nav">Commander</a>
            </div>
            <button type="button" class="hamburger" id="hamburger" aria-label="Menu Mobile">
                <span></span><span></span><span></span>
            </button>
        </div>
    </nav>

    <main class="account-page" id="accountPage" style="display:none">

        <h1>Mon <em>Compte</em></h1>

        <!-- Profil -->
        <div class="account-section">
            <h2><i class="fa-solid fa-user"></i> Profil</h2>
            <div class="profile-row">
                <div class="profile-avatar" id="profileAvatar">?</div>
                <div class="profile-info">
                    <strong id="profileName">—</strong>
                    <span id="profileEmail">—</span>
                </div>
                <button type="button" class="btn-logout" id="logoutBtn">
                    <i class="fa-solid fa-right-from-bracket"></i> Se déconnecter
                </button>
            </div>
        </div>

        <!-- Historique -->
        <div class="account-section">
            <h2><i class="fa-solid fa-clock-rotate-left"></i> Historique des commandes</h2>
            <div id="ordersContainer">
                <p class="orders-empty">Chargement…</p>
            </div>
        </div>

    </main>

    <!-- Redirect si non connecté -->
    <div id="notLoggedIn" style="display:none; text-align:center; padding: 160px 2rem;">
        <i class="fa-solid fa-lock" style="font-size:3rem; color:var(--muted); margin-bottom:1rem;"></i>
        <h2>Accès réservé</h2>
        <p style="color:var(--muted); margin: 1rem 0 2rem;">Vous devez être connecté pour accéder à votre compte.</p>
        <a href="index.html" class="btn-primary"><i class="fa-solid fa-arrow-left"></i> Retour à l'accueil</a>
    </div>

    <footer class="footer">
        <div class="container footer-inner">
            <div class="footer-brand">
                <a href="index.html" class="logo">
                    <div class="logo-img footer-logo-div" role="img" aria-label="MediAfrica Solutions Santé"></div>
                </a>
                <p>Médicaments de qualité, livrés au Canada et en Afrique de l'Ouest.</p>
            </div>
            <div class="footer-links">
                <a href="catalogue.html">Catalogue</a>
                <a href="livraison.html">Livraison & Suivi</a>
                <a href="aide.html">Aide & FAQ</a>
                <a href="communaute.html">Communauté</a>
                <a href="index.html#commander">Commander</a>
            </div>
            <div class="footer-flags">
                <span title="Canada">🇨🇦</span>
                <span title="Guinée Conakry">🇬🇳</span>
                <span title="Burkina Faso">🇧🇫</span>
                <span title="Côte d'Ivoire">🇨🇮</span>
            </div>
        </div>
        <div class="footer-bottom">
            <p>&copy; 2026 MediAfrica — Solution Santé. Tous droits réservés.</p>
            <p class="disclaimer">Les médicaments proposés sont en vente libre (sans ordonnance). Consultez un professionnel de santé si nécessaire.</p>
        </div>
    </footer>

    <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js"></script>
    <script src="config.js"></script>
    <script src="cart.js"></script>
    <script src="auth.js"></script>
    <script src="script.js"></script>
    <script>
    document.addEventListener('DOMContentLoaded', () => {
        if (typeof firebase === 'undefined' || !firebase.apps.length) {
            document.getElementById('notLoggedIn').style.display = 'block';
            return;
        }
        firebase.auth().onAuthStateChanged(user => {
            if (!user) {
                document.getElementById('notLoggedIn').style.display = 'block';
                return;
            }
            document.getElementById('accountPage').style.display = 'block';

            // Profil
            const name   = user.displayName || user.email.split('@')[0];
            const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
            document.getElementById('profileAvatar').textContent = initials;
            document.getElementById('profileName').textContent   = user.displayName || '—';
            document.getElementById('profileEmail').textContent  = user.email;

            // Logout
            document.getElementById('logoutBtn').addEventListener('click', () => {
                firebase.auth().signOut().then(() => { window.location.href = 'index.html'; });
            });

            // Orders
            const container = document.getElementById('ordersContainer');
            firebase.firestore()
                .collection('orders')
                .where('userId', '==', user.uid)
                .orderBy('createdAt', 'desc')
                .get()
                .then(snap => {
                    if (snap.empty) {
                        container.innerHTML = '<p class="orders-empty">Aucune commande pour le moment.</p>';
                        return;
                    }
                    const statusLabels = {
                        sent:       '<span class="order-status status-sent">Envoyée</span>',
                        processing: '<span class="order-status status-processing">En cours</span>',
                        delivered:  '<span class="order-status status-delivered">Livrée</span>'
                    };
                    container.innerHTML = snap.docs.map(doc => {
                        const o    = doc.data();
                        const date = o.createdAt?.toDate().toLocaleDateString('fr-CA', {
                            year:'numeric', month:'long', day:'numeric'
                        }) || '—';
                        const items = (o.items || []).map(i => {
                            const line = i.lineTotal != null ? i.lineTotal.toFixed(2) + ' CAD' : 'Sur devis';
                            return `<li>${i.name} × ${i.qty} — ${line}</li>`;
                        }).join('');
                        const total  = o.total != null ? o.total.toFixed(2) + ' CAD' : 'Sur devis';
                        const method = o.paymentMethod === 'paypal' ? 'PayPal' : 'WhatsApp';
                        const status = statusLabels[o.status] || statusLabels['sent'];
                        return `
                        <div class="order-card">
                            <div class="order-card-header">
                                <span class="order-date">${date}</span>
                                ${status}
                            </div>
                            <ul class="order-items">${items}</ul>
                            <div class="order-total">Total : ${total}</div>
                            <div class="order-method">Paiement : ${method}</div>
                        </div>`;
                    }).join('');
                })
                .catch(() => {
                    container.innerHTML = '<p class="orders-empty">Impossible de charger les commandes.</p>';
                });
        });
    });
    </script>
</body>
</html>
```

- [ ] **Step 10.2: Commit**

```bash
git add mon-compte.html
git commit -m "feat: add mon-compte.html (profile + order history)"
```

---

## Task 11: Règles Firestore (sécurité)

**Files:**
- Documentation inline — à appliquer dans la console Firebase

- [ ] **Step 11.1: Créer le projet Firebase**

1. Aller sur [console.firebase.google.com](https://console.firebase.google.com)
2. Créer un projet (ex: `mediafrica-store`)
3. Activer **Authentication → Sign-in method → Email/Password**
4. Créer une base **Firestore Database** (mode Production)
5. Copier les clés du SDK Web dans `config.js`

- [ ] **Step 11.2: Appliquer les règles Firestore**

Dans la console Firebase → Firestore → Règles, coller :

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /orders/{orderId} {
      allow create: if request.auth != null
                    && request.resource.data.userId == request.auth.uid;
      allow read:   if request.auth != null
                    && resource.data.userId == request.auth.uid;
      allow update: if false; // seul le propriétaire via console peut changer les statuts
      allow delete: if false;
    }
  }
}
```

- [ ] **Step 11.3: Mettre à jour config.js avec les vraies clés**

```js
const CONFIG = {
    paypal: {
        handle: 'LE_VRAI_HANDLE_PAYPAL',
        currency: 'CAD'
    },
    firebase: {
        apiKey:            "AIza...",
        authDomain:        "mediafrica-store.firebaseapp.com",
        projectId:         "mediafrica-store",
        storageBucket:     "mediafrica-store.appspot.com",
        messagingSenderId: "123456789",
        appId:             "1:123:web:abc"
    },
    prices: {}
};
```

- [ ] **Step 11.4: Test complet du flux**

Ouvrir index.html en local ou déployé :
1. Cliquer "Ajouter au panier" → badge apparaît ✓
2. Ouvrir le panneau → produit visible avec +/- et suppression ✓
3. Cliquer "Passer au paiement" sans être connecté → modal login s'ouvre ✓
4. Créer un compte → modal se ferme, checkout reprend ✓
5. Si `config.prices` vide → redirect WhatsApp avec le panier ✓
6. Ajouter un prix dans `config.prices` → rechargement → PayPal redirect ✓
7. Aller sur `mon-compte.html` → historique visible ✓

- [ ] **Step 11.5: Commit final**

```bash
git add config.js
git commit -m "feat: configure Firebase + Firestore rules (ready for production)"
```
