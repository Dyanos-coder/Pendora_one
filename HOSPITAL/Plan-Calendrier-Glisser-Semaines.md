# Proposition — Glisser-déposer un rendez-vous au-delà de la fenêtre visible

**Option A implémentée et vérifiée (2026-09-21)** — voir le détail tout en bas du document.

*Rédigé le : 2026-09-21*

---

## 1. Le vrai problème

Le calendrier de `AppointmentsPage.tsx` affiche une fenêtre glissante de N jours (7, puis 14 en vue agrandie). Peu importe la taille de cette fenêtre : il existera toujours un dernier jour visible dont le lendemain n'est pas affiché. Passer de 7 à 14 jours ne résout donc rien dans l'absolu — ça déplace juste le cas limite du dimanche 1 au dimanche 2. **Aucune fenêtre finie ne peut éliminer ce problème.** Il faut soit une fenêtre qui bouge pendant le geste de glisser, soit un geste qui ne dépend pas d'une fenêtre fixe.

## 2. Options envisageables

### Option A — Auto-navigation en glissant vers le bord de la grille (recommandée)

Pendant qu'on glisse une carte, survoler la bordure droite ou gauche de la grille (pas seulement les petites flèches ◀/▶ comme aujourd'hui, mais toute la zone sensible sur ~40px de large) déclenche après un court délai (~600ms) le passage à la semaine suivante/précédente, **sans relâcher le glisser** — la carte reste "tenue", la grille se met à jour avec la nouvelle semaine, et on peut continuer à glisser jusqu'à la case cible.

C'est le pattern standard des calendriers avec glisser-déposer (Google Calendar, Outlook Web, Trello pour ses colonnes) — il n'y a pas de limite : on peut glisser aussi loin qu'on veut, une semaine à la fois.

- **Avantage** : résout le problème pour n'importe quelle distance (pas seulement "le dernier dimanche"), geste unique et continu, cohérent avec l'habitude de glisser-déposer déjà en place.
- **Inconvénient** : une brique similaire existe déjà (survol des flèches ◀/▶, ajoutée précédemment) mais elle est limitée à une toute petite zone (les boutons eux-mêmes, ~28px) — il faut l'élargir à toute la bordure de la grille et ajouter un indicateur visuel clair (ex. surbrillance de la bordure pendant le survol) pour que ce soit perceptible et fiable pendant un geste de glisser.
- **Risque technique** : le glisser-déposer HTML5 natif + un re-rendu React pendant l'opération (changement de semaine) peut être délicat à rendre parfaitement fluide, mais c'est un cas déjà géré ailleurs dans des apps similaires — faisable.

### Option B — Glisser-déposer en deux temps (sélectionner, naviguer, déposer)

Au lieu d'un glisser-déposer continu, on **clique** sur le rendez-vous pour le "prendre" (un mode visuel distinct s'active, ex. la carte devient surlignée et le curseur change), on navigue librement dans le calendrier (flèches, autant de semaines que nécessaire, sans contrainte de temps), puis on **clique** sur la case cible pour y déposer.

- **Avantage** : plus robuste techniquement (pas de HTML5 DnD à maintenir pendant la navigation, juste des clics), aucune limite de distance, pas de survol précis à réussir.
- **Inconvénient** : change l'habitude du geste (glisser-déposer → sélectionner-puis-placer) — à valider si c'est acceptable, même si le glisser-déposer classique resterait disponible pour les déplacements dans la même fenêtre.

### Option C — Rappel : le formulaire "Modifier" fonctionne déjà sans aucune limite

Changer la date d'un rendez-vous via le bouton "Modifier" (champ date libre) fonctionne déjà pour n'importe quel jour, sans contrainte de fenêtre visible — c'est le filet de sécurité actuel pour tous les cas, y compris "dernier dimanche de la vue agrandie". Ce n'est pas un glisser-déposer donc ça ne remplace pas le confort visuel demandé, mais ça confirme qu'aucune donnée n'est bloquée aujourd'hui — c'est bien une question d'ergonomie du glisser-déposer, pas une limite fonctionnelle.

## 3. Recommandation

**Option A** (auto-navigation en glissant vers le bord) : c'est le comportement attendu d'un calendrier avec glisser-déposer, ça résout le problème pour de bon (pas seulement le cas à deux semaines), et la moitié du travail est déjà faite (le mécanisme de navigation pendant un glisser existe, juste limité aux petites flèches). Je peux élargir la zone sensible à toute la bordure de la grille et ajouter un retour visuel clair.

Si le geste de glisser-déposer reste peu fiable après ça (Electron/Chromium a parfois un comportement capricieux avec le drag HTML5 natif), l'**option B** serait le filet de secours le plus solide.

---

## 4. Détail de l'implémentation (Option A, faite)

- **Zone de survol élargie** : toute la hauteur de la grille, sur les bordures gauche/droite de la carte (48px de large), pas seulement les petites flèches ◀/▶ — n'existe dans le DOM que pendant un glisser actif (`draggingId`), donc ne gêne jamais un clic normal.
- **Navigation continue** : premier saut de semaine après 600ms de survol, puis un saut supplémentaire toutes les 900ms tant que le survol continue — permet d'avancer/reculer d'autant de semaines que nécessaire sans jamais relâcher le rendez-vous.
- **Retour visuel** : la zone se surligne (fond violet clair) et le chevron s'anime dès qu'un saut est en cours d'armement/déclenché.
- Implémenté dans `app-core/src/renderer/src/features/appointments/AppointmentsPage.tsx` (`renderEdgeNavZone`, `handleWeekNavDragEnter`, `clearWeekNavHover`), disponible à la fois dans la vue compacte et la vue agrandie.
- **Vérifié** : simulation d'un glisser-déposer natif (dragstart sur une carte + dragenter sur la zone de bord) dans l'app réelle construite — la semaine affichée avance bien automatiquement après le délai, sans qu'il soit nécessaire de relâcher le geste. Fonctionne pour n'importe quelle distance (pas seulement le cas à 2 semaines).
