# Confirmation d'email à l'inscription — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Exiger qu'un client confirme son adresse email (lien reçu par email) avant de pouvoir se connecter, via la vérification d'email native de Firebase Auth.

**Architecture:** Modification du module `auth.js` sur le **chemin Firebase uniquement** (`_fbReady()`). À l'inscription, on envoie l'email de vérification et on **ne connecte pas** le client. À la connexion, on **bloque** si `emailVerified === false`, avec un bouton « Renvoyer l'email ». Le chemin `localStorage` reste inchangé (aucun email possible sans backend). La fonctionnalité s'active automatiquement dès que les clés Firebase sont dans `config.js`.

**Tech Stack:** HTML/CSS/JS vanilla, Firebase v9 compat SDK (Auth + Firestore), localStorage.

## Global Constraints

- Aucun framework de test automatisé (site statique). Vérification = `node --check auth.js` (syntaxe) + outils `mcp__Claude_Preview__*` pour la régression du mode localStorage. **Le chemin Firebase ne peut PAS être testé localement** (Firebase non configuré dans le preview) : il se teste manuellement quand Elta aura branché ses clés — une checklist manuelle est fournie en Task 5.
- Ne jamais modifier le chemin `localStorage` (`_register`, `_login`) : l'inscription locale doit rester instantanée.
- Le compte admin réservé passe toujours par le chemin local (`!_looksLikeAdmin`) → ne doit jamais être affecté par la vérification d'email.
- Connexion Google : `emailVerified` est `true` par défaut → aucune barrière à ajouter.
- Style : réutiliser les classes CSS existantes (`auth-error`, `auth-form--hidden`, `btn-auth`, `auth-forgot`).

---

### Task 1: Inscription Firebase — envoyer l'email de confirmation et ne pas connecter

