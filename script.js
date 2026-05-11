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

    // Form submission → WhatsApp
    const form    = document.getElementById('orderForm');
    const success = document.getElementById('orderSuccess');
    form.addEventListener('submit', e => {
        e.preventDefault();
        const nom      = form.querySelector('input[type="text"]').value;
        const tel      = form.querySelector('input[type="tel"]').value;
        const pays     = form.querySelector('select').value;
        const produits = form.querySelector('textarea').value;
        const msg = `Nouvelle commande MediAfrica\n\nNom : ${nom}\nTél : ${tel}\nPays : ${pays}\nMédicaments : ${produits}`;
        window.open(`https://wa.me/14384029247?text=${encodeURIComponent(msg)}`, '_blank');
        form.style.display    = 'none';
        success.style.display = 'block';
    });

});
