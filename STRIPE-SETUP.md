# 💳 Mise en route Stripe — MediPharma (guide RDV)

> Objectif : activer le **paiement par carte en ligne**. À faire avec le **compte du client** — c'est LUI qui entre ses coordonnées bancaires (jamais le développeur).
> Durée : ~15-20 minutes côté client + déploiement technique par le développeur après.

---

## ⚙️ Avant le RDV (déjà fait par le développeur)
- ✅ Code du panier (`cart.js`) câblé : utilise Stripe Checkout dès que les clés sont configurées, repli automatique sur PayPal/WhatsApp sinon.
- ✅ Cloud Function `createCheckoutSession` prête (`functions/index.js`) — reste à déployer une fois les clés Stripe fournies.
- 🔲 Il reste : le client crée son compte Stripe + transmet 2 informations au développeur (clé publique + clé secrète).

---

## Étape 1 — Créer le compte Stripe (le client, avec SES coordonnées)
1. Le **client** ouvre https://dashboard.stripe.com/register et crée son compte (email + mot de passe).
2. Stripe demande le pays (**Canada**) et le type d'activité (pharmacie / vente de produits de santé).
3. **Activation du compte** (nécessaire pour recevoir de vrais paiements) :
   - Infos sur l'entreprise (nom légal, numéro d'entreprise NEQ)
   - Coordonnées bancaires pour les **virements de paiement** (compte bancaire canadien)
   - Pièce d'identité du représentant légal
   > ⚠️ Ces informations sont saisies **uniquement par le client**, directement sur le site de Stripe. Le développeur n'y a jamais accès.
4. Le compte peut rester en mode **Test** pendant qu'on configure tout, puis bascule en mode **Live** une fois prêt.

## Étape 2 — Récupérer les clés API
1. Dans le Dashboard Stripe → **Developers** (ou **Développeurs**) → **API keys**.
2. Copier les 2 valeurs (en mode **Test** d'abord pour les essais, puis en mode **Live** au lancement) :
   - **Publishable key** (commence par `pk_test_...` ou `pk_live_...`) — peut être partagée sans risque.
   - **Secret key** (commence par `sk_test_...` ou `sk_live_...`) — **confidentielle**, ne jamais l'envoyer par message non sécurisé (SMS/email en clair). À transmettre au développeur via un canal privé (ex. en personne au RDV, ou un gestionnaire de mots de passe partagé).

## Étape 3 — Transmettre les clés au développeur
Le développeur a besoin de :
1. La **Publishable key** → sera collée dans `config.js` (visible publiquement, normal).
2. La **Secret key** → ne sera **jamais** mise dans le code du site. Elle sera stockée de façon sécurisée dans **Firebase Secret Manager** (nécessite que le projet Firebase soit créé — voir `FIREBASE-SETUP.md`), accessible uniquement par la Cloud Function côté serveur.

## Étape 4 — Déploiement technique (fait par le développeur après le RDV)
```bash
# 1. Passer le projet Firebase au plan Blaze (pay-as-you-go) — requis pour que
#    les Cloud Functions puissent appeler une API externe (Stripe).
#    Le plan Blaze a un généreux quota gratuit ; aucun frais pour un usage normal.
#    À faire dans la Console Firebase → Modifier le forfait → Blaze.

# 2. Enregistrer la clé secrète Stripe de façon sécurisée
firebase functions:secrets:set STRIPE_SECRET_KEY
# (coller la clé sk_live_... ou sk_test_... quand demandé)

# 3. Déployer la fonction
firebase deploy --only functions:createCheckoutSession
```
La commande de déploiement affiche l'URL de la fonction (ex. `https://northamerica-northeast1-medipharma-xxxx.cloudfunctions.net/createCheckoutSession`).

## Étape 5 — Coller les clés dans `config.js`
```js
stripe: {
    publishableKey:      "pk_live_........................",
    checkoutFunctionUrl: "https://northamerica-northeast1-medipharma-xxxx.cloudfunctions.net/createCheckoutSession"
},
```
→ Enregistrer, committer, pousser. Dès que ces 2 valeurs sont remplies, le bouton de paiement du panier passe automatiquement par Stripe Checkout (carte bancaire sécurisée).

## Étape 6 — Tester
1. Commencer en mode **Test** : utiliser la carte de test Stripe `4242 4242 4242 4242`, n'importe quelle date future, n'importe quel CVC.
2. Vérifier que la commande apparaît dans **Admin → Commandes** avec `paymentMethod: "stripe"`.
3. Une fois validé, repasser les clés en mode **Live** (Étapes 2 et 5 avec les clés `pk_live_`/`sk_live_`) pour accepter de vrais paiements.

---

## ❓ En cas de souci
- **Le bouton retombe sur PayPal/WhatsApp** : `CONFIG.stripe.publishableKey` ou `checkoutFunctionUrl` est vide, ou la Cloud Function n'est pas déployée/accessible (voir console navigateur pour le message d'avertissement).
- **Erreur 500 de la fonction** : vérifier que `STRIPE_SECRET_KEY` est bien enregistrée (`firebase functions:secrets:set`) et que le plan Blaze est actif.
- **« Aucun article avec prix défini »** : un produit du panier n'a pas de prix dans `config.js` (prix « sur devis »).