**Files:**
- Modify: `auth.js` (fonction `_fbRegister`, ~lignes 464-472 ; handler du formulaire d'inscription, ~lignes 718-727)

**Interfaces:**
- Consumes: `firebase.auth().createUserWithEmailAndPassword` (déjà utilisé), `cred.user.sendEmailVerification()`, `firebase.auth().signOut()`.
- Produces: `_fbRegister(...)` retourne désormais `{ pendingVerification: true, email }` en cas de succès (au lieu de `{ user }`), ou `{ error }` en cas d'échec.

- [ ] **Step 1: Modifier la fin de `_fbRegister` pour envoyer l'email et déconnecter**

Dans `auth.js`, remplacer ce bloc (juste après `await db.collection('users').doc(uid).set(profile);`) :

```js
            await db.collection('users').doc(uid).set(profile);

            const user = {
                uid, displayName: name, username, email,
                isGrossiste: !!isGrossiste, grossisteValidated: false,
                etablissement: profile.etablissement, numeroEntreprise: profile.numeroEntreprise
            };
            _user = user; _saveSession(user);
            return { user };
```

par :

```js
            await db.collection('users').doc(uid).set(profile);

            // Confirmation d'email : on envoie le lien et on NE connecte PAS le client.
            // Il devra cliquer le lien reçu par email avant de pouvoir se connecter.
            try { await cred.user.sendEmailVerification(); } catch (_) {}
            try { await firebase.auth().signOut(); } catch (_) {}
            return { pendingVerification: true, email };
```

- [ ] **Step 2: Adapter le handler du formulaire d'inscription**

Dans `auth.js`, remplacer (handler `registerForm`, après `if (result.error) { _setError('registerError', result.error); return; }`) :

```js
            if (result.error) { _setError('registerError', result.error); return; }
            _user = result.user;
            _updateNavbar(_user);
            if (typeof Notify !== 'undefined') Notify.inscription(_user);
            _afterAuthSuccess();
```

par :

```js
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
```

- [ ] **Step 3: Vérifier la syntaxe**

Run: `cd "C:\Users\jeane\Desktop\Amboul\mediafrica-landing" && node --check auth.js`
Expected: aucune sortie (succès).

- [ ] **Step 4: Régression mode localStorage (l'inscription locale reste instantanée)**

Démarrer le preview (`mcp__Claude_Preview__preview_start`, config existante), naviguer vers `/index.html`, puis via `preview_eval` :
```js
(function(){
  localStorage.clear();
  document.querySelector('.auth-tab[data-tab="register"]')?.click();
  return 'ok';
})()
```
Remplir via `preview_fill` : `#regName`=`Test Local`, `#regUsername`=`test_local`, `#regEmail`=`local@test.com`, `#regPassword`=`test1234`, puis :
```js
document.getElementById('registerForm').requestSubmit();
setTimeout(()=>{}, 0); 'submitted'
```
Vérifier ensuite :
```js
JSON.stringify({ connecte: !!Auth.currentUser(), email: Auth.currentUser()?.email })
```
Expected: `connecte: true`, `email: "local@test.com"` — en mode localStorage, l'inscription connecte toujours immédiatement (la vérification email ne s'applique qu'en mode Firebase). Nettoyer : `localStorage.clear()`.

- [ ] **Step 5: Commit**

```bash
cd "C:\Users\jeane\Desktop\Amboul\mediafrica-landing"
git add auth.js
git commit -m "feat(auth): inscription Firebase envoie un email de confirmation (pas de connexion avant validation)"
```

---

### Task 2: Connexion Firebase — bloquer tant que l'email n'est pas confirmé

**Files:**
- Modify: `auth.js` (fonction `_fbLogin`, ~lignes 488-502 ; handler du formulaire de connexion, ~lignes 664-681)

**Interfaces:**
- Consumes: `cred.user.emailVerified` (booléen Firebase), `firebase.auth().signOut()`.
- Produces: `_fbLogin(...)` retourne `{ unverified: true, email }` quand l'email n'est pas confirmé (en plus de `{ user }` / `{ error }`). Le handler de connexion appelle `_showResendVerification(email)` (défini en Task 3) dans ce cas.

- [ ] **Step 1: Bloquer la connexion non vérifiée dans `_fbLogin`**

Dans `auth.js`, remplacer (dans `_fbLogin`) :

```js
            const cred = await firebase.auth().signInWithEmailAndPassword(email, password);
            const uid  = cred.user.uid;
```

par :

```js
            const cred = await firebase.auth().signInWithEmailAndPassword(email, password);
            // Bloquer tant que l'email n'est pas confirmé (connexion Google exemptée : emailVerified=true)
            if (!cred.user.emailVerified) {
                const unverifiedEmail = cred.user.email;
                try { await firebase.auth().signOut(); } catch (_) {}
                return { unverified: true, email: unverifiedEmail };
            }
            const uid  = cred.user.uid;
```

- [ ] **Step 2: Adapter le handler du formulaire de connexion**

Dans `auth.js`, remplacer (handler `loginForm`) :

```js
            if (result.error) { _setError('loginError', result.error); return; }
            _user = result.user;
            _updateNavbar(_user);
            _afterAuthSuccess();
```

par :

```js
            if (result.unverified) {
                _setError('loginError', '⚠️ Votre email n\'est pas encore confirmé. Vérifiez votre boîte mail (et vos spams).');
                _showResendVerification(result.email);
                return;
            }
            if (result.error) { _setError('loginError', result.error); return; }
            _user = result.user;
            _updateNavbar(_user);
            _afterAuthSuccess();
```

- [ ] **Step 3: Stub temporaire de `_showResendVerification` (pour que la syntaxe passe avant Task 3)**

Dans `auth.js`, juste avant la fonction `_logout()` (~ligne 508), ajouter un stub provisoire qui sera remplacé en Task 3 :

```js
    // Remplacé par l'implémentation complète en Task 3
    function _showResendVerification(email) { /* stub : voir Task 3 */ }
```

- [ ] **Step 4: Vérifier la syntaxe**

Run: `cd "C:\Users\jeane\Desktop\Amboul\mediafrica-landing" && node --check auth.js`
Expected: aucune sortie.

- [ ] **Step 5: Commit**

```bash
cd "C:\Users\jeane\Desktop\Amboul\mediafrica-landing"
git add auth.js
git commit -m "feat(auth): connexion Firebase bloquee si email non confirme"
```

---

### Task 3: Bouton « Renvoyer l'email de confirmation »

**Files:**
- Modify: `auth.js` (HTML du formulaire de connexion dans `_injectHTML`, après `<p class="auth-error" id="loginError"></p>` ~ligne 217 ; remplacement du stub `_showResendVerification` ; ajout de `_resendVerification` ; câblage du clic dans `_wireEvents`)

**Interfaces:**
- Consumes: `firebase.auth().signInWithEmailAndPassword`, `cred.user.sendEmailVerification()`, `firebase.auth().signOut()`, champs `#loginEmail` / `#loginPassword`.
- Produces: `_resendVerification(identifier, password)` → `Promise<{ ok: true, email } | { error }>` ; `_showResendVerification(email)` affiche le bouton.

- [ ] **Step 1: Ajouter le conteneur du bouton dans le HTML du formulaire de connexion**

Dans `auth.js` (`_injectHTML`), remplacer :

```js
                <p class="auth-error" id="loginError"></p>
                <button type="submit" class="btn-auth">Se connecter</button>
```

par :

```js
                <p class="auth-error" id="loginError"></p>
                <div id="resendVerifyWrap" class="auth-form--hidden">
                    <button type="button" class="auth-forgot" id="btnResendVerify">Renvoyer l'email de confirmation</button>
                </div>
                <button type="submit" class="btn-auth">Se connecter</button>
```

- [ ] **Step 2: Remplacer le stub par l'implémentation de `_showResendVerification` + ajouter `_resendVerification`**

Dans `auth.js`, remplacer le stub ajouté en Task 2 :

```js
    // Remplacé par l'implémentation complète en Task 3
    function _showResendVerification(email) { /* stub : voir Task 3 */ }
```

par :

```js
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
```

- [ ] **Step 3: Câbler le clic du bouton dans `_wireEvents`**

Dans `auth.js` (`_wireEvents`), juste après le bloc `document.getElementById('btnForgot')?.addEventListener(...)` (~ligne 582), ajouter :

```js
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
```

- [ ] **Step 4: Masquer le bouton quand on change d'onglet / ferme le modal**

Dans `auth.js`, dans la fonction `_switchTab` (juste après la première ligne `document.querySelectorAll('.auth-tab')...`), ajouter :

```js
        document.getElementById('resendVerifyWrap')?.classList.add('auth-form--hidden');
```

- [ ] **Step 5: Vérifier la syntaxe**

Run: `cd "C:\Users\jeane\Desktop\Amboul\mediafrica-landing" && node --check auth.js`
Expected: aucune sortie.

- [ ] **Step 6: Vérifier que le bouton est masqué par défaut (mode localStorage)**

Preview : naviguer `/index.html`, ouvrir le modal de connexion via `preview_eval` :
```js
Auth.openModal(); JSON.stringify({ wrapHidden: document.getElementById('resendVerifyWrap')?.classList.contains('auth-form--hidden') })
```
Expected: `wrapHidden: true` (le bouton n'apparaît qu'après une tentative de connexion non vérifiée).

- [ ] **Step 7: Commit**

```bash
cd "C:\Users\jeane\Desktop\Amboul\mediafrica-landing"
git add auth.js
git commit -m "feat(auth): bouton Renvoyer l'email de confirmation sur l'ecran de connexion"
```

---

### Task 4: Note dans le guide Firebase

**Files:**
- Modify: `FIREBASE-SETUP.md` (ajout d'une note sur la vérification d'email)

- [ ] **Step 1: Ajouter une section sur la vérification d'email**

Dans `FIREBASE-SETUP.md`, juste avant la section « 🔒 Étape 7 — Règles de sécurité Firestore », ajouter :

```markdown
## 📧 Vérification d'email (automatique)

Dès que les clés Firebase sont en place, l'inscription d'un client déclenche
**automatiquement** un email de confirmation. Le client doit cliquer le lien
avant de pouvoir se connecter. **Rien à activer** : le template d'email de
vérification est natif et activé par défaut dans Firebase Auth.

**Optionnel — personnaliser l'email :** Console Firebase → **Authentication →
Templates** → « Adresse email de validation ». On peut y changer le nom de
l'expéditeur et le texte. (Le domaine d'envoi par défaut `@firebaseapp.com`
fonctionne sans configuration.)
```

- [ ] **Step 2: Commit**

```bash
cd "C:\Users\jeane\Desktop\Amboul\mediafrica-landing"
git add FIREBASE-SETUP.md
git commit -m "docs(firebase): note sur la verification d'email a l'inscription"
```

---

### Task 5: Vérification finale et checklist de test manuel (post-Firebase)

**Files:** aucun fichier modifié — vérification uniquement.

- [ ] **Step 1: Vérification syntaxe globale**

Run: `cd "C:\Users\jeane\Desktop\Amboul\mediafrica-landing" && node --check auth.js`
Expected: aucune sortie.

- [ ] **Step 2: Régression mode localStorage complète**

Preview : `localStorage.clear()`, puis inscription locale (`#regName`/`#regUsername`/`#regEmail`/`#regPassword`) → vérifier que `Auth.currentUser()` est non-null immédiatement (connexion instantanée, pas de blocage). Puis déconnexion et reconnexion → fonctionne. Nettoyer `localStorage.clear()`.
Expected: le mode local n'est pas affecté par la vérification d'email.

- [ ] **Step 3: Documenter la checklist de test manuel Firebase**

Le chemin Firebase ne peut être testé que lorsque les clés d'Elta sont dans `config.js`. Vérifier alors manuellement (à faire au moment du branchement Firebase) :

1. **Inscription** : créer un compte avec un vrai email → message « Compte créé ! Email de confirmation envoyé » s'affiche, **aucune connexion** (le navbar reste « Se connecter »).
2. **Email reçu** : un email de Firebase arrive dans la boîte → contient un lien de confirmation.
3. **Connexion avant clic** : tenter de se connecter → bloqué avec « Votre email n'est pas encore confirmé » + bouton « Renvoyer l'email ».
4. **Renvoyer** : cliquer « Renvoyer l'email » → « ✅ Email renvoyé ». Un nouvel email arrive.
5. **Après clic sur le lien** : se connecter → **réussit**, navbar affiche le nom du client.
6. **Google** : connexion Google → réussit immédiatement (pas de barrière de vérification).
7. **Admin** : connexion admin (`eltajoseph29`) → réussit normalement (non affectée).

- [ ] **Step 4: Pas de commit** (Task 5 est une vérification ; ne committer que si un correctif a été nécessaire).

---

## Self-Review (effectué par l'auteur du plan)

**Couverture du spec :**
- Email de confirmation envoyé à l'inscription → Task 1 (`sendEmailVerification`). ✅
- Pas de connexion avant confirmation → Task 1 (`signOut` + `pendingVerification`). ✅
- Connexion bloquée tant que non confirmé → Task 2 (`emailVerified` check). ✅
- Bouton « Renvoyer l'email » → Task 3. ✅
- Connexion Google non affectée → Task 2 (emailVerified=true par défaut, aucune barrière ajoutée). ✅
- Compte admin non affecté → chemin `_login` local jamais touché. ✅
- Mode localStorage inchangé → Tasks 1-3 ne modifient que les fonctions `_fb*` et les branches `result.unverified`/`result.pendingVerification` ; régression vérifiée (Task 1 Step 4, Task 5 Step 2). ✅
- Échec d'envoi non bloquant → Task 1 (`try/catch` autour de `sendEmailVerification`). ✅
- Note guide Firebase → Task 4. ✅

**Cohérence des signatures :** `_fbRegister` → `{ pendingVerification, email }` ; `_fbLogin` → `{ unverified, email }` ; `_showResendVerification(email)` ; `_resendVerification(identifier, password)` → `{ ok, email } | { error }`. Noms identiques entre définition et usage. Le stub de `_showResendVerification` (Task 2) est remplacé par l'implémentation complète (Task 3) — une seule définition finale.

**Hors scope confirmé non traité :** page d'atterrissage custom, vérification en mode local, relance auto, double opt-in marketing — aucune trace dans le plan. ✅
