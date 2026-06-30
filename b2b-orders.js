/**
 * b2b-orders.js — Formulaire de commande B2B + stockage permanent + calcul taxes
 *
 * Stockage : localStorage 'ssc_b2b_orders' (lecture seule pour l'admin — non supprimable)
 * Taxes Canada : GST 5% + QST 9.975% (si province = Québec)
 *               GST 5% seul (autres provinces canadiennes)
 *               Aucune taxe (international)
 */
const B2BOrders = (() => {

    const KEY = 'ssc_b2b_orders';

    // ── Liste complète des produits disponibles ──────────────────────────────
    const PRODUCTS = [
        // Liquides SSC
        { name: 'Vitamine C Liquide 1500 ml',         cat: 'Liquide SSC', key: 'Vitamine C Liquide' },
        { name: 'Vitamine D3 Liquide 1500 ml',        cat: 'Liquide SSC', key: 'Vitamine D3 Liquide' },
        { name: 'Zinc Liquide 1500 ml',               cat: 'Liquide SSC', key: 'Zinc Liquide' },
        { name: 'Multivitamines Liquide 1500 ml',     cat: 'Liquide SSC', key: 'Multivitamines Liquide' },
        { name: 'Mélatonine Liquide 1500 ml',         cat: 'Liquide SSC', key: 'Mélatonine Liquide' },
        { name: 'Vitamine B12 Liquide 1500 ml',       cat: 'Liquide SSC', key: 'Vitamine B12 Liquide' },
        { name: 'B-Complexe Liquide 1500 ml',         cat: 'Liquide SSC', key: 'B-Complexe Liquide' },
        { name: 'Hair, Skin & Nails Liquide 1500 ml', cat: 'Liquide SSC', key: 'Hair, Skin & Nails Liquide' },
        { name: 'Elderberry (Sureau) Liquide 1500 ml',cat: 'Liquide SSC', key: 'Elderberry (Sureau) Liquide' },
        { name: 'Collagène Liquide 1500 ml',          cat: 'Liquide SSC', key: 'Collagène Liquide' },
        // Gummies
        { name: 'Multivitamines Adultes Gummies',     cat: 'Gummies',     key: 'Multivitamines Adultes' },
        { name: 'Multivitamines Enfants Gummies',     cat: 'Gummies',     key: 'Multivitamines Enfants' },
        { name: 'Multivitamines Femmes Gummies',      cat: 'Gummies',     key: 'Multivitamines Femmes' },
        { name: 'Vitamine C Gummies',                 cat: 'Gummies',     key: 'Vitamine C Gummies' },
        { name: 'Vitamine D3 Gummies',                cat: 'Gummies',     key: 'Vitamine D3 Gummies' },
        { name: 'Vitamine B12 Gummies',               cat: 'Gummies',     key: 'Vitamine B12 Gummies' },
        { name: 'B-Complex Gummies',                  cat: 'Gummies',     key: 'B-Complex Gummies' },
        { name: 'Magnésium Gummies',                  cat: 'Gummies',     key: 'Magnésium Gummies' },
        // Médicaments
        { name: 'Paracétamol 500mg',                  cat: 'Antidouleur', key: null },
        { name: 'Paracétamol 1000mg',                 cat: 'Antidouleur', key: null },
        { name: 'Ibuprofène 400mg',                   cat: 'Antidouleur', key: null },
        { name: 'Chloroquine 250mg',                  cat: 'Antipaludéen',key: null },
        { name: 'Quinine 500mg',                      cat: 'Antipaludéen',key: null },
        { name: 'Sels de Réhydratation (SRO)',        cat: 'Digestif',    key: null },
        { name: 'Lopéramide 2mg',                     cat: 'Digestif',    key: null },
        { name: 'Bétadine Solution 10%',              cat: 'Antiseptique',key: null },
        { name: 'Alcool Isopropylique 70%',           cat: 'Antiseptique',key: null },
        { name: 'Cétirizine 10mg',                    cat: 'Allergie',    key: null },
        { name: 'Loratadine 10mg',                    cat: 'Allergie',    key: null },
        { name: 'Pansements adhésifs',                cat: 'Fournitures', key: null },
        { name: 'Thermomètre digital',                cat: 'Fournitures', key: null },
        { name: 'Gants latex — Boîte 100',           cat: 'Fournitures', key: null },
        { name: 'Seringue Luer Lock 1ml',             cat: 'Matériel',   key: null },
        { name: 'Seringue Luer Lock 3ml',             cat: 'Matériel',   key: null },
        { name: 'Aiguille de Sécurité Adulte 1"',    cat: 'Matériel',   key: null },
        { name: '— Autre produit (préciser) —',       cat: '',           key: null, autre: true },
    ];

    // ── Taxes ────────────────────────────────────────────────────────────────
    function _taxes(pays, province) {
        const p = (province || '').toLowerCase();
        if (!pays || pays === 'Autre') return [];
        if (pays !== 'Canada') return [];
        const gst = { label: 'TPS (GST 5%)', rate: 0.05 };
        if (p.includes('qu') || p === 'qc') {
            return [gst, { label: 'TVQ (QST 9.975%)', rate: 0.09975 }];
        }
        if (p.includes('ontario') || p === 'on' || p.includes('brunswick') ||
            p.includes('nouveau') || p.includes('scotia') || p.includes('pei') ||
            p.includes('île') || p.includes('terre') || p.includes('newfound')) {
            return [{ label: 'TVH (HST 13–15%)', rate: 0.13 }];
        }
        return [gst];
    }

    // ── Stockage ─────────────────────────────────────────────────────────────
    function getAll() {
        try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
    }
    function _save(orders) {
        localStorage.setItem(KEY, JSON.stringify(orders));
    }
    function add(order) {
        // Firestore : enregistre la commande B2B (visible à l'admin + au grossiste)
        if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length > 0) {
            const user = (typeof Auth !== 'undefined' && Auth.currentUser) ? Auth.currentUser() : null;
            firebase.firestore().collection('b2b_orders').add({
                ...order,
                userId:        user ? user.uid : '',
                grossisteEmail: user ? user.email : order.contact.email,
                createdAt:     firebase.firestore.FieldValue.serverTimestamp()
            }).catch(err => console.warn('⚠️ Sauvegarde B2B Firestore échouée, repli localStorage :', err.message));
        }
        // Toujours en localStorage pour que l'admin le voie immédiatement
        const orders = getAll();
        orders.unshift(order);
        _save(orders);
    }
    function updateStatus(id, status) {
        const orders = getAll();
        const o = orders.find(x => x.id === id);
        if (o) { o.status = status; o.updatedAt = new Date().toISOString(); }
        _save(orders);
    }

    // ── Construction d'une ligne article ────────────────────────────────────
    function _buildRow(idx) {
        const options = PRODUCTS.map((p, i) => {
            const sel = i === 0 ? 'selected' : '';
            return `<option value="${i}" ${sel} ${p.autre ? 'class="opt-autre"' : ''}>${p.cat ? '['+p.cat+'] ' : ''}${p.name}</option>`;
        }).join('');

        return `
        <div class="b2b-item-row" data-idx="${idx}">
            <div class="b2b-item-left">
                <select class="b2b-item-select" data-field="product">
                    ${options}
                </select>
                <input type="text" class="b2b-item-autre" data-field="autre"
                    placeholder="Précisez le produit…" style="display:none">
            </div>
            <div class="b2b-item-right">
                <input type="number" class="b2b-item-qty" data-field="qty"
                    value="1" min="1" max="9999" placeholder="Qté">
                <select class="b2b-item-unit" data-field="unit">
                    <option>unités</option>
                    <option>boîtes</option>
                    <option>caisses</option>
                    <option>flacons</option>
                </select>
                <button type="button" class="b2b-item-remove" aria-label="Supprimer">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>
        </div>`;
    }

    // ── Calcul du récapitulatif ──────────────────────────────────────────────
    function _updateSummary() {
        const rows = document.querySelectorAll('.b2b-item-row');
        const pays = (document.getElementById('of-pays') || {}).value || '';
        const province = (document.getElementById('of-province') || {}).value || '';
        const isGros = typeof Auth !== 'undefined' && Auth.isGrossiste && Auth.isGrossiste();
        let items = [];
        rows.forEach(row => {
            const sel = row.querySelector('[data-field="product"]');
            const autreFld = row.querySelector('[data-field="autre"]');
            const qty = parseInt(row.querySelector('[data-field="qty"]').value) || 0;
            const unit = row.querySelector('[data-field="unit"]').value;
            const pidx = parseInt(sel.value);
            const prod = PRODUCTS[pidx];
            let name = prod.autre ? autreFld.value.trim() : prod.name;
            if (!name || qty <= 0) return;
            let unitPrice = null;
            if (prod.key && typeof CONFIG !== 'undefined') {
                unitPrice = CONFIG.priceFor(prod.key, isGros);
            }
            items.push({ name, qty, unit, unitPrice });
        });

        const summary = document.getElementById('b2bSummary');
        const table   = document.getElementById('b2bRecapTable');
        const taxesEl = document.getElementById('b2bTaxes');
        if (!summary || !table || !taxesEl) return;

        if (items.length === 0) { summary.style.display = 'none'; return; }
        summary.style.display = 'block';

        let subtotal = 0;
        let allPriced = true;
        const rows2 = items.map(it => {
            if (it.unitPrice == null) { allPriced = false; return `<tr><td>${it.name}</td><td>${it.qty} ${it.unit}</td><td colspan="2">Prix sur devis</td></tr>`; }
            const line = it.unitPrice * it.qty;
            subtotal += line;
            return `<tr><td>${it.name}</td><td>${it.qty} ${it.unit}</td><td>${it.unitPrice.toFixed(2)} $</td><td><strong>${line.toFixed(2)} $</strong></td></tr>`;
        }).join('');

        table.innerHTML = `<thead><tr><th>Article</th><th>Qté</th><th>Prix unit.</th><th>Sous-total</th></tr></thead><tbody>${rows2}</tbody>`;

        if (allPriced && items.length > 0) {
            const txList = _taxes(pays, province);
            let taxTotal = 0;
            let taxRows = txList.map(t => {
                const amt = subtotal * t.rate;
                taxTotal += amt;
                return `<span class="tax-line"><span>${t.label}</span><span>${amt.toFixed(2)} $</span></span>`;
            }).join('');
            const total = subtotal + taxTotal;
            taxesEl.innerHTML = `
                <span class="tax-line subtotal-line"><span>Sous-total</span><span>${subtotal.toFixed(2)} $</span></span>
                ${taxRows}
                <span class="tax-line total-line"><span>TOTAL</span><span>${total.toFixed(2)} $</span></span>`;
        } else {
            taxesEl.innerHTML = allPriced ? '' : '<em>Certains prix sont sur devis — montant final confirmé par notre équipe.</em>';
        }
    }

    // ── Injection des lignes article ─────────────────────────────────────────
    function _addRow() {
        const container = document.getElementById('b2bItems');
        if (!container) return;
        const idx = container.children.length;
        container.insertAdjacentHTML('beforeend', _buildRow(idx));
        const row = container.lastElementChild;
        const sel = row.querySelector('[data-field="product"]');
        const autreFld = row.querySelector('[data-field="autre"]');
        sel.addEventListener('change', () => {
            const prod = PRODUCTS[parseInt(sel.value)];
            autreFld.style.display = prod.autre ? 'block' : 'none';
            _updateSummary();
        });
        row.querySelector('[data-field="qty"]').addEventListener('input', _updateSummary);
        row.querySelector('[data-field="unit"]').addEventListener('change', _updateSummary);
        autreFld.addEventListener('input', _updateSummary);
        row.querySelector('.b2b-item-remove').addEventListener('click', () => {
            row.remove();
            _updateSummary();
        });
        _updateSummary();
    }

    // ── Soumission ────────────────────────────────────────────────────────────
    function _submit(e) {
        e.preventDefault();
        const err = document.getElementById('ofError');
        const val = id => (document.getElementById(id) || {}).value?.trim() || '';
        const nom         = val('of-nom');
        const etab        = val('of-etablissement');
        const numEntreprise = val('of-numero-entreprise');
        const email       = val('of-email');
        const tel         = val('of-telephone');
        const pays        = val('of-pays');
        const adr         = val('of-adresse');
        const rows        = [...document.querySelectorAll('.b2b-item-row')];

        if (!nom || !etab || !numEntreprise || !email || !tel || !pays || !adr) {
            err.textContent = 'Veuillez remplir tous les champs obligatoires (*).';
            return;
        }
        if (rows.length === 0) {
            err.textContent = 'Ajoutez au moins un article.';
            return;
        }
        err.textContent = '';

        const isGros = typeof Auth !== 'undefined' && Auth.isGrossiste && Auth.isGrossiste();
        const items  = [];
        rows.forEach(row => {
            const pidx = parseInt(row.querySelector('[data-field="product"]').value);
            const prod = PRODUCTS[pidx];
            const name = prod.autre ? row.querySelector('[data-field="autre"]').value.trim() : prod.name;
            const qty  = parseInt(row.querySelector('[data-field="qty"]').value) || 0;
            const unit = row.querySelector('[data-field="unit"]').value;
            let unitPrice = null;
            if (prod.key && typeof CONFIG !== 'undefined') unitPrice = CONFIG.priceFor(prod.key, isGros);
            if (name && qty > 0) items.push({ name, qty, unit, unitPrice });
        });

        const pays2    = val('of-pays');
        const province = val('of-province');
        const txList   = _taxes(pays2, province);
        let   subtotal = items.reduce((s, i) => s + (i.unitPrice != null ? i.unitPrice * i.qty : 0), 0);
        let   taxTotal = txList.reduce((s, t) => s + subtotal * t.rate, 0);

        const order = {
            id:           'B2B-' + Date.now(),
            factureNum:   typeof InvoiceNum !== 'undefined' ? InvoiceNum.next() : 'FACT-'+Date.now(),
            date:         new Date().toISOString(),
            statut:       'Nouveau',
            contact:      { nom, etablissement: etab, numeroEntreprise: numEntreprise, email, telephone: tel },
            livraison:    { pays: pays2, province, adresse: adr, licence: val('of-licence') },
            items,
            taxes:        txList,
            subtotal:     subtotal > 0 ? subtotal : null,
            taxTotal:     taxTotal > 0 ? taxTotal : null,
            total:        subtotal > 0 ? subtotal + taxTotal : null,
            notes:        val('of-notes'),
            sourceRegion: typeof Region !== 'undefined' && Region.get ? Region.get() : ''
        };

        add(order);

        // Notification Netlify Forms
        if (typeof Notify !== 'undefined') {
            const lignes = items.map(i => `${i.name} × ${i.qty} ${i.unit}`).join(', ');
            Notify.commande({ id: order.id, client: `${nom} (${etab})`, email, items: items.map(i => ({name:i.name, qty:i.qty, prix:i.unitPrice})), total: order.total });
        }

        // Réinitialiser → afficher succès + lien facture
        const orderId = order.id;
        document.getElementById('orderForm').style.display = 'none';
        const s = document.getElementById('orderSuccess');
        if (s) {
            s.style.display = '';
            const link = document.createElement('a');
            link.href = 'facture.html?id=' + orderId;
            link.target = '_blank';
            link.className = 'facture-link';
            link.innerHTML = '<i class="fa-solid fa-file-invoice"></i> Voir / Imprimer ma facture pro forma';
            s.appendChild(link);
        }
    }

    // ── Contrôle d'accès : réservé aux grossistes validés ────────────────────
    function _checkAccess() {
        const form       = document.getElementById('orderForm');
        const successEl  = document.getElementById('orderSuccess');
        const wrap       = form?.parentElement;
        if (!form || !wrap) return;

        const user    = typeof Auth !== 'undefined' && Auth.currentUser ? Auth.currentUser() : null;
        const isGros  = typeof Auth !== 'undefined' && Auth.isGrossiste && Auth.isGrossiste();

        // Retire le message d'accès précédent si présent
        wrap.querySelectorAll('.b2b-access-msg').forEach(el => el.remove());

        if (!user) {
            form.style.display = 'none';
            if (successEl) successEl.style.display = 'none';
            wrap.insertAdjacentHTML('afterbegin', `
            <div class="b2b-access-msg b2b-access-login">
                <i class="fa-solid fa-lock"></i>
                <div>
                    <strong>Formulaire réservé aux grossistes & revendeurs agréés</strong>
                    <p>Connectez-vous avec votre compte grossiste pour accéder au formulaire de commande B2B.</p>
                </div>
                <button type="button" onclick="if(typeof Auth!=='undefined')Auth.openModal()" class="b2b-access-btn">
                    <i class="fa-solid fa-right-to-bracket"></i> Se connecter
                </button>
            </div>`);
        } else if (!isGros) {
            form.style.display = 'none';
            if (successEl) successEl.style.display = 'none';
            wrap.insertAdjacentHTML('afterbegin', `
            <div class="b2b-access-msg b2b-access-denied">
                <i class="fa-solid fa-store"></i>
                <div>
                    <strong>Accès grossiste requis</strong>
                    <p>Votre compte n'a pas encore le statut grossiste/revendeur. Pour commander à l'unité, visitez notre <a href="catalogue.html">catalogue</a>. Pour demander un accès grossiste, <a href="#commander" onclick="if(typeof Auth!=='undefined')Auth.openModal()">contactez-nous</a>.</p>
                </div>
            </div>`);
        } else {
            form.style.display = '';
            wrap.querySelectorAll('.b2b-access-msg').forEach(el => el.remove());
        }
    }

    // ── Init ─────────────────────────────────────────────────────────────────
    function init() {
        const form   = document.getElementById('orderForm');
        const addBtn = document.getElementById('btnAddItem');
        if (!form) return;

        _checkAccess();
        document.addEventListener('auth:changed', _checkAccess);

        _addRow(); // une ligne par défaut

        if (addBtn) addBtn.addEventListener('click', _addRow);
        form.addEventListener('submit', _submit);

        ['of-pays','of-province'].forEach(id => {
            document.getElementById(id)?.addEventListener('change', _updateSummary);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    return { getAll, add, updateStatus, PRODUCTS };
})();
