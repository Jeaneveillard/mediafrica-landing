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
