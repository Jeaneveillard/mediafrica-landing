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
        document.getElementById('resendVerifyWrap')?.classList.add('auth-form--hidden');
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

    /* ── Injecte le bouton compte dans l'entête s'il n'existe pas (pages secondaires) ── */
    function _ensureNavAccount() {
        if (document.getElementById('navAccountWrap')) return;
        const navInner = document.querySelector('.nav-inner');
        if (!navInner) return;
        let actions = navInner.querySelector('.nav-actions');
        if (!actions) {
            actions = document.createElement('div');
            actions.className = 'nav-actions';
            const hamburger = navInner.querySelector('.hamburger');
            if (hamburger) navInner.insertBefore(actions, hamburger);
            else navInner.appendChild(actions);
        }
        const wrap = document.createElement('div');
        wrap.className = 'nav-account';
        wrap.id = 'navAccountWrap';
        wrap.innerHTML = `
            <button type="button" class="nav-account-btn" id="accountToggle" aria-label="Mon compte">
                <i class="fa-solid fa-right-to-bracket"></i>
                <span class="nav-account-label">Se connecter</span>
            </button>
            <div class="account-dropdown" id="accountDropdown"></div>`;
        actions.appendChild(wrap);
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
                <div id="resendVerifyWrap" class="auth-form--hidden">
                    <button type="button" class="auth-forgot" id="btnResendVerify">Renvoyer l'email de confirmation</button>
                </div>
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
                <div class="auth-group">
                    <label>Je m'inscris en tant que</label>
                    <div class="status-choice">
                        <label class="status-opt">
                            <input type="radio" name="regStatus" value="client" checked>
                            <span><i class="fa-solid fa-user"></i> Client <small>(à l'unité)</small></span>
                        </label>
                        <label class="status-opt">
                            <input type="radio" name="regStatus" value="grossiste">
                            <span><i class="fa-solid fa-store"></i> Grossiste <small>(prix de gros)</small></span>
                        </label>
                    </div>
                </div>
                <!-- Champs supplémentaires pour les grossistes -->
                <div id="regGrossistFields" style="display:none">
                    <div class="gros-section-title">Informations de l'entreprise</div>
                    <div class="auth-group">
                        <label for="regEtablissement">Nom de l'établissement / entreprise <span style="color:#dc2626">*</span></label>
                        <input type="text" id="regEtablissement" placeholder="Pharmacie Centrale, Mag Santé…">
                    </div>
                    <div class="auth-group">
                        <label for="regNumEntreprise">Numéro de l'entreprise (NEQ / Matricule) <span style="color:#dc2626">*</span></label>
                        <input type="text" id="regNumEntreprise" placeholder="ex : 1234567890">
                    </div>
                    <div class="auth-group">
                        <label for="regTelPro">Téléphone professionnel <span style="color:#dc2626">*</span></label>
                        <input type="tel" id="regTelPro" placeholder="+1 438 000 0000">
                    </div>
                    <div class="auth-group">
                        <label for="regAdresse">Adresse de l'entreprise <span style="color:#dc2626">*</span></label>
                        <input type="text" id="regAdresse" placeholder="123 rue Principale">
                    </div>
                    <div class="auth-group">
                        <label for="regVille">Ville <span style="color:#dc2626">*</span></label>
                        <input type="text" id="regVille" placeholder="Montréal, Conakry…">
                    </div>
                    <div class="auth-group">
                        <label for="regProvince">Province / État <span style="color:#dc2626">*</span></label>
                        <input type="text" id="regProvince" placeholder="Québec, Ontario, Conakry…">
                    </div>
                    <div class="auth-group">
                        <label for="regPays">Pays <span style="color:#dc2626">*</span></label>
                        <select id="regPays">
                            <option value="" disabled selected>Choisir un pays</option>
                            <option>Canada</option>
                            <option>Guinée Conakry</option>
                            <option>Burkina Faso</option>
                            <option>Côte d'Ivoire</option>
                            <option>Autre</option>
                        </select>
                    </div>
                    <div class="auth-group">
                        <label for="regLicence">Numéro de licence pharmaceutique / agrément</label>
                        <input type="text" id="regLicence" placeholder="Optionnel — ex : QC-PHR-12345">
                    </div>
                    <div class="auth-group">
                        <label for="regSiteWeb">Site web</label>
                        <input type="url" id="regSiteWeb" placeholder="Optionnel — https://votresite.com">
                    </div>
                    <p class="auth-field-hint" style="color:#B45309;background:#FEF3C7;padding:.6rem .85rem;border-radius:8px;margin-top:.5rem">
                        <i class="fa-solid fa-clock"></i> Votre compte sera activé sous 24h après vérification par notre équipe.
                    </p>
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
    function _register(name, username, email, password, isGrossiste, grosInfo) {
        grosInfo = grosInfo || {};
        const users = _getUsers();
        const emailKey    = 'email:' + email.toLowerCase();
        const usernameKey = 'user:'  + username.toLowerCase();

        if (users[emailKey])    return { error: 'Un compte existe déjà avec cet email.' };
        if (users[usernameKey]) return { error: 'Ce nom d\'utilisateur est déjà pris.' };
        if (password.length < 6) return { error: 'Mot de passe trop court (minimum 6 caractères).' };
        if (!/^[a-zA-Z0-9._-]{3,20}$/.test(username))
            return { error: 'Username : 3-20 caractères, lettres, chiffres, . _ - uniquement.' };
        // Identité admin réservée : empêche l'usurpation du badge/lien Admin
        const _ae = (typeof CONFIG !== 'undefined' && CONFIG.adminEmail)    ? CONFIG.adminEmail.toLowerCase()    : '';
        const _au = (typeof CONFIG !== 'undefined' && CONFIG.adminUsername) ? CONFIG.adminUsername.toLowerCase() : '';
        if ((_ae && email.toLowerCase() === _ae) || (_au && username.toLowerCase() === _au))
            return { error: 'Cet identifiant est réservé.' };

        // grossisteValidated = false : l'admin doit valider avant que les prix gros s'affichent
        const record = {
            displayName: name, username, email, pwd: _hash(password),
            isGrossiste: !!isGrossiste, grossisteValidated: false,
            etablissement:    grosInfo.etablissement    || '',
            numeroEntreprise: grosInfo.numeroEntreprise || '',
            telephonePro:     grosInfo.telephonePro     || '',
            adresse:          grosInfo.adresse          || '',
            ville:            grosInfo.ville            || '',
            province:         grosInfo.province         || '',
            pays:             grosInfo.pays             || '',
            licence:          grosInfo.licence           || '',
            siteWeb:          grosInfo.siteWeb           || '',
            createdAt: Date.now()
        };
        users[emailKey]    = record;
        users[usernameKey] = record;
        _saveUsers(users);
        const user = {
            displayName: name, username, email,
            isGrossiste: !!isGrossiste, grossisteValidated: false,
            etablissement: record.etablissement, numeroEntreprise: record.numeroEntreprise
        };
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
        const user = {
            displayName: found.displayName, username: found.username, email: found.email,
            isGrossiste: !!found.isGrossiste, grossisteValidated: !!found.grossisteValidated,
            etablissement: found.etablissement||'', numeroEntreprise: found.numeroEntreprise||''
        };
        _saveSession(user);
        return { user };
    }

    /* ──────────────────────────────────────────────
       FIREBASE — actif dès que les clés sont dans config.js.
       Permet la connexion sur TOUS les appareils (comptes
       partagés via Firebase Auth + profils dans Firestore).
       Tant que les clés sont absentes, on garde localStorage.
       ────────────────────────────────────────────── */
    function _fbReady() {
        return typeof firebase !== 'undefined'
            && firebase.apps && firebase.apps.length > 0;
    }

    // L'identifiant correspond-il au compte admin réservé ? (toujours via localStorage)
    function _looksLikeAdmin(identifier) {
        const id = (identifier || '').toLowerCase();
        const ae = (typeof CONFIG !== 'undefined' && CONFIG.adminEmail)    ? CONFIG.adminEmail.toLowerCase()    : '';
        const au = (typeof CONFIG !== 'undefined' && CONFIG.adminUsername) ? CONFIG.adminUsername.toLowerCase() : '';
        return (!!ae && id === ae) || (!!au && id === au);
    }

    // Traduit les codes d'erreur Firebase en messages français
    function _fbError(e) {
        const c = (e && e.code) || '';
        switch (c) {
            case 'auth/email-already-in-use': return 'Un compte existe déjà avec cet email.';
            case 'auth/invalid-email':        return 'Adresse email invalide.';
            case 'auth/weak-password':        return 'Mot de passe trop court (minimum 6 caractères).';
            case 'auth/user-not-found':       return 'Aucun compte avec cet email.';
            case 'auth/wrong-password':
            case 'auth/invalid-credential':   return 'Mot de passe incorrect.';
            case 'auth/too-many-requests':    return 'Trop de tentatives. Réessayez plus tard.';
            case 'auth/network-request-failed': return 'Problème de connexion réseau.';
            default: return (e && e.message) ? e.message : 'Une erreur est survenue.';
        }
    }

    // Inscription Firebase : crée le compte Auth + le profil Firestore (collection "users")
    async function _fbRegister(name, username, email, password, isGrossiste, grosInfo) {
        grosInfo = grosInfo || {};
        if (!/^[a-zA-Z0-9._-]{3,20}$/.test(username))
            return { error: 'Username : 3-20 caractères, lettres, chiffres, . _ - uniquement.' };
        if (_looksLikeAdmin(email) || _looksLikeAdmin(username))
            return { error: 'Cet identifiant est réservé.' };
        try {
            const db = firebase.firestore();
            // Unicité du username (l'email est déjà unique côté Firebase Auth)
            const dup = await db.collection('users').where('username', '==', username.toLowerCase()).limit(1).get();
            if (!dup.empty) return { error: 'Ce nom d\'utilisateur est déjà pris.' };

            const cred = await firebase.auth().createUserWithEmailAndPassword(email, password);
            const uid  = cred.user.uid;
            try { await cred.user.updateProfile({ displayName: name }); } catch (_) {}

            const profile = {
                uid,
                displayName:      name,
                username:         username.toLowerCase(),  // pour la recherche
                usernameDisplay:  username,                // tel que saisi
                email:            email.toLowerCase(),
                isGrossiste:      !!isGrossiste,
                grossisteValidated: false,                 // l'admin doit valider
                etablissement:    grosInfo.etablissement    || '',
                numeroEntreprise: grosInfo.numeroEntreprise || '',
                telephonePro:     grosInfo.telephonePro     || '',
                adresse:          grosInfo.adresse          || '',
                ville:            grosInfo.ville            || '',
                province:         grosInfo.province         || '',
                pays:             grosInfo.pays             || '',
                licence:          grosInfo.licence          || '',
                siteWeb:          grosInfo.siteWeb          || '',
                provider:         'email',
                createdAt:        firebase.firestore.FieldValue.serverTimestamp()
            };
            await db.collection('users').doc(uid).set(profile);

            // Confirmation d'email : on envoie le lien et on NE connecte PAS le client.
            // Il devra cliquer le lien reçu par email avant de pouvoir se connecter.
            try { await cred.user.sendEmailVerification(); } catch (_) {}
            try { await firebase.auth().signOut(); } catch (_) {}
            return { pendingVerification: true, email };
        } catch (e) {
            return { error: _fbError(e) };
        }
    }

    // Connexion Firebase : accepte email OU username (résolu via Firestore)
    async function _fbLogin(identifier, password) {
        try {
            const db = firebase.firestore();
            let email = identifier;
            if (!identifier.includes('@')) {
                const snap = await db.collection('users').where('username', '==', identifier.toLowerCase()).limit(1).get();
                if (snap.empty) return { error: 'Nom d\'utilisateur introuvable.' };
                email = snap.docs[0].data().email;
            }
            const cred = await firebase.auth().signInWithEmailAndPassword(email, password);
            // Bloquer tant que l'email n'est pas confirmé (connexion Google exemptée : emailVerified=true)
            if (!cred.user.emailVerified) {
                const unverifiedEmail = cred.user.email;
                try { await firebase.auth().signOut(); } catch (_) {}
                return { unverified: true, email: unverifiedEmail };
            }
            const uid  = cred.user.uid;
            let d = {};
            try { const doc = await db.collection('users').doc(uid).get(); if (doc.exists) d = doc.data(); } catch (_) {}
            const user = {
                uid,
                displayName: d.displayName || cred.user.displayName || '',
                username:    d.usernameDisplay || d.username || '',
                email:       cred.user.email,
                isGrossiste: !!d.isGrossiste,
                grossisteValidated: !!d.grossisteValidated,
                etablissement: d.etablissement || '', numeroEntreprise: d.numeroEntreprise || ''
            };
            _user = user; _saveSession(user);
            return { user };
        } catch (e) {
            return { error: _fbError(e) };
        }
    }

    // Affiche le bouton « Renvoyer l'email » et mémorise l'email concerné
    let _pendingVerifyEmail = null;
    function _showResendVerification(email) {
        _pendingVerifyEmail = email || null;
        document.getElementById('resendVerifyWrap')?.classList.remove('auth-form--hidden');
    }
    function _hideResendVerification() {
        _pendingVerifyEmail = null;
        document.getElementById('resendVerifyWrap')?.classList.add('auth-form--hidden');
    }

    // Renvoie l'email de vérification : reconnecte silencieusement, renvoie le lien, déconnecte
    async function _resendVerification(identifier, password) {
        if (!_fbReady()) return { error: 'Indisponible en mode local.' };
        try {
            const db = firebase.firestore();
            let email = identifier;
            if (!identifier.includes('@')) {
                const snap = await db.collection('users').where('username', '==', identifier.toLowerCase()).limit(1).get();
                if (snap.empty) return { error: 'Compte introuvable.' };
                email = snap.docs[0].data().email;
            }
            const cred = await firebase.auth().signInWithEmailAndPassword(email, password);
            await cred.user.sendEmailVerification();
            try { await firebase.auth().signOut(); } catch (_) {}
            return { ok: true, email };
        } catch (e) { return { error: _fbError(e) }; }
    }

    function _logout() {
        if (_fbReady()) { try { firebase.auth().signOut(); } catch (_) {} }
        _saveSession(null);
        _user = null;
        _updateNavbar(null);
    }

    /* ── Après connexion : diriger selon le statut ── */
    function _afterAuthSuccess() {
        closeModal();
        if (_pendingAction === 'checkout' && typeof Cart !== 'undefined') {
            Cart.openPanel();
            return;
        }
        if (_pendingAction === 'review' && typeof Reviews !== 'undefined') {
            Reviews.openModal();
            return;
        }
        // Admin → tableau de bord
        if (_isAdmin(_user)) {
            // Ouvre aussi la session du panneau admin → évite un 2e login sur admin.html
            const ae = (typeof CONFIG !== 'undefined' && CONFIG.adminEmail)    ? CONFIG.adminEmail    : (_user.email || '');
            const au = (typeof CONFIG !== 'undefined' && CONFIG.adminUsername) ? CONFIG.adminUsername : (_user.username || '');
            try { localStorage.setItem('ssc_admin_session', JSON.stringify({ email: ae, username: au, loginAt: Date.now() })); } catch (_) {}
            location.href = 'admin.html';
            return;
        }
        // Client / grossiste → catalogue (prix adaptés au statut)
        if (!/catalogue\.html(\?|#|$)/.test(location.pathname + location.search)) {
            location.href = 'catalogue.html';
        }
    }

    /* ── Câblage événements ── */
    function _wireEvents() {
        document.getElementById('authClose')?.addEventListener('click', closeModal);
        document.getElementById('authBackdrop')?.addEventListener('click', closeModal);
        document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

        document.querySelectorAll('.auth-tab').forEach(tab =>
            tab.addEventListener('click', () => _switchTab(tab.dataset.tab))
        );

        // Affiche/masque les champs grossiste selon le statut choisi
        document.querySelectorAll('input[name="regStatus"]').forEach(radio => {
            radio.addEventListener('change', () => {
                const gf = document.getElementById('regGrossistFields');
                if (gf) gf.style.display = radio.value === 'grossiste' ? 'block' : 'none';
            });
        });

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
                // Déconnexion complète : on vide aussi la session régulière, sinon
                // l'ancien username (admin ou utilisateur précédent) refait surface.
                _logout();
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

        // Renvoyer l'email de confirmation
        document.getElementById('btnResendVerify')?.addEventListener('click', async () => {
            const identifier = document.getElementById('loginEmail').value.trim();
            const password   = document.getElementById('loginPassword').value;
            if (!identifier || !password) {
                _setError('loginError', 'Entrez votre email et votre mot de passe, puis cliquez à nouveau.');
                return;
            }
            const btn = document.getElementById('btnResendVerify');
            const orig = btn.innerHTML;
            btn.disabled = true; btn.innerHTML = 'Envoi…';
            const res = await _resendVerification(identifier, password);
            btn.disabled = false; btn.innerHTML = orig;
            if (res.error) { _setError('loginError', res.error); return; }
            _setSuccess('loginError', '✅ Email renvoyé à ' + res.email + '. Vérifiez votre boîte mail.');
            _hideResendVerification();
        });

        // Google (vraie connexion via Firebase si configuré, sinon simulation locale)
        document.getElementById('btnGoogle')?.addEventListener('click', async () => {
            if (_fbReady()) {
                _setError('loginError', '');
                try {
                    const provider = new firebase.auth.GoogleAuthProvider();
                    const cred = await firebase.auth().signInWithPopup(provider);
                    const fbUser = cred.user;
                    const db = firebase.firestore();
                    const ref = db.collection('users').doc(fbUser.uid);
                    const doc = await ref.get();
                    if (!doc.exists) {
                        await ref.set({
                            uid: fbUser.uid, displayName: fbUser.displayName || '', email: (fbUser.email || '').toLowerCase(),
                            provider: 'google', isGrossiste: false, grossisteValidated: false,
                            createdAt: firebase.firestore.FieldValue.serverTimestamp()
                        });
                    }
                    const d = (doc.exists ? doc.data() : {}) || {};
                    _user = {
                        uid: fbUser.uid, displayName: fbUser.displayName || d.displayName || '',
                        username: d.usernameDisplay || d.username || '', email: fbUser.email,
                        isGrossiste: !!d.isGrossiste, grossisteValidated: !!d.grossisteValidated
                    };
                    _saveSession(_user); _updateNavbar(_user); _afterAuthSuccess();
                } catch (err) {
                    _setError('loginError', _fbError(err));
                }
                return;
            }
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
            _afterAuthSuccess();
        });

        // Réinitialisation MDP
        document.getElementById('btnSendReset')?.addEventListener('click', () => {
            _setError('resetError', ''); _setSuccess('resetSuccess', '');
            const email = document.getElementById('resetEmail').value.trim();
            if (!email) { _setError('resetError', 'Entrez votre adresse email.'); return; }
            // Firebase : envoie un vrai email de réinitialisation
            if (_fbReady()) {
                firebase.auth().sendPasswordResetEmail(email)
                    .then(() => _setSuccess('resetSuccess', '✅ Un email de réinitialisation a été envoyé à ' + email + '. Vérifiez votre boîte de réception.'))
                    .catch(err => _setError('resetError', _fbError(err)));
                return;
            }
            // Repli localStorage (pas d'email réel)
            const users = _getUsers();
            if (!users['email:' + email.toLowerCase()] && !users[email.toLowerCase()]) {
                _setError('resetError', 'Aucun compte trouvé avec cet email.');
                return;
            }
            _setSuccess('resetSuccess', '✅ Pour réinitialiser votre mot de passe, contactez le support via WhatsApp.');
        });

        // CONNEXION
        document.getElementById('loginForm')?.addEventListener('submit', async e => {
            e.preventDefault();
            _setError('loginError', '');
            const email    = document.getElementById('loginEmail').value.trim();
            const password = document.getElementById('loginPassword').value;
            const btn      = e.target.querySelector('button[type="submit"]');
            const orig     = btn ? btn.innerHTML : '';
            if (btn) { btn.disabled = true; btn.innerHTML = 'Connexion…'; }
            // Firebase si configuré (multi-appareils), sauf le compte admin réservé
            const result = (_fbReady() && !_looksLikeAdmin(email))
                ? await _fbLogin(email, password)
                : _login(email, password);
            if (btn) { btn.disabled = false; btn.innerHTML = orig; }
            if (result.unverified) {
                _setError('loginError', '⚠️ Votre email n\'est pas encore confirmé. Vérifiez votre boîte mail (et vos spams).');
                _showResendVerification(result.email);
                return;
            }
            if (result.error) { _setError('loginError', result.error); return; }
            _user = result.user;
            _updateNavbar(_user);
            _afterAuthSuccess();
        });

        // INSCRIPTION
        document.getElementById('registerForm')?.addEventListener('submit', async e => {
            e.preventDefault();
            _setError('registerError', '');
            const name     = document.getElementById('regName').value.trim();
            const username = document.getElementById('regUsername').value.trim();
            const email    = document.getElementById('regEmail').value.trim();
            const password = document.getElementById('regPassword').value;
            if (!name)     { _setError('registerError', 'Entrez votre nom complet.'); return; }
            if (!username) { _setError('registerError', 'Choisissez un nom d\'utilisateur.'); return; }
            if (!email)    { _setError('registerError', 'Entrez votre email.'); return; }
            const isGrossiste   = document.querySelector('input[name="regStatus"]:checked')?.value === 'grossiste';
            const val = id => (document.getElementById(id)?.value || '').trim();
            const grosInfo = {
                etablissement:    val('regEtablissement'),
                numeroEntreprise: val('regNumEntreprise'),
                telephonePro:     val('regTelPro'),
                adresse:          val('regAdresse'),
                ville:            val('regVille'),
                province:         val('regProvince'),
                pays:             val('regPays'),
                licence:          val('regLicence'),
                siteWeb:          val('regSiteWeb')
            };
            if (isGrossiste) {
                const required = { etablissement:'le nom de votre établissement', numeroEntreprise:'le numéro de votre entreprise',
                    telephonePro:'votre téléphone professionnel', adresse:'l\'adresse de votre entreprise',
                    ville:'votre ville', province:'votre province/état', pays:'votre pays' };
                for (const k in required) {
                    if (!grosInfo[k]) { _setError('registerError', 'Entrez ' + required[k] + '.'); return; }
                }
            }
            const btn  = e.target.querySelector('button[type="submit"]');
            const orig = btn ? btn.innerHTML : '';
            if (btn) { btn.disabled = true; btn.innerHTML = 'Création…'; }
            // Firebase si configuré (compte partagé multi-appareils), sinon localStorage
            const result = _fbReady()
                ? await _fbRegister(name, username, email, password, isGrossiste, grosInfo)
                : _register(name, username, email, password, isGrossiste, grosInfo);
            if (btn) { btn.disabled = false; btn.innerHTML = orig; }
            if (result.error) { _setError('registerError', result.error); return; }
            // Mode Firebase : compte créé mais email à confirmer → pas de connexion automatique.
            if (result.pendingVerification) {
                e.target.reset();
                _setSuccess('registerError', '✅ Compte créé ! Un email de confirmation a été envoyé à ' + result.email + '. Cliquez le lien pour activer votre compte, puis connectez-vous.');
                return;
            }
            _user = result.user;
            _updateNavbar(_user);
            if (typeof Notify !== 'undefined') Notify.inscription(_user);
            _afterAuthSuccess();
        });
    }

    /* ── Pré-crée les comptes essentiels si absents (incognito / nouveau navigateur) ── */
    function _seedAccounts() {
        const users = _getUsers();
        const ae = (typeof CONFIG !== 'undefined' && CONFIG.adminEmail) ? CONFIG.adminEmail.toLowerCase() : 'admin@medipharma.ca';
        const au = (typeof CONFIG !== 'undefined' && CONFIG.adminUsername) ? CONFIG.adminUsername.toLowerCase() : 'eltajoseph29';

        // Compte admin du site (même username/email que l'admin panel)
        if (!users['email:' + ae]) {
            const adminRec = {
                displayName: 'Admin MediPharma',
                username: au,
                email: ae,
                pwd: '-26f4um',        // hash de Ronyta2010 via _hash()
                isGrossiste: false,
                grossisteValidated: false,
                isAdminAccount: true,
                createdAt: 0
            };
            users['email:' + ae] = adminRec;
            users['user:' + au]  = adminRec;
            _saveUsers(users);
        }
    }

    /* ── Init ── */
    function init() {
        if (_initialized) return;
        _initialized = true;
        _seedAccounts();
        _ensureNavAccount();
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
                    _user.isGrossiste         = !!rec.isGrossiste;
                    _user.grossisteValidated  = !!rec.grossisteValidated;
                    _saveSession(_user);
                }
            }
        }
        // Toujours rafraîchir l'entête (reflète aussi une session admin active)
        _updateNavbar(_user);

        // Firebase (si configuré, il prend le relais : session valable sur tous les appareils)
        if (_fbReady()) {
            firebase.auth().onAuthStateChanged(async fbUser => {
                if (fbUser) {
                    let d = {};
                    try {
                        const doc = await firebase.firestore().collection('users').doc(fbUser.uid).get();
                        if (doc.exists) d = doc.data();
                    } catch (_) {}
                    _user = {
                        uid: fbUser.uid,
                        displayName: d.displayName || fbUser.displayName || '',
                        username:    d.usernameDisplay || d.username || '',
                        email:       fbUser.email,
                        isGrossiste: !!d.isGrossiste,
                        grossisteValidated: !!d.grossisteValidated,
                        etablissement: d.etablissement || '', numeroEntreprise: d.numeroEntreprise || ''
                    };
                    _saveSession(_user);
                    _updateNavbar(_user);
                }
            });
        }
    }

    function currentUser() { return _user; }
    // Prix de gros uniquement si l'admin a validé le compte (les deux flags requis)
    function isGrossiste() { return !!(_user && _user.isGrossiste && _user.grossisteValidated); }
    function isAdmin() { return _isAdmin(_user); }

    return { init, openModal, closeModal, currentUser, isGrossiste, isAdmin };
})();

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => Auth.init());
} else {
    Auth.init();
}
