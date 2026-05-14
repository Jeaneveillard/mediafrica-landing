const Cart = (() => {
    const KEY = 'mediafrica_cart';

    function _esc(str) {
        return String(str ?? '')
            .replace(/&/g,'&amp;').replace(/</g,'&lt;')
            .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

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
        openPanel();
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
            <div class="cart-item" data-id="${_esc(item.id)}">
                <div class="cart-item-info">
                    <span class="cart-item-tag">${_esc(item.category)}</span>
                    <strong class="cart-item-name">${_esc(item.name)}</strong>
                    <span class="cart-item-unit">${_esc(unitLabel)}</span>
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

        // Save to Firestore (avec catch pour éviter perte silencieuse)
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
            }).catch(err => console.warn('⚠️ Sauvegarde commande Firestore échouée:', err.message));
        }

        clear();
        closePanel();

        const waNumber = (typeof CONFIG !== 'undefined' && CONFIG.whatsappNumber)
            ? CONFIG.whatsappNumber : '14384029247';

        if (total !== null && handle && handle !== 'TON_COMPTE_PAYPAL') {
            window.open(`https://paypal.me/${handle}/${total.toFixed(2)}`, '_blank');
        } else {
            const userName = user ? (user.displayName || user.email) : 'Client';
            const lines = items.map(i => {
                const p = i.unitPrice != null ? (i.unitPrice * i.quantity).toFixed(2) + ' CAD' : 'Sur devis';
                return `• ${i.name} × ${i.quantity} — ${p}`;
            }).join('\n');
            const totalLine = total !== null ? `\n💰 *Total : ${total.toFixed(2)} CAD*` : '\n💰 *Total : Sur devis*';
            const msg = `🛒 *Nouvelle commande MediAfrica*\n\n${lines}${totalLine}\n\n👤 *Client :* ${userName}`;
            window.open(`https://wa.me/${waNumber}?text=${encodeURIComponent(msg)}`, '_blank');
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

    /* ── Chargement des prix depuis Firestore ── */
    function _loadPrices() {
        if (typeof firebase === 'undefined' || !firebase.apps.length) return;
        firebase.firestore().collection('config').doc('prices').get()
            .then(doc => {
                if (!doc.exists) return;
                const firestorePrices = doc.data() || {};
                // Fusionner avec CONFIG.prices (Firestore a la priorité)
                if (typeof CONFIG !== 'undefined') {
                    CONFIG.prices = { ...CONFIG.prices, ...firestorePrices };
                }
                // Mettre à jour les prix déjà dans le panier
                const items = getItems();
                let updated = false;
                items.forEach(item => {
                    const p = firestorePrices[item.name];
                    if (p != null && item.unitPrice !== p) {
                        item.unitPrice = p;
                        updated = true;
                    }
                });
                if (updated) { _save(items); _renderItems(); }
            })
            .catch(() => {}); // Silencieux si hors ligne
    }

    /* ── Init ── */
    function init() {
        _injectHTML();
        _updateBadge();
        _renderItems();
        _loadPrices();

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
