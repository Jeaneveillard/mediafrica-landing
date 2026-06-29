const Auth = (() => {
    let _user          = null;
    let _pendingAction = null;
    let _initialized   = false;
    const STORAGE_KEY  = 'ssc_users';
    const SESSION_KEY  = 'ssc_session';

    /* ── Utilitaires ── */
    function _esc(str) {
        return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    function _hash(str) {
        let h = 0;
        for (let i = 0; i < str.length; i++) h = Math.imul(31, h) + str.charCodeAt(i) | 0;
        return h.toString(36);
    }

    function _getUsers() {
        try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
    }
    function _saveUsers(users) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
    }
    function _getSession() {
        try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch { return null; }
    }
    function _saveSession(user) {
        if (user) localStorage.setItem(SESSION_KEY, JSON.stringify(user));
        else localStorage.removeItem(SESSION_KEY);
    }

    function _setError(id, msg) {
        const el = document.getElementById(id);
        if (el) { el.textContent = msg || ''; el.style.color = msg ? '#dc2626' : ''; }
    }
    function _setSuccess(id, msg) {
        const el = document.getElementById(id);
        if (el) { el.textContent = msg || ''; el.style.color = '#16a34a'; }
    }

    /* ── Notifie les autres modules (Pricing…) d'un changement d'auth ── */
    function _notifyAuthChange(user) {
        document.dispatchEvent(new CustomEvent('auth:changed', { detail: { user: user || null } }));
    }

    /* ── L'utilisateur connecté est-il l'administrateur ? ── */
    function _isAdmin(user) {
        if (!user) return false;
        const ae = (typeof CONFIG !== 'undefined' && CONFIG.adminEmail)    ? CONFIG.adminEmail.toLowerCase()    : '';
        const au = (typeof CONFIG !== 'undefined' && CONFIG.adminUsername) ? CONFIG.adminUsername.toLowerCase() : '';
        return (!!ae && (user.email || '').toLowerCase() === ae)
            || (!!au && (user.username || '').toLowerCase() === au);
    }

    function _getAdminSession() {
        try { return JSON.parse(localStorage.getItem('ssc_admin_session') || 'null'); } catch { return null; }
    }

    /* ── Navbar ── */
    function _updateNavbar(user) {
        _notifyAuthChange(user);
        const wrap = document.getElementById('navAccountWrap');
        if (!wrap) return;
        const btn      = wrap.querySelector('.nav-account-btn');
        const dropdown = wrap.querySelector('.account-dropdown');
        if (!btn || !dropdown) return;

        // L'admin connecté (session admin) a la priorité d'affichage
        const admin = _getAdminSession();
        if (admin && admin.email) {
            btn.innerHTML = `<i class="fa-solid fa-user-shield"></i><span class="nav-account-label">Admin</span>`;
            btn.classList.add('logged-in', 'is-admin');
            btn.classList.remove('is-grossiste');
            dropdown.innerHTML = `
                <span class="account-greeting">Connecté en <strong>Administrateur</strong> 🛡️</span>
                <a href="admin.html"><i class="fa-solid fa-gauge-high"></i> Tableau de bord</a>
                <button type="button" data-action="logout-admin">
                    <i class="fa-solid fa-right-from-bracket"></i> Déconnexion admin
                </button>`;
            return;
        }
        btn.classList.remove('is-admin');

        if (user) {
            const admin = _isAdmin(user);
            const name = _esc(user.username || user.displayName || user.email.split('@')[0]);
            const badge = admin
                ? ' <span class="admin-badge">Admin</span>'
                : (user.isGrossiste ? ' <span class="grossiste-badge">Grossiste</span>' : '');
            const adminLink = admin
                ? '<a href="admin.html"><i class="fa-solid fa-shield-halved"></i> Panneau Admin</a>'
                : '';
            btn.innerHTML = `<i class="fa-solid fa-circle-user"></i><span class="nav-account-label">${name}</span>${badge}`;
            btn.classList.toggle('is-grossiste', !!user.isGrossiste && !admin);
            btn.classList.toggle('is-admin', admin);
            btn.classList.add('logged-in');
            dropdown.innerHTML = `
                <span class="account-greeting">Bonjour, <strong>${name}</strong> 👋${badge}</span>
                ${adminLink}
                <a href="mon-compte.html"><i class="fa-solid fa-user"></i> Mon Compte</a>
                <button type="button" data-action="logout">
                    <i class="fa-solid fa-right-from-bracket"></i> Se déconnecter
                </button>`;
        } else {
            btn.innerHTML = `<i class="fa-solid fa-right-to-bracket"></i><span class="nav-account-label">Se connecter</span>`;
            btn.classList.remove('logged-in', 'is-grossiste', 'is-admin');
            dropdown.innerHTML = '';
        }
    }

    /* ── Modal ── */
    function openModal(action) {
        _pendingAction = action || null;
        _switchTab('login');
        document.getElementById('authModal')?.classList.add('open');
        document.getElementById('authBackdrop')?.classList.add('open');
        document.body.style.overflow = 'hidden';
    }
    function closeModal() {
        document.getElementById('authModal')?.classList.remove('open');
        document.getElementById('authBackdrop')?.classList.remove('open');
        document.body.style.overflow = '';
        ['loginError','registerError','resetError','resetSuccess'].forEach(id => _setError(id, ''));
        const rs = document.getElementById('resetSection');
        if (rs) rs.classList.add('auth-form--hidden');
        const tabs = document.getElementById('authTabsWrap');
        if (tabs) tabs.style.display = '';
        document.getElementById('loginForm')?.classList.remove('auth-form--hidden');
    }
    function _switchTab(tab) {
        document.querySelectorAll('.auth-tab').forEach(t =>
            t.classList.toggle('active', t.dataset.tab === tab)
        );
        const lf = document.getElementById('loginForm');
        const rf = document.getElementById('registerForm');
        if (lf) lf.classList.toggle('auth-form--hidden', tab !== 'login');
        if (rf) rf.classList.toggle('auth-form--hidden', tab !== 'register');
        const rs = document.getElementById('resetSection');
        if (rs) rs.classList.add('auth-form--hidden');
        const tabs = document.getElementById('authTabsWrap');
        if (tabs) tabs.style.display = '';
    }

    function _togglePwd(inputId, btn) {
        const input = document.getElementById(inputId);
        if (!input) return;
        const show = input.type === 'password';
        input.type = show ? 'text' : 'password';
        btn.innerHTML = show ? '<i class="fa-solid fa-eye-slash"></i>' : '<i class="fa-solid fa-eye"></i>';
    }

    /* ── Injection HTML ── */
    function _injectHTML() {
        if (document.getElementById('authModal')) return;
        document.body.insertAdjacentHTML('beforeend', `
        <div class="auth-backdrop" id="authBackdrop"></div>
        <div class="auth-modal" id="authModal" role="dialog" aria-modal="true">
            <button type="button" class="auth-close" id="authClose" aria-label="Fermer">
                <i class="fa-solid fa-xmark"></i>
            </button>
            <div class="auth-brand">
                <img src="assets/logo-ssc.png" alt="Solutions Santé Canada" class="auth-logo">
            </div>
            <div class="auth-tabs" id="authTabsWrap">
                <button type="button" class="auth-tab active" data-tab="login">Se connecter</button>
                <button type="button" class="auth-tab" data-tab="register">Créer un compte</button>
            </div>

            <button type="button" class="btn-google" id="btnGoogle">
                <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
                Continuer avec Google
            </button>
            <div class="auth-divider"><span>ou</span></div>

            <!-- CONNEXION -->
            <form class="auth-form" id="loginForm" novalidate>
                <div class="auth-group">
                    <label for="loginEmail">Email ou nom d'utilisateur</label>
                    <input type="text" id="loginEmail" required placeholder="votre@email.com ou @username" autocomplete="username">
                </div>
                <div class="auth-group">
                    <label for="loginPassword">Mot de passe</label>
                    <div class="pwd-wrap">
                        <input type="password" id="loginPassword" required placeholder="••••••••" autocomplete="current-password">
                        <button type="button" class="pwd-toggle" data-target="loginPassword" aria-label="Voir le mot de passe">
                            <i class="fa-solid fa-eye"></i>
                        </button>
                    </div>
                </div>
                <button type="button" class="auth-forgot" id="btnForgot">Mot de passe oublié ?</button>
                <p class="auth-error" id="loginError"></p>
                <button type="submit" class="btn-auth">Se connecter</button>
            </form>

            <!-- INSCRIPTION -->
            <form class="auth-form auth-form--hidden" id="registerForm" novalidate>
                <div class="auth-group">
                    <label for="regName">Nom complet</label>
                    <input type="text" id="regName" required placeholder="Jean Dupont" autocomplete="name">
                </div>
                <div class="auth-group">
                    <label for="regUsername">Nom d'utilisateur <span class="auth-hint">(@username)</span></label>
                    <input type="text" id="regUsername" required placeholder="jean_dupont" autocomplete="username" pattern="[a-zA-Z0-9._-]{3,20}">
                    <span class="auth-field-hint">3-20 caractères · lettres, chiffres, . _ -</span>
                </div>
                <div class="auth-group">
                    <label for="regEmail">Email</label>
                    <input type="email" id="regEmail" required placeholder="votre@email.com" autocomplete="email">
                </div>
                <div class="auth-group">
                    <label for="regPassword">Mot de passe</label>
                    <div class="pwd-wrap">
                        <input type="password" id="regPassword" required placeholder="Minimum 6 caractères" minlength="6" autocomplete="new-password">
                        <button type="button" class="pwd-toggle" data-target="regPassword" aria-label="Voir le mot de passe">
                            <i class="fa-solid fa-eye"></i>
                        </button>
                    </div>
                </div>
                <p class="auth-error" id="registerError"></p>
                <button type="submit" class="btn-auth">Créer mon compte</button>
            </form>

            <!-- MOT DE PASSE OUBLIÉ -->
            <div class="auth-form auth-form--hidden" id="resetSection">
                <button type="button" class="auth-back" id="btnBackLogin">
                    <i class="fa-solid fa-arrow-left"></i> Retour à la connexion
                </button>
                <h3 class="reset-title">Mot de passe oublié ?</h3>
                <p class="reset-desc">Entrez votre email pour recevoir un lien de réinitialisation.</p>
                <div class="auth-group">
                    <label for="resetEmail">Email</label>
                    <input type="email" id="resetEmail" placeholder="votre@email.com" autocomplete="email">
                </div>
                <p class="auth-error" id="resetError"></p>
                <p class="auth-success" id="resetSuccess"></p>
                <button type="button" class="btn-auth" id="btnSendReset">Envoyer le lien</button>
            </div>
        </div>`);
    }

    /* ── Logique auth locale ── */
    function _register(name, username, email, password) {
        const users = _getUsers();
        const emailKey    = 'email:' + email.toLowerCase();
        const usernameKey = 'user:'  + username.toLowerCase();

        if (users[emailKey])    return { error: 'Un compte existe déjà avec cet email.' };
        if (users[usernameKey]) return { error: 'Ce nom d\'utilisateur est déjà pris.' };
        if (password.length < 6) return { error: 'Mot de passe trop court (minimum 6 caractères).' };
        if (!/^[a-zA-Z0-9._-]{3,20}$/.test(username))
            return { error: 'Username : 3-20 caractères, lettres, chiffres, . _ - uniquement.' };

        const record = { displayName: name, username, email, pwd: _hash(password), isGrossiste: false, createdAt: Date.now() };
        users[emailKey]    = record;
        users[usernameKey] = record; // double index pour retrouver par username
        _saveUsers(users);
        const user = { displayName: name, username, email, isGrossiste: false };
        _saveSession(user);
        return { user };
    }

    function _login(identifier, password) {
        const users = _getUsers();
        // Cherche par email ou par username
        const isEmail = identifier.includes('@');
        const key     = isEmail ? 'email:' + identifier.toLowerCase() : 'user:' + identifier.toLowerCase();
        const found   = users[key];
        if (!found) return { error: isEmail ? 'Aucun compte avec cet email.' : 'Nom d\'utilisateur introuvable.' };
        if (found.pwd !== _hash(password)) return { error: 'Mot de passe incorrect.' };
        const user = { displayName: found.displayName, username: found.username, email: found.email, isGrossiste: !!found.isGrossiste };
        _saveSession(user);
        return { user };
    }

    function _logout() {
        _saveSession(null);
        _user = null;
        _updateNavbar(null);
    }

    /* ── Câblage événements ── */
    function _wireEvents() {
        document.getElementById('authClose')?.addEventListener('click', closeModal);
        document.getElementById('authBackdrop')?.addEventListener('click', closeModal);
        document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

        document.querySelectorAll('.auth-tab').forEach(tab =>
            tab.addEventListener('click', () => _switchTab(tab.dataset.tab))
        );

        document.querySelectorAll('.pwd-toggle').forEach(btn =>
            btn.addEventListener('click', () => _togglePwd(btn.dataset.target, btn))
        );

        // Bouton compte nav
        document.getElementById('accountToggle')?.addEventListener('click', e => {
            e.stopPropagation();
            const admin = _getAdminSession();
            if (!_user && !(admin && admin.email)) { openModal(); return; }
            document.getElementById('accountDropdown')?.classList.toggle('open');
        });
        document.addEventListener('click', e => {
            if (!e.target.closest('#navAccountWrap'))
                document.getElementById('accountDropdown')?.classList.remove('open');
        });

        // Logout
        document.addEventListener('click', e => {
            if (e.target.closest('[data-action="logout"]')) _logout();
            if (e.target.closest('[data-action="logout-admin"]')) {
                localStorage.removeItem('ssc_admin_session');
                document.getElementById('accountDropdown')?.classList.remove('open');
                _updateNavbar(_user);
            }
        });

        // Mot de passe oublié
        document.getElementById('btnForgot')?.addEventListener('click', () => {
            document.getElementById('loginForm').classList.add('auth-form--hidden');
            document.getElementById('authTabsWrap').style.display = 'none';
            document.getElementById('resetSection').classList.remove('auth-form--hidden');
        });
        document.getElementById('btnBackLogin')?.addEventListener('click', () => {
            document.getElementById('resetSection').classList.add('auth-form--hidden');
            document.getElementById('authTabsWrap').style.display = '';
            document.getElementById('loginForm').classList.remove('auth-form--hidden');
            _setError('resetError', ''); _setSuccess('resetSuccess', '');
        });

        // Google (simulation locale)
        document.getElementById('btnGoogle')?.addEventListener('click', () => {
            const name  = prompt('Connexion Google simulée\nEntrez votre nom :');
            const email = prompt('Entrez votre email Google :');
            if (!name || !email) return;
            const users = _getUsers();
            const key   = email.toLowerCase();
            if (!users[key]) {
                users[key] = { displayName: name, email, pwd: null, provider: 'google', isGrossiste: false, createdAt: Date.now() };
                _saveUsers(users);
            }
            const user = { displayName: users[key].displayName, email, isGrossiste: !!users[key].isGrossiste };
            _saveSession(user);
            _user = user;
            _updateNavbar(user);
            closeModal();
            if (_pendingAction === 'checkout' && typeof Cart !== 'undefined') Cart.openPanel();
        });

        // Réinitialisation MDP
        document.getElementById('btnSendReset')?.addEventListener('click', () => {
            _setError('resetError', ''); _setSuccess('resetSuccess', '');
            const email = document.getElementById('resetEmail').value.trim();
            if (!email) { _setError('resetError', 'Entrez votre adresse email.'); return; }
            const users = _getUsers();
            if (!users[email.toLowerCase()]) {
                _setError('resetError', 'Aucun compte trouvé avec cet email.');
                return;
            }
            // En mode local : on affiche le MDP directement (pas d'email réel)
            _setSuccess('resetSuccess', '✅ Votre mot de passe a été réinitialisé. Veuillez contacter le support via WhatsApp pour le récupérer.');
        });

        // CONNEXION
        document.getElementById('loginForm')?.addEventListener('submit', e => {
            e.preventDefault();
            _setError('loginError', '');
            const email    = document.getElementById('loginEmail').value.trim();
            const password = document.getElementById('loginPassword').value;
            const result   = _login(email, password);
            if (result.error) { _setError('loginError', result.error); return; }
            _user = result.user;
            _updateNavbar(_user);
            closeModal();
            if (_pendingAction === 'checkout' && typeof Cart !== 'undefined') Cart.openPanel();
        });

        // INSCRIPTION
        document.getElementById('registerForm')?.addEventListener('submit', e => {
            e.preventDefault();
            _setError('registerError', '');
            const name     = document.getElementById('regName').value.trim();
            const username = document.getElementById('regUsername').value.trim();
            const email    = document.getElementById('regEmail').value.trim();
            const password = document.getElementById('regPassword').value;
            if (!name)     { _setError('registerError', 'Entrez votre nom complet.'); return; }
            if (!username) { _setError('registerError', 'Choisissez un nom d\'utilisateur.'); return; }
            if (!email)    { _setError('registerError', 'Entrez votre email.'); return; }
            const result = _register(name, username, email, password);
            if (result.error) { _setError('registerError', result.error); return; }
            _user = result.user;
            _updateNavbar(_user);
            closeModal();
            if (_pendingAction === 'checkout' && typeof Cart !== 'undefined') Cart.openPanel();
        });
    }

    /* ── Init ── */
    function init() {
        if (_initialized) return;
        _initialized = true;
        _injectHTML();
        _wireEvents();

        // Restaurer session (+ resynchroniser le statut grossiste depuis le compte stocké)
        const session = _getSession();
        if (session) {
            _user = session;
            if (session.email) {
                const users = _getUsers();
                const rec = users['email:' + session.email.toLowerCase()] || users[session.email.toLowerCase()];
                if (rec) {
                    _user.isGrossiste = !!rec.isGrossiste;
                    _saveSession(_user);
                }
            }
        }
        // Toujours rafraîchir l'entête (reflète aussi une session admin active)
        _updateNavbar(_user);

        // Firebase (si configuré, il prend le relais)
        if (typeof firebase !== 'undefined' && firebase.apps.length) {
            firebase.auth().onAuthStateChanged(fbUser => {
                if (fbUser) {
                    _user = { displayName: fbUser.displayName, email: fbUser.email };
                    _saveSession(_user);
                    _updateNavbar(_user);
                }
            });
        }
    }

    function currentUser() { return _user; }
    function isGrossiste() { return !!(_user && _user.isGrossiste); }
    function isAdmin() { return _isAdmin(_user); }

    return { init, openModal, closeModal, currentUser, isGrossiste, isAdmin };
})();

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => Auth.init());
} else {
    Auth.init();
}
