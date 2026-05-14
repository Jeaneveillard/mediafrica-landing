# Configuration Firebase — MediAfrica

## 1. Créer le projet Firebase

1. Aller sur https://console.firebase.google.com
2. Cliquer **Ajouter un projet**, nommer-le (ex : `mediafrica-store`)
3. Désactiver Google Analytics (optionnel)
4. Cliquer **Créer le projet**

## 2. Activer l'authentification

1. Dans le menu gauche → **Authentication** → **Sign-in method**
2. Activer **Email/Password**
3. Sauvegarder

## 3. Créer la base Firestore

1. Menu gauche → **Firestore Database** → **Créer une base de données**
2. Choisir **Mode Production**
3. Sélectionner une région proche (ex : `us-east1`)
4. Cliquer **Activer**

## 4. Configurer les règles de sécurité Firestore

Dans **Firestore → Règles**, remplacer le contenu par :

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Commandes : chaque client voit seulement les siennes
    match /orders/{orderId} {
      allow create: if request.auth != null
                    && request.resource.data.userId == request.auth.uid;
      allow read:   if request.auth != null
                    && resource.data.userId == request.auth.uid;
      allow update, delete: if false;
    }

    // Prix : lecture publique, écriture admin seulement
    match /config/{doc} {
      allow read: if true;
      allow write: if request.auth != null
                   && request.auth.token.email == "VOTRE_EMAIL_ADMIN";
    }
  }
}
```

> **Important :** Remplacer `VOTRE_EMAIL_ADMIN` par l'email exact de l'administrateur (le même que dans `config.js` → `adminEmail`).

Cliquer **Publier**.

## 5. Récupérer les clés du SDK Web

1. Menu gauche → **Paramètres du projet** (icône engrenage) → **Vos applications**
2. Cliquer **</>** (Web)
3. Donner un surnom (ex : `mediafrica-web`)
4. Copier les valeurs du bloc `firebaseConfig`

## 6. Remplir config.js

Ouvrir `config.js` et remplir les champs :

```js
firebase: {
    apiKey:            "AIza...",
    authDomain:        "votre-projet.firebaseapp.com",
    projectId:         "votre-projet",
    storageBucket:     "votre-projet.appspot.com",
    messagingSenderId: "123456789",
    appId:             "1:123:web:abc"
},
```

Renseigner votre handle PayPal et l'email administrateur :

```js
adminEmail: 'votre-email@exemple.com', // email du gestionnaire des prix
paypal: {
    handle: 'votre-handle-paypal',  // ex: 'mediafrica'
    currency: 'CAD'
},
```

## 7. Ajouter les prix des produits (optionnel)

Dans `config.js`, section `prices`, ajouter les prix au fur et à mesure :

```js
prices: {
    "Paracétamol 500mg": 12.99,
    "Vitamine C 1000mg": 8.99,
    "Hair Growth Formula": 24.99,
    // ... ajouter d'autres produits
}
```

> **Note :** Les produits sans prix dans cette liste afficheront "Sur devis" dans le panier et redirigeront vers WhatsApp au lieu de PayPal.

## 8. Gérer les prix via la page Admin

Une page d'administration est disponible pour mettre à jour les prix sans toucher au code :

1. Ouvrir `admin.html` dans le navigateur (ex : `https://votre-site.com/admin.html`)
2. Se connecter avec l'email administrateur configuré dans `config.js → adminEmail`
3. Entrer le prix unitaire (CAD) pour chaque produit
4. Cliquer **Sauvegarder tous les prix**

Les prix sont sauvegardés dans Firestore et pris en compte immédiatement sur le site.

> Les produits sans prix affichent "Sur devis" — la commande passe par WhatsApp.

## 9. Gérer les statuts des commandes

Les statuts des commandes (`sent`, `processing`, `delivered`) se changent manuellement dans la console Firebase :

1. **Firestore Database** → collection `orders`
2. Cliquer sur une commande
3. Modifier le champ `status` : `sent` / `processing` / `delivered`

---

*Configuration complète. Le site est prêt à recevoir des commandes.*
