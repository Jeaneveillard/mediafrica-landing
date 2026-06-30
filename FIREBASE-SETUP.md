# 🔥 Mise en route Firebase — MediPharma (guide RDV)

> Objectif : activer la **connexion sur tous les appareils**. À faire avec le **compte Google du client** (il reste propriétaire).
> Durée : ~10 minutes. Aucune carte bancaire requise (plan gratuit « Spark »).

---

## ⚙️ Avant le RDV (déjà fait par le développeur)
- ✅ Code câblé : inscription, connexion, mot de passe oublié, validation grossiste utilisent Firebase dès que les clés sont là.
- ✅ Repli localStorage conservé : le site marche même sans les clés.
- 🔲 Il ne reste qu'à **créer le projet** et **coller 6 clés** dans `config.js`.

---

## Étape 1 — Créer le projet Firebase
1. Le **client** ouvre https://console.firebase.google.com et se connecte avec **SON** compte Google.
2. Cliquer **« Créer un projet »** (Add project).
3. Nom du projet : `medipharma` (ou `MediPharma`). → **Continuer**.
4. Google Analytics : **désactiver** (pas nécessaire). → **Créer le projet**.
5. Attendre ~30 s → **Continuer**.

## Étape 2 — Enregistrer l'application web
1. Sur la page d'accueil du projet, cliquer l'icône **`</>`** (Web).
2. Surnom de l'app : `medipharma-web`. **Ne pas** cocher « Firebase Hosting ». → **Enregistrer l'app**.
3. Firebase affiche un bloc `const firebaseConfig = { ... }`. **C'est ça qu'on copie** (voir Étape 5). → **Continuer vers la console**.

## Étape 3 — Activer l'authentification Email/mot de passe
1. Menu gauche → **Build → Authentication** → **Get started / Commencer**.
2. Onglet **Sign-in method** → cliquer **Email/Password** → activer le 1er interrupteur → **Enregistrer**.
3. (Optionnel) Pour la connexion Google : activer aussi **Google** dans la même liste.

## Étape 4 — Créer la base Firestore
1. Menu gauche → **Build → Firestore Database** → **Créer une base de données**.
2. Choisir un emplacement : **`northamerica-northeast1` (Montréal)**. → **Suivant**.
3. Mode de démarrage : **« Démarrer en mode test »** (test mode). → **Activer**.
   > ⚠️ Le mode test expire après 30 jours. On posera des règles définitives ensuite (voir plus bas).

## Étape 5 — Coller les 6 clés dans le code
Dans `config.js`, remplir l'objet `firebase` avec les valeurs du bloc copié à l'Étape 2 :

```js
firebase: {
    apiKey:            "AIza........................",
    authDomain:        "medipharma-xxxx.firebaseapp.com",
    projectId:         "medipharma-xxxx",
    storageBucket:     "medipharma-xxxx.appspot.com",
    messagingSenderId: "0000000000",
    appId:             "1:0000000000:web:xxxxxxxxxxxx"
},
```
→ Enregistrer le fichier.

## Étape 6 — Déployer et tester
1. `git add config.js && git commit -m "feat: clés Firebase" && git push`
   *(le site est sur GitHub Pages : le `push` met le site à jour automatiquement en ~1 min)*
2. Sur `medipharma.ca` : **créer un compte** sur l'ordinateur.
3. Sur le **téléphone** : se connecter avec ce compte → ✅ ça doit marcher.
4. Dans l'**admin** → onglet **Clients** : le nouveau compte apparaît, et le bouton **Type** le fait passer Client → En attente → Grossiste ✓.

---

## 🔒 Étape 7 — Règles de sécurité Firestore (avant la fin des 30 jours)
Console → **Firestore → Règles** → coller puis **Publier** :

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Profil : chacun lit/écrit le sien ; lecture admin gérée séparément
    match /users/{uid} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && request.auth.uid == uid;
      allow update, delete: if request.auth != null && request.auth.uid == uid;
    }
    // Avis clients : lecture publique (affichés sur la page d'accueil),
    // chaque utilisateur connecté ne peut écrire que son propre avis (doc id = son uid)
    match /reviews/{uid} {
      allow read: if true;
      allow create, update, delete: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```
> Ces règles seront affinées quand l'admin Firestore sera branché (validation grossiste côté serveur).

---

## ❓ En cas de souci
- **« Firebase not defined »** : les 3 `<script>` du SDK doivent être chargés avant `config.js` (déjà fait sur index, catalogue, admin).
- **Connexion échoue** : vérifier qu'Email/Password est bien activé (Étape 3).
- **« Missing permissions »** : Firestore pas en mode test, ou règles trop strictes (Étape 4 / 7).
- **Le push ne met pas le site à jour** : Netlify n'est pas relié à GitHub → refaire un ZIP (voir note déploiement).
