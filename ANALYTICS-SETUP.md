# 📊 Voir le nombre de visiteurs — Google Analytics 4

Tout le code est déjà installé sur le site. Il reste **une seule chose à faire** :
créer la propriété Google Analytics et coller son identifiant dans `config.js`.
Durée : environ 5 minutes.

---

## Étape 1 — Créer la propriété (5 min)

1. Aller sur **https://analytics.google.com** et se connecter avec le compte Google
   du client (le même que celui utilisé pour Firebase, idéalement).
2. Cliquer sur **Commencer à mesurer** (ou ⚙️ *Admin* → **Créer** → **Propriété**).
3. Remplir :
   - **Nom du compte** : `Solutions Santé Canada`
   - **Nom de la propriété** : `medipharma.ca`
   - **Fuseau horaire** : `(GMT-05:00) Heure de l'Est — Canada`
   - **Devise** : `Dollar canadien ($ CAD)`
4. Renseigner le secteur d'activité (*Santé* ou *Commerce en ligne*) et la taille
   de l'entreprise, puis **Créer**.
5. À l'écran « Commencer à collecter des données », choisir la plateforme **Web**.
   - **URL du site Web** : `https://medipharma.ca`
   - **Nom du flux** : `Site MediPharma`
6. Google affiche alors un **ID de mesure** de la forme **`G-XXXXXXXXXX`**.
   👉 **C'est cette valeur qu'il faut copier.**

> On peut la retrouver plus tard dans : ⚙️ *Admin* → *Flux de données* → cliquer
> sur le flux → l'ID de mesure est en haut à droite.

---

## Étape 2 — Coller l'ID dans le site (30 secondes)

Ouvrir le fichier **`config.js`** et remplacer la ligne vide par l'ID obtenu :

```js
ga4MeasurementId: 'G-XXXXXXXXXX',   // ← coller l'ID ici, entre les apostrophes
```

Puis **bumper la version de `config.js`** dans les 12 pages HTML pour forcer les
navigateurs à recharger le fichier (sinon l'ancienne version reste en cache) :

```bash
sed -i 's|config\.js?v=13|config.js?v=14|g' *.html
```

Enfin, publier :

```bash
git add -A && git commit -m "feat(analytics): activer Google Analytics 4" && git push
```

GitHub Pages met environ 1 à 2 minutes à publier la mise à jour.

---

## Étape 3 — Vérifier que ça marche (2 min)

1. Ouvrir **https://medipharma.ca** dans un navigateur.
2. Une bannière apparaît en bas → cliquer sur **Accepter**.
3. Dans Google Analytics, aller dans **Rapports** → **Temps réel**.
4. Ta propre visite doit apparaître en moins de 30 secondes.

Si rien n'apparaît : vérifier qu'aucun bloqueur de pubs (uBlock, AdBlock, Brave)
n'est actif — ils bloquent Google Analytics.

---

## Où voir le nombre de visiteurs, ensuite

Dans Google Analytics, menu **Rapports** :

| Ce que tu veux savoir | Où regarder |
|---|---|
| Combien de personnes en ce moment | **Temps réel** |
| Combien de visiteurs cette semaine / ce mois | **Acquisition → Vue d'ensemble** (« Utilisateurs actifs ») |
| De quels pays ils viennent | **Données démographiques → Détails** |
| Quelles pages sont les plus vues | **Engagement → Pages et écrans** |
| D'où ils arrivent (Google, WhatsApp, Facebook…) | **Acquisition → Acquisition de trafic** |
| Ajouts au panier et commandes | **Engagement → Événements** (`add_to_cart`, `purchase`) |

⚠️ **Les données ne sont pas rétroactives.** Le comptage démarre le jour où l'ID
est collé dans `config.js` — les visites antérieures sont définitivement perdues.

📱 Il existe aussi l'application mobile **Google Analytics** (iOS / Android) pour
consulter les chiffres depuis le téléphone.

---

## Vie privée — Loi 25 (Québec) et RGPD

Le site respecte déjà les obligations légales, sans intervention supplémentaire :

- **Google Consent Mode v2** est actif : **aucun cookie de mesure n'est déposé**
  tant que le visiteur n'a pas cliqué « Accepter ».
- Une **bannière de consentement** s'affiche à la première visite ; le choix est
  mémorisé 6 mois, puis la question est reposée.
- Les **adresses IP sont anonymisées** (`anonymize_ip`).
- La publicité et la personnalisation publicitaire sont **désactivées en dur**
  (`ad_storage`, `ad_user_data`, `ad_personalization` = `denied`).

Un visiteur qui refuse n'est simplement pas comptabilisé — c'est le prix légal à
payer, prévois environ 10 à 30 % de visites non comptées.

Pour permettre à un visiteur de revenir sur son choix, ajouter ce lien en pied de
page (facultatif) :

```html
<a href="#" onclick="Analytics.reopenConsent(); return false;">Statistiques de visite</a>
```

---

## Fichiers concernés

| Fichier | Rôle |
|---|---|
| `analytics.js` | Chargement de GA4, Consent Mode v2, bannière, fonction `Analytics.track()` |
| `config.js` | Contient `ga4MeasurementId` — **le seul champ à remplir** |
| `cart.js` | Envoie les événements `add_to_cart` et `purchase` |
| Les 12 pages `.html` | Chargent `analytics.js` juste après `config.js` |

**Tant que `ga4MeasurementId` est vide, rien n'est chargé et aucune bannière ne
s'affiche** — le site fonctionne exactement comme avant.
