document.addEventListener('DOMContentLoaded', () => {

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
});
