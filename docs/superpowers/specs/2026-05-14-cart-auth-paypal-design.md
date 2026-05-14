# MediAfrica — Panier, Comptes Clients & Paiement PayPal

**Date :** 2026-05-14  
**Statut :** Approuvé

---

## Contexte

Site statique HTML/CSS/JS hébergé sur Netlify. La commande actuelle passe par WhatsApp. On ajoute un panier persistant, un système de comptes clients (Firebase Auth) et un redirect PayPal au moment du paiement. Le site est réalisé pour un client qui configurera ses propres clés Firebase et son handle PayPal dans un fichier de config.

---

## Architecture

Le site reste 100% statique. Aucun serveur backend. Firebase est utilisé uniquement côté client via le SDK JS.

### Nouveaux fichiers

| Fichier | Rôle |
|---|---|
| `config.js` | Handle PayPal, clés Firebase, prix des produits |
| `cart.js` | Logique panier — localStorage |
| `auth.js` | Wrapper Firebase Auth |
| `cart.css` | Styles : panneau panier, modal compte, badge |
| `mon-compte.html` | Page compte client |

### Fichiers modifiés

| Fichier | Modification |
|---|---|
| `style.css` | Icônes navbar, badge panier |
| `index.html` | Icône panier + compte dans navbar + bouton "Ajouter au panier" sur les cartes produits |
| `script.js` | Chargement cart.js + auth.js |
| `catalogue.html` | Bouton "Ajouter au panier" sur chaque produit |
| `catalogue.js` | Logique ajout au panier, mise à jour badge |
| `aide.html`, `livraison.html`, `communaute.html` | Icône panier + compte dans navbar |

---

## Composant 1 — Fichier de configuration (`config.js`)

Seul fichier que le client doit modifier. Chargé en premier sur toutes les pages.

```js
const CONFIG = {
    paypal: {
        handle: 'TON_COMPTE_PAYPAL', // ex : 'mediafrica'
        currency: 'CAD'
    },
    firebase: {
        apiKey: '',
        authDomain: '',
        projectId: '',
        storageBucket: '',
        messagingSenderId: '',
        appId: ''
    },
    prices: {
        // Clé = nom exact du produit tel qu'affiché dans le catalogue
        // "Paracétamol 500mg": 12.99,
        // "Vitamine C 1000mg": 8.99,
        // Laisser vide → produit affiché "Sur devis" dans le panier
    }
};
```

---

## Composant 2 — Panier (`cart.js`)

### Stockage
- `localStorage` clé `mediafrica_cart`
- Structure : `Array<{ id, name, category, unitPrice|null, quantity }>`
- Persiste entre les pages et sessions

### API interne
```js
Cart.add(product)        // ajoute ou incrémente
Cart.remove(id)          // supprime une ligne
Cart.update(id, qty)     // met à jour la quantité (0 = supprime)
Cart.clear()             // vide le panier
Cart.getItems()          // retourne les items
Cart.getTotal()          // retourne le total (null si un item est "Sur devis")
Cart.getCount()          // nombre total d'articles
```

### Panneau panier (slide-in droite)
- Déclenché par l'icône panier dans la navbar
- Fond semi-transparent (backdrop)
- Chaque ligne : nom + tag catégorie, contrôle quantité (+/−), prix unitaire ou *"Sur devis"*, total de la ligne
- Bouton × pour supprimer un article
- Pied : total général → bouton **"Passer au paiement"**
- Si panier vide : illustration + message "Votre panier est vide"

### Badge
- Cercle rouge sur l'icône panier indiquant le nombre d'articles
- Mis à jour en temps réel à chaque modification

---

## Composant 3 — Authentification (`auth.js`)

### Fournisseur
Firebase Authentication — email + mot de passe uniquement.

### Modal login/inscription
- S'ouvre via : clic sur icône compte, OU tentative de checkout sans session
- 2 onglets : **Se connecter** / **Créer un compte**
- Champs : nom complet (inscription), email, mot de passe
- Messages d'erreur localisés en français
- Après succès : fermeture modale, mise à jour navbar

### Navbar (état connecté)
```
[icône compte]  →  dropdown :
                   - Mon Compte
                   - Se déconnecter
```

### Navbar (état déconnecté)
```
[icône compte]  →  ouvre modal login
```

---

## Composant 4 — Flux de paiement

```
Client clique "Passer au paiement"
        ↓
Connecté ?
  Non  →  Modal login/inscription  →  après succès, reprend checkout
  Oui  ↓
Tous les produits ont un prix fixe ?
  Oui  →  Sauvegarde commande Firestore  →  Redirect PayPal
  Non  →  Sauvegarde commande Firestore  →  Redirect WhatsApp (détail panier inclus)
```

### Redirect PayPal
```
https://www.paypal.com/paypalme/{handle}/{montant}{devise}
```
Exemple : `https://www.paypal.com/paypalme/mediafrica/150CAD`

S'ouvre dans un nouvel onglet. Le panier est vidé après le redirect.

### Redirect WhatsApp (fallback)
Si au moins un article est "Sur devis", message WhatsApp automatique :
```
🛒 Nouvelle commande MediAfrica

Produits :
• Paracétamol 500mg × 2  —  25.98 CAD
• Hair Growth Formula × 1  —  Sur devis

Total calculable : 25.98 CAD
(+ articles sur devis)

Client : [prénom] [email]
```

---

## Composant 5 — Page compte (`mon-compte.html`)

Accessible uniquement si connecté (redirection vers accueil sinon).

### Sections
1. **Profil** — nom, email, date d'inscription, bouton Se déconnecter
2. **Historique des commandes** — liste des commandes passées avec : date, produits, total, statut (*Envoyée / En cours / Livrée*)

### Statuts de commande
Les statuts sont mis à jour manuellement par le propriétaire via la console Firebase.

---

## Composant 6 — Base de données Firestore

### Collection `orders`
```
orders/
  {orderId}/
    userId        : string
    userEmail     : string
    items         : Array<{ name, category, qty, unitPrice|null, lineTotal|null }>
    total         : number | null   (null si "Sur devis")
    currency      : "CAD"
    paymentMethod : "paypal" | "whatsapp"
    status        : "sent" | "processing" | "delivered"
    createdAt     : Timestamp
```

### Règles Firestore (sécurité)
- Un utilisateur peut lire/écrire uniquement ses propres commandes (`userId == request.auth.uid`)
- Aucune lecture publique

---

## Gestion des prix manquants

| Situation | Comportement |
|---|---|
| Produit sans prix dans `config.js` | Affiche "Sur devis" dans le panier |
| Tous les produits ont un prix | Checkout → PayPal |
| Au moins un produit "Sur devis" | Checkout → WhatsApp |
| Propriétaire ajoute un prix dans `config.js` | Actif immédiatement au prochain chargement |

---

## Ce qui n'est PAS inclus dans ce spec

- Paiement par carte (hors scope — décision volontaire pour la sécurité)
- Interface d'administration (le propriétaire gère les prix dans `config.js` et les statuts dans la console Firebase)
- Gestion des stocks
- Emails de confirmation (peut être ajouté plus tard via Firebase Functions)

---

## Dépendances externes

| Service | Usage | Coût |
|---|---|---|
| Firebase Auth | Authentification | Gratuit (Spark plan) |
| Firebase Firestore | Stockage commandes | Gratuit jusqu'à 50k lectures/jour |
| PayPal.me | Redirect paiement | Gratuit |
