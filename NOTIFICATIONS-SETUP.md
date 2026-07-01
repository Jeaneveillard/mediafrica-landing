# 📧 Notifications email — MediPharma / Solutions Santé Canada

> Objectif : recevoir un **email automatique** à chaque **nouvelle inscription** et
> **nouvelle commande**. Service utilisé : **Web3Forms** (gratuit, 250 emails/mois,
> compatible GitHub Pages — aucun serveur requis).
> Durée : ~3 minutes.

---

## Étape 1 — Obtenir la clé d'accès Web3Forms
1. Aller sur **https://web3forms.com**
2. Dans le champ **« Enter your email »**, saisir l'email **où Elta veut recevoir les notifications** (son email professionnel).
3. Cliquer **« Create Access Key »**.
4. Web3Forms envoie un email de confirmation → cliquer le lien de confirmation.
5. La page affiche une **Access Key** (un long code, ex. `a1b2c3d4-....`). **C'est ça qu'il nous faut.**

## Étape 2 — Coller la clé dans le code
Dans `config.js`, renseigner :

```js
    web3formsKey:    'COLLER-LA-CLE-ICI',   // clé Web3Forms
```

→ Enregistrer, puis :
```bash
git add config.js && git commit -m "feat: cle notifications email" && git push
```
*(le site se met à jour en ~1 min sur GitHub Pages)*

## Étape 3 — Tester
1. Sur le site, **créer un compte de test** → Elta doit recevoir un email **« 🆕 Nouvelle inscription »**.
2. Passer une **commande de test** → email **« 🛒 Nouvelle commande »** avec le détail.

*(Le premier email peut arriver dans les spams : marquer « non spam » une fois.)*

---

## ❓ En cas de souci
- **Aucun email reçu** : vérifier que la clé est bien collée dans `config.js` (sans espaces) et que le site a été redéployé (`push`). Vérifier les spams.
- **Changer l'adresse de réception** : refaire l'Étape 1 avec le nouvel email → nouvelle clé → remplacer dans `config.js`.
- **Trop d'emails / quota** : le plan gratuit couvre 250/mois. Au-delà, Web3Forms propose des plans payants, ou on peut router les notifications autrement.

## ℹ️ Notes techniques
- Tant que `web3formsKey` est vide, **aucune notification n'est envoyée** (repli silencieux) — le site fonctionne normalement.
- La clé Web3Forms est **publique par design** (elle ne permet que d'envoyer un email vers l'adresse propriétaire) → aucun risque à la mettre dans le code, comme les clés Firebase.
- Remplace l'ancien système **Netlify Forms** (mort depuis la migration vers GitHub Pages).
