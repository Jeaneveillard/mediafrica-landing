document.addEventListener('DOMContentLoaded', () => {

    // Navbar scroll
    const navbar = document.getElementById('navbar');
    window.addEventListener('scroll', () => {
        navbar.classList.toggle('scrolled', window.scrollY > 60);
    });

    // Hamburger → overlay injecté dans <body> (z-index indépendant de la navbar)
    const hamburger = document.getElementById('hamburger');
    const navLinks  = document.getElementById('navLinks');
    if (hamburger && navLinks) {
        const spans = hamburger.querySelectorAll('span');

        // Crée l'overlay une seule fois
        let overlay = document.getElementById('mobileMenuOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'mobileMenuOverlay';
            overlay.innerHTML = '<button type="button" id="mobileMenuClose" aria-label="Fermer"><i class="fa-solid fa-xmark"></i></button>';
            navLinks.querySelectorAll('a').forEach(a => {
                if (!a.closest('.nav-more')) overlay.appendChild(a.cloneNode(true));
            });
            document.body.appendChild(overlay);
        }

        const _openMenu = () => {
            overlay.classList.add('open');
            document.body.style.overflow = 'hidden';
            spans[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
            spans[1].style.opacity   = '0';
            spans[2].style.transform = 'rotate(-45deg) translate(5px, -5px)';
        };
        const _closeMenu = () => {
            overlay.classList.remove('open');
            document.body.style.overflow = '';
            spans.forEach(s => { s.style.transform = ''; s.style.opacity = '1'; });
        };

        hamburger.addEventListener('click', () =>
            overlay.classList.contains('open') ? _closeMenu() : _openMenu()
        );
        document.getElementById('mobileMenuClose').addEventListener('click', _closeMenu);
        overlay.querySelectorAll('a').forEach(a => a.addEventListener('click', _closeMenu));
    }

    // New Desktop Menu Toggle
    const menuToggle = document.getElementById('menuToggle');
    const dropdown   = document.getElementById('dropdownMenu');
    if (menuToggle) {
        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('open');
        });
        document.addEventListener('click', () => dropdown.classList.remove('open'));
    }

    // Scroll reveal
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12 });

    document.querySelectorAll('.reveal, .reveal-right, .reveal-up')
        .forEach(el => observer.observe(el));

    // Init cart + auth (must run on all pages, before form guard)
    if (typeof Cart !== 'undefined') Cart.init();
    if (typeof Auth !== 'undefined') Auth.init();

    // Le formulaire #orderForm (commande grossiste) est géré par b2b-orders.js
    // (validation, lignes de produits, taxes, enregistrement + facture pro forma).
    // L'ancien handler ici a été retiré : il ouvrait un message WhatsApp vide
    // (champs absents) et envoyait un POST Netlify mort sur GitHub Pages.
    const form = document.getElementById('orderForm');
    if (!form) return;

    // Lien WhatsApp contact (utilise CONFIG.whatsappNumber)
    const waLink = document.getElementById('waContactLink');
    if (waLink) {
        const waNum = (typeof CONFIG !== 'undefined' && CONFIG.whatsappNumber) ? CONFIG.whatsappNumber : '14384029247';
        waLink.href = `https://wa.me/${waNum}`;
    }

    // Add-to-cart sur les cartes produits de index.html
    document.querySelectorAll('.add-to-cart-btn[data-name]').forEach(btn => {
        btn.addEventListener('click', () => {
            if (typeof Cart === 'undefined') return;
            const name      = btn.dataset.name;
            const category  = btn.dataset.category || '';
            const grossiste = (typeof Auth !== 'undefined' && Auth.isGrossiste) ? Auth.isGrossiste() : false;
            const unitPrice = (typeof CONFIG !== 'undefined') ? CONFIG.priceFor(name, grossiste) : null;
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

    // ── Espace Grossistes (section index) ──
    const espaceBtn = document.getElementById('btnEspaceGros');
    if (espaceBtn) {
        function updateEspaceGros() {
            const note   = document.getElementById('espaceGrosNote');
            const user   = (typeof Auth !== 'undefined') ? Auth.currentUser() : null;
            const isGros = (typeof Auth !== 'undefined' && Auth.isGrossiste) ? Auth.isGrossiste() : false;
            if (isGros) {
                espaceBtn.innerHTML = '<i class="fa-solid fa-box-open"></i> Commander en gros';
                if (note) note.textContent = '✓ Connecté en grossiste — les prix de gros sont affichés.';
            } else if (user) {
                espaceBtn.innerHTML = '<i class="fa-brands fa-whatsapp"></i> Demander un accès grossiste';
                if (note) note.textContent = "Votre compte n'est pas encore grossiste.";
            } else {
                espaceBtn.innerHTML = '<i class="fa-solid fa-unlock-keyhole"></i> Accès grossiste';
                if (note) note.textContent = "Connectez-vous, puis demandez l'activation grossiste.";
            }
        }
        espaceBtn.addEventListener('click', () => {
            const user   = (typeof Auth !== 'undefined') ? Auth.currentUser() : null;
            const isGros = (typeof Auth !== 'undefined' && Auth.isGrossiste) ? Auth.isGrossiste() : false;
            if (isGros) {
                document.getElementById('produits')?.scrollIntoView({ behavior: 'smooth' });
            } else if (user) {
                const wa = (typeof CONFIG !== 'undefined' && CONFIG.whatsappNumber) ? CONFIG.whatsappNumber : '14384029247';
                const region = (typeof Region !== 'undefined' && Region.get) ? (Region.get() || '') : '';
                const msg = `Bonjour, je souhaite activer un compte GROSSISTE (portail ${region}). Mon compte : ${user.email || user.username || ''}`;
                window.open(`https://wa.me/${wa}?text=${encodeURIComponent(msg)}`, '_blank');
            } else if (typeof Auth !== 'undefined') {
                Auth.openModal();
            }
        });
        document.addEventListener('auth:changed', updateEspaceGros);
        updateEspaceGros();
    }

});
