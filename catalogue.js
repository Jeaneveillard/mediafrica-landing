document.addEventListener('DOMContentLoaded', () => {

    // Slugify for cart IDs
    function slugify(str) {
        return str.toLowerCase()
            .normalize('NFD').replace(/[̀-ͯ]/g, '')
            .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    }

    const grid        = document.getElementById('catGrid');
    const cards       = Array.from(grid.querySelectorAll('.cat-card'));
    const searchInput = document.getElementById('searchInput');
    const filterBtns  = document.querySelectorAll('.filter-btn');
    const countEl     = document.getElementById('productCount');
    const emptyEl     = document.getElementById('catEmpty');

    let activeCategory = 'tous';
    let searchQuery    = '';

    function updateCount(visible) {
        countEl.textContent = visible;
        emptyEl.style.display = visible === 0 ? 'block' : 'none';
    }

    function filterCards() {
        let visible = 0;
        cards.forEach(card => {
            const cat   = card.dataset.cat;
            const text  = card.textContent.toLowerCase();
            const matchCat    = activeCategory === 'tous' || cat === activeCategory;
            const matchSearch = searchQuery === '' || text.includes(searchQuery);
            const show  = matchCat && matchSearch;
            card.style.display = show ? '' : 'none';
            if (show) visible++;
        });
        updateCount(visible);
    }

    // Navbar scroll
    const navbar = document.getElementById('navbar');
    window.addEventListener('scroll', () => {
        navbar.classList.toggle('scrolled', window.scrollY > 10);
    });

    // Hamburger
    const hamburger = document.getElementById('hamburger');
    const navLinks  = document.getElementById('navLinks');
    const spans     = hamburger.querySelectorAll('span');
    hamburger.addEventListener('click', () => {
        const open = navLinks.classList.toggle('open');
        spans[0].style.transform = open ? 'rotate(45deg) translate(5px,5px)' : '';
        spans[1].style.opacity   = open ? '0' : '1';
        spans[2].style.transform = open ? 'rotate(-45deg) translate(5px,-5px)' : '';
    });

    // Filters
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeCategory = btn.dataset.cat;
            filterCards();
        });
    });

    // Search
    searchInput.addEventListener('input', () => {
        searchQuery = searchInput.value.toLowerCase().trim();
        filterCards();
    });

    // Init count
    filterCards();
    if (typeof Cart !== 'undefined') Cart.init();
    if (typeof Auth !== 'undefined') Auth.init();

    // ── MODAL PRODUIT ──────────────────────────────────────────
    const modal      = document.getElementById('productModal');
    const modalImg   = document.getElementById('modalImg');
    const modalTag   = document.getElementById('modalTag');
    const modalTitle = document.getElementById('modalTitle');
    const modalDesc  = document.getElementById('modalDesc');
    const modalDose  = document.getElementById('modalDosage');
    const modalClose = document.getElementById('modalClose');
    const qtyInput   = document.getElementById('qtyInput');
    const unitPrice  = document.getElementById('unitPrice');
    const modalTotal = document.getElementById('modalTotal');
    const modalOrderBtn = document.getElementById('modalOrderBtn');
    const modalForm  = document.getElementById('modalForm');
    const mfSummary  = document.getElementById('mfSummary');
    const mfBack     = document.getElementById('mfBack');

    let currentProduct = '';

    /* ── Calcul du total ── */
    function updateTotal() {
        const qty   = parseInt(qtyInput.value) || 0;
        const price = parseFloat(unitPrice.value) || 0;
        if (qty > 0 && price > 0) {
            const total = (qty * price).toLocaleString('fr-CA', { style: 'currency', currency: 'CAD' });
            modalTotal.textContent = total;
        } else {
            modalTotal.textContent = '—';
        }
    }

    qtyInput.addEventListener('input', updateTotal);
    unitPrice.addEventListener('input', updateTotal);

    document.getElementById('qtyMinus').addEventListener('click', () => {
        const v = Math.max(1, (parseInt(qtyInput.value) || 1) - 1);
        qtyInput.value = v; updateTotal();
    });
    document.getElementById('qtyPlus').addEventListener('click', () => {
        qtyInput.value = (parseInt(qtyInput.value) || 1) + 1; updateTotal();
    });

    /* ── Ouvrir modal ── */
    function openModal(card) {
        const header = card.querySelector('.cat-card-header');
        modalImg.style.backgroundImage    = header ? header.style.backgroundImage : '';
        modalImg.style.backgroundRepeat   = 'no-repeat';
        // Copier le recadrage de la carte si défini, sinon valeurs par défaut
        if (header && header.style.backgroundPosition) {
            modalImg.style.backgroundSize     = '100% 145%';
            modalImg.style.backgroundPosition = 'center 50%';
        } else {
            modalImg.style.backgroundSize     = 'contain';
            modalImg.style.backgroundPosition = 'center center';
        }

        const tag = card.querySelector('.cat-tag');
        if (tag) {
            modalTag.textContent  = tag.textContent;
            modalTag.style.cssText = `background:${window.getComputedStyle(tag).background};color:${window.getComputedStyle(tag).color}`;
        }

        const h3 = card.querySelector('h3');
        currentProduct = h3 ? h3.textContent : '';
        modalTitle.textContent = currentProduct;

        const p = card.querySelector('.cat-card-body p');
        modalDesc.innerHTML = p ? p.innerHTML : '';

        const doses = card.querySelectorAll('.cat-dosage span');
        modalDose.innerHTML = '';
        doses.forEach(d => {
            const s = document.createElement('span');
            s.textContent = d.textContent;
            modalDose.appendChild(s);
        });

        // Reset étape 1
        qtyInput.value  = 1000;
        const p = (typeof CONFIG !== 'undefined' && CONFIG.prices?.[currentProduct] != null)
            ? CONFIG.prices[currentProduct]
            : '';
        unitPrice.value = p;
        updateTotal();
        modalForm.classList.add('modal-form--hidden');
        modalOrderBtn.style.display = '';

        modal.classList.add('open');
        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        modal.classList.remove('open');
        document.body.style.overflow = '';
    }

    /* ── Étape 1 → 2 ── */
    modalOrderBtn.addEventListener('click', () => {
        const qty   = parseInt(qtyInput.value) || 0;
        const price = parseFloat(unitPrice.value) || 0;
        const total = qty > 0 && price > 0
            ? (qty * price).toLocaleString('fr-CA', { style: 'currency', currency: 'CAD' })
            : 'Sur devis';

        mfSummary.innerHTML =
            `<strong>${currentProduct}</strong><br>` +
            `Quantité : ${qty} unités &nbsp;·&nbsp; ` +
            `Prix unitaire : ${price > 0 ? '$' + price.toFixed(2) : 'Sur devis'} &nbsp;·&nbsp; ` +
            `<strong>Total : ${total}</strong>`;

        modalOrderBtn.style.display = 'none';
        modalForm.classList.remove('modal-form--hidden');
        modal.querySelector('.modal-card').scrollTop = 0;
    });

    /* ── Retour étape 1 ── */
    mfBack.addEventListener('click', () => {
        modalForm.classList.add('modal-form--hidden');
        modalOrderBtn.style.display = '';
    });

    /* ── Soumission → WhatsApp ── */
    modalForm.addEventListener('submit', e => {
        e.preventDefault();
        const qty   = parseInt(qtyInput.value) || 0;
        const price = parseFloat(unitPrice.value) || 0;
        const total = qty > 0 && price > 0
            ? (qty * price).toLocaleString('fr-CA', { style: 'currency', currency: 'CAD' })
            : 'Sur devis';

        const nom      = document.getElementById('mf-nom').value;
        const email    = document.getElementById('mf-email').value;
        const tel      = document.getElementById('mf-tel').value;
        const pays     = document.getElementById('mf-pays').value;
        const adresse  = document.getElementById('mf-adresse').value;
        const ville    = document.getElementById('mf-ville').value;
        const cp       = document.getElementById('mf-cp').value;
        const shipping = document.getElementById('mf-shipping').value;
        const notes    = document.getElementById('mf-notes').value;

        const msg = [
            '🛒 *Nouvelle commande MediAfrica*',
            '',
            `📦 *Produit :* ${currentProduct}`,
            `📊 *Quantité :* ${qty} unités`,
            `💲 *Prix unitaire :* ${price > 0 ? '$' + price.toFixed(2) + ' CAD' : 'Sur devis'}`,
            `💰 *Total :* ${total}`,
            '',
            '👤 *Client*',
            `Nom : ${nom}`,
            `Tél/WhatsApp : ${tel}`,
            `Courriel : ${email}`,
            '',
            '📍 *Adresse de livraison*',
            `${adresse}`,
            `${ville}${cp ? ', ' + cp : ''}`,
            `${pays}`,
            '',
            `🚚 *Expédition :* ${shipping}`,
            notes ? `📝 *Notes :* ${notes}` : ''
        ].filter(Boolean).join('\n');

        const waNum = (typeof CONFIG !== 'undefined' && CONFIG.whatsappNumber) ? CONFIG.whatsappNumber : '14384029247';
        window.open(`https://wa.me/${waNum}?text=${encodeURIComponent(msg)}`, '_blank');
        closeModal();
    });

    /* ── Clic sur une carte ── */
    cards.forEach(card => {
        card.style.cursor = 'pointer';
        card.addEventListener('click', e => {
            if (e.target.closest('.cat-btn') || e.target.closest('.add-to-cart-btn')) return;
            openModal(card);
        });
    });

    // Add-to-cart handler (event delegation sur le grid)
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

    /* ── Fermer ── */
    modalClose.addEventListener('click', closeModal);
    modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
});
