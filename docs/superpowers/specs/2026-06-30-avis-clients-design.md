# MediAfrica — Avis clients (témoignages soumis par les utilisateurs)

**Date :** 2026-06-30
**Statut :** Approuvé

---

## Contexte

La section "Ce que nos clients disent" (`index.html`, `#temoignages`) affiche actuellement 5 témoignages codés en dur dans le HTML. L'objectif est de permettre aux vrais clients connectés de soumettre leur propre avis (note + commentaire), affiché publiquement à la suite des témoignages existants.

Le site suit déjà le pattern dual-mode Firestore / localStorage pour le panier (`cart.js`) et les comptes (`auth.js`) : fonctionne en mode local tant que Firebase n'est pas configuré par le client, bascule automatiquement sur Firestore dès que les clés sont renseignées dans `config.js`. Les avis suivent le même pattern pour ne nécessiter aucun travail supplémentaire après la configuration Firebase du client.

---

## Architecture

100% statique, aucun changement de stack. Nouveau module `reviews.js` suivant le pattern de `cart.js`/`auth.js` (`_fbReady()`, repli `localStorage`).

### Nouveaux fichiers

| Fichier | Rôle |
|---|---|
| `reviews.js` | Logique avis : soumission, lecture, rendu, stockage Firestore/localStorage |

### Fichiers modifiés

| Fichier | Modification |
|---|---|
| `index.html` | Bouton "Laisser un avis" + conteneur des avis dynamiques dans `#temoignages` ; ajout du script `reviews.js` |
| `style.css` ou `cart.css` | Styles du modal d'avis, étoiles, carte d'avis dynamique |

---

## Composant 1 — Stockage des avis (`reviews.js`)

### Modèle de données

```js
{
    id: string,            // uid Firestore ou clé localStorage générée
    userId: string,        // uid Firebase Auth (clé d'unicité — 1 avis par compte)
    userName: string,      // displayName ou email tronqué
    rating: number,        // 1 à 5
    comment: string,       // max 300 caractères
    createdAt: timestamp,  // tri du plus récent au plus ancien
    route: string | null   // ex. "Montréal → Guinée Conakry", optionnel, basé sur la région du compte si disponible
}
```

### Mode Firestore (si `CONFIG.firebase.apiKey` renseigné)

- Collection `reviews`, document id = `userId` (garantit un avis par compte : `set()` écrase l'avis existant au lieu de dupliquer).
- Lecture : `collection('reviews').orderBy('createdAt', 'desc').get()`.

### Mode localStorage (repli, comme `cart.js`)

- Clé `ssc_reviews`, tableau d'objets avis, même structure.
- Écriture : remplace l'entrée existante si `userId` déjà présent (même règle d'unicité).

### API du module

```js
Reviews.init()                       // injecte bouton + écoute les avis, appelé au chargement de page
Reviews.submit(rating, comment)      // crée/met à jour l'avis de l'utilisateur connecté
Reviews.getMine()                    // retourne l'avis existant de l'utilisateur connecté (ou null)
Reviews.getAll()                     // retourne tous les avis triés (Promise)
```

---

## Composant 2 — Interface

### Bouton "Laisser un avis"

- Ajouté dans le header de la section `#temoignages`, à côté du sous-titre.
- Si utilisateur **non connecté** : clic ouvre le modal de connexion existant (`auth.js`), avec un message contextuel ("Connecte-toi pour laisser un avis").
- Si utilisateur **connecté sans avis existant** : libellé "Laisser un avis" → ouvre le modal de soumission, vide.
- Si utilisateur **connecté avec avis existant** : libellé "Modifier mon avis" → ouvre le modal pré-rempli avec sa note/commentaire actuels.

### Modal de soumission

- 5 étoiles cliquables (survol = aperçu, clic = sélection), texte requis indiquant la note actuelle sélectionnée.
- Zone de texte, compteur de caractères (300 max), bouton "Envoyer" désactivé tant que note + commentaire non remplis.
- Confirmation visuelle après envoi (toast ou message inline), fermeture automatique du modal.
- Réutilise les classes CSS de `cart.css` (`.auth-modal`, `.auth-backdrop`) pour la cohérence visuelle et éviter de dupliquer du code.

### Affichage des avis

- Les 5 témoignages statiques existants restent en première position, inchangés.
- Les avis dynamiques (Firestore/localStorage) sont ajoutés à la suite dans `.testimonials-grid`, triés du plus récent au plus ancien, rendus avec la même structure `.testi-card` (avatar = initiales du nom, étoiles affichées au-dessus du commentaire).
- Note moyenne globale (ex. "4.8 ★ · 23 avis") affichée dans le header de section, calculée uniquement sur les avis dynamiques (les témoignages statiques n'ont pas de note et ne sont pas comptés). N'apparaît que s'il y a au moins 1 avis dynamique.

---

## Erreurs & cas limites

- **Pas de modération** : publication immédiate dès l'envoi (choix utilisateur confirmé).
- **Utilisateur non connecté tente de soumettre** : impossible, le bouton route vers la connexion en amont — pas de cas à gérer côté soumission.
- **Avis vide ou note manquante** : bouton "Envoyer" reste désactivé, pas de validation serveur nécessaire (pas de serveur).
- **Échec Firestore** (réseau, permissions) : repli silencieux sur localStorage, même logique que `cart.js`/`b2b-orders.js`.

---

## Hors scope (YAGNI)

- Modération / suppression d'avis par un admin (peut être ajouté plus tard si besoin constaté).
- Réponse du commerçant à un avis.
- Avis avec photos.
- Avis liés à un produit spécifique (uniquement avis général sur le service, comme les témoignages actuels).
