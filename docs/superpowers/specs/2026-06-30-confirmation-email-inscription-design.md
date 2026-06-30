# MediAfrica / Solutions Santé Canada — Confirmation d'email à l'inscription

**Date :** 2026-06-30
**Statut :** Approuvé

---

## Contexte

À l'inscription, un client doit recevoir un **email de confirmation** qu'il doit accepter (cliquer le lien) **avant de pouvoir se connecter**. Objectif : valider que l'adresse email est réelle et appartient bien au client.

### Contrainte technique fondamentale

Un vrai email de confirmation ne peut **pas** être envoyé depuis le site seul (mode `localStorage` actuel, 100 % client, aucun serveur). Cette fonctionnalité **requiert Firebase**, que le client (Elta) est en train de configurer. Firebase Auth fournit cette capacité **nativement** :

- `firebase.auth().currentUser.sendEmailVerification()` → envoie l'email
- `firebase.auth().currentUser.emailVerified` → booléen indiquant si l'email est confirmé

La fonctionnalité s'active donc **automatiquement dès que Firebase est branché**. En mode `localStorage` (avant Firebase), l'inscription reste instantanée (aucun email possible).

---

## Architecture

Modification du module existant `auth.js`, sur le **chemin Firebase** uniquement (`_fbReady()`). Aucun nouveau fichier. Le chemin `localStorage` reste inchangé.

### Fichiers modifiés

| Fichier | Modification |
|---|---|
| `auth.js` | `_fbRegister` : envoyer l'email + déconnecter au lieu de connecter. Connexion Firebase : bloquer si `emailVerified === false`. Ajout d'un lien « Renvoyer l'email ». |
| `FIREBASE-SETUP.md` | Note : le template d'email de vérification est natif/activé par défaut ; option de personnalisation. |

---

## Comportement

### Inscription (mode Firebase)

1. Le client soumet le formulaire → `createUserWithEmailAndPassword` + création du profil Firestore (comme aujourd'hui).
2. `cred.user.sendEmailVerification()` → Firebase envoie l'email de confirmation.
3. **On ne connecte pas le client** → `firebase.auth().signOut()` immédiatement après.
4. Message de succès affiché dans le formulaire d'inscription :
   > ✅ Compte créé ! Un email de confirmation a été envoyé à `<email>`. Cliquez le lien pour activer votre compte, puis connectez-vous.
5. Le formulaire bascule visuellement vers un état « en attente de confirmation » (pas de redirection, pas de session ouverte).

### Connexion (mode Firebase)

1. `signInWithEmailAndPassword(email, password)`.
2. Si `user.emailVerified === false` :
   - `firebase.auth().signOut()` (ne pas laisser de session ouverte).
   - Message d'erreur :
     > ⚠️ Votre email n'est pas encore confirmé. Vérifiez votre boîte mail (et vos spams).
   - Afficher le bouton **« Renvoyer l'email de confirmation »**.
3. Si `user.emailVerified === true` → connexion normale (comportement actuel).

### Renvoyer l'email

- Lien/bouton « Renvoyer l'email de confirmation » apparaissant sous l'erreur de connexion « email non confirmé ».
- Action : reconnecter silencieusement l'utilisateur (avec les identifiants saisis), appeler `sendEmailVerification()`, puis `signOut()` à nouveau, et afficher : « ✅ Email renvoyé à `<email>`. »
- Si l'utilisateur n'a pas saisi de mot de passe valide, l'action n'est pas possible → message invitant à ressaisir email + mot de passe.

---

## Cas particuliers

- **Connexion Google** : `emailVerified` est `true` par défaut (vérifié par Google) → aucune barrière, aucun changement.
- **Compte admin réservé** : la connexion admin passe par le chemin `localStorage` réservé (`!_looksLikeAdmin(email)` route vers `_login` local, jamais vers Firebase) → **non affecté**. Elta se connecte toujours normalement.
- **Grossiste** : confirme d'abord son email (cette fonctionnalité), *puis* l'admin valide le statut grossiste (`grossisteValidated`, mécanisme existant inchangé). Deux étapes distinctes.
- **Mode `localStorage` (avant Firebase)** : aucun email possible → l'inscription reste instantanée comme aujourd'hui. La barrière de confirmation s'active automatiquement dès que les clés Firebase sont renseignées dans `config.js`.

---

## Erreurs & cas limites

- **Échec d'envoi de l'email** (réseau, quota Firebase) : le compte est créé mais l'email n'est pas parti. Afficher un message invitant à utiliser « Renvoyer l'email » depuis l'écran de connexion. Ne pas bloquer la création du compte.
- **Client tente de se connecter sans avoir confirmé** : bloqué (cœur de la fonctionnalité), avec option de renvoi.
- **Email déjà utilisé** : géré par Firebase (`auth/email-already-in-use`), message existant via `_fbError`.

---

## Hors scope (YAGNI)

- Page d'atterrissage personnalisée après le clic sur le lien (Firebase affiche sa page de confirmation par défaut — suffisant).
- Vérification d'email pour les comptes créés en mode `localStorage` (techniquement impossible sans backend).
- Expiration/relance automatique des emails non confirmés.
- Double opt-in marketing (newsletter) — distinct de la vérification de compte.
