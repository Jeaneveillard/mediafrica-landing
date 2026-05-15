document.addEventListener('DOMContentLoaded', () => {

    // Navbar scroll
    const navbar = document.getElementById('navbar');
    window.addEventListener('scroll', () => {
        navbar.classList.toggle('scrolled', window.scrollY > 60);
    });

    // Hamburger menu
    const hamburger = document.getElementById('hamburger');
    const navLinks  = document.getElementById('navLinks');
    const spans     = hamburger.querySelectorAll('span');

    hamburger.addEventListener('click', () => {
        const open = navLinks.classList.toggle('open');
        spans[0].style.transform = open ? 'rotate(45deg) translate(5px, 5px)' : '';
        spans[1].style.opacity   = open ? '0' : '1';
        spans[2].style.transform = open ? 'rotate(-45deg) translate(5px, -5px)' : '';
    });

    navLinks.querySelectorAll('a').forEach(a => {
        a.addEventListener('click', () => {
            navLinks.classList.remove('open');
            spans.forEach(s => { s.style.transform = ''; s.style.opacity = '1'; });
        });
    });

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

    // Form submission → WhatsApp
    const form    = document.getElementById('orderForm');
    const success = document.getElementById('orderSuccess');
    if (!form) return;
    form.addEventListener('submit', e => {
        e.preventDefault();
        
        const formData = new FormData(form);
        const nom      = formData.get('nom');
        const tel      = formData.get('telephone');
        const email    = formData.get('email');
        const pays     = formData.get('pays');
        const produits = formData.get('message');

        // 1. Envoi vers Netlify (pour l'Email automatique)
        fetch("/", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams(formData).toString(),
        })
        .then(() => console.log("Formulaire envoyé avec succès à Netlify"))
        .catch((error) => console.error("Erreur Netlify:", error));

        // 2. Ouverture de WhatsApp
        const waNum = (typeof CONFIG !== 'undefined' && CONFIG.whatsappNumber) ? CONFIG.whatsappNumber : '14384029247';
        const msg = [
            '🛒 *Nouvelle commande MediAfrica (Formulaire)*',
            '',
            `👤 *Nom :* ${nom}`,
            `📞 *Tél :* ${tel}`,
            `✉️ *Email :* ${email}`,
            `📍 *Pays :* ${pays}`,
            '',
            '💊 *Médicaments souhaités :*',
            `${produits}`
        ].join('\n');

        window.open(`https://wa.me/${waNum}?text=${encodeURIComponent(msg)}`, '_blank');
        
        // 3. Interface
        form.style.display    = 'none';
        success.style.display = 'block';
    });

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

});
