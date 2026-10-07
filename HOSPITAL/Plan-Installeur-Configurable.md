# Plan — Installeur configurable (modules à cocher + URL du backend par hôpital)

**Implémenté (option B) — voir §6 tout en bas pour le détail et les vérifications faites.**

*Rédigé le : 2026-09-21*

---

## 1. Un point d'architecture à clarifier avant tout

**L'installeur ne peut pas "faire le seed vers la BD du backend".** L'installeur (le `.exe` généré par electron-builder) s'exécute sur le PC de l'hôpital et installe `app-core` (l'appli de bureau). Le seed, lui, doit s'exécuter côté `app-server` — un serveur distant, potentiellement sur une autre machine (hébergement web). L'installeur n'a aucun accès à cette machine-là : il ne peut pas lancer une commande dessus.

Ce que l'installeur PEUT faire : configurer `app-core` pour qu'il sache à quelle URL de backend se connecter, et éventuellement quels modules afficher dans sa navigation. Le seed, lui, doit passer par une requête HTTP envoyée par l'app APRÈS l'installation (vers le serveur déjà en ligne), pas par l'installeur lui-même. C'est un déroulement en deux temps qu'il faut bien distinguer :

1. **Déploiement du serveur** (fait une fois par hôpital, manuel, avant de distribuer l'installeur) : quelqu'un met en ligne une instance `app-server` dédiée à cet hôpital, avec sa propre base MySQL, applique les migrations, et crée au moins un premier compte DIRIGEANT (comment exactement — voir §5, point ouvert). Ce n'est pas dans le périmètre de ce chantier.
2. **Installation du poste** (fait sur chaque PC de l'hôpital, ce que ce chantier couvre) : l'installeur pose `app-core`, on lui indique l'URL du serveur de CET hôpital (déjà en ligne, étape 1 déjà faite) et les modules à afficher. Au premier lancement, un DIRIGEANT se connecte et peut déclencher le seed des modules choisis — une requête vers le serveur déjà déployé, pas une action de l'installeur.

## 2. Ce qui existe déjà, et ce qu'il faut construire

| Brique | État actuel |
| --- | --- |
| URL du backend | Lue dans `process.env['PANDORA_HEALTH_API_URL']` au runtime (pas au build), retombe sur `http://localhost:3001` si absent. Aucun `.env` n'est embarqué dans le paquet installé (exclu explicitement par `electron-builder.yml`) — **aujourd'hui, une version installée ne peut jamais pointer ailleurs que localhost**. |
| Modules | `MODULES_STATUS` (Paramètres) est un simple affichage, sans effet réel — rien dans le code ne filtre la navigation ou les fonctionnalités selon cette valeur. |
| Seed | `app-server/prisma/seed.ts` : 24 fonctions `seedX()` indépendantes (une par domaine), déjà bien découpées — elles se regroupent naturellement selon les 6 modules de la navigation (ex. `seedPatients`/`seedAppointments`/`seedConsultations`/... → "Soins & Patients"). Mais : (a) appelées toutes ensemble sans condition aujourd'hui, (b) pas uniformément sûres à rejouer (certaines vérifient juste "si la table n'est pas vide, ne rien faire" plutôt que d'insérer proprement ligne par ligne), (c) seulement invocable en ligne de commande sur le serveur (`prisma db seed`), pas via une requête HTTP. |
| Installeur Windows | NSIS par défaut (`electron-builder.yml`), en mode "one-click", aucune page personnalisée. |

## 3. Deux façons de poser les questions à l'utilisateur — recommandation

### Option A — Dans l'installeur Windows lui-même (ce qui a été demandé)

Des pages NSIS personnalisées (cases à cocher, champ texte pour l'URL) via un script `.nsh` custom (`oneClick: false` + hooks NSIS). Techniquement faisable, mais :
- NSIS ne peut pas appeler une API facilement pour valider l'URL en direct (vérifier que le serveur répond avant de continuer) — on ne saurait qu'après le premier lancement si l'URL saisie est correcte.
- Pas de retour visuel pendant un seed (qui peut prendre du temps) — l'installeur a déjà fini sa tâche à ce moment-là.
- C'est un langage de script assez daté et peu pratique à maintenir/tester, très différent du reste du projet (React partout ailleurs).

### Option B — Un écran de configuration initiale DANS l'application, au premier lancement (recommandée)

L'installeur reste simple (par défaut, sans pages custom). Au tout premier lancement de l'app (avant l'écran de connexion), un assistant en React demande l'URL du backend et les modules — avec :
- Test de connexion en direct (`GET /health`) avant de valider l'URL, message d'erreur clair si le serveur ne répond pas.
- Une fois l'URL validée et un DIRIGEANT connecté, proposition de lancer le seed des modules cochés, avec une vraie barre de progression/retour d'erreur (pas possible en NSIS).
- Réutilise tout ce qui existe déjà (React, `window.api`, style de l'app) plutôt que d'introduire un nouveau langage de script.

C'est le même choix que l'app a déjà fait ailleurs (ex. la modale de sauvegarde/restauration, elle aussi dans l'app plutôt que dans l'installeur). Je recommande l'option B — dites-moi si vous préférez qu'on parte quand même sur l'option A.

## 4. Architecture proposée (option B)

### 4.1 Configuration locale persistante

Un petit fichier JSON local (hors base de données), par exemple `app.getPath('userData')/config.json` :

```json
{
  "backendUrl": "https://hopital-x.pandorahealth.example",
  "enabledModules": ["soins-patients", "examens", "medicaments-stocks"],
  "setupComplete": true
}
```

- `remote-api.client.ts` et `connectivity.service.ts` lisent cette valeur en priorité (repli sur `PANDORA_HEALTH_API_URL`/`localhost:3001` seulement si absente — pratique pour le développement).
- Si `setupComplete` est faux ou le fichier n'existe pas encore : l'app affiche l'assistant de configuration initiale avant l'écran de connexion habituel.
- Modifiable ensuite depuis Paramètres (pas seulement au premier lancement) — pour corriger une URL, ou activer un module plus tard.

### 4.2 Filtrage de la navigation par module

`AppShell.tsx` filtre son tableau `NAV` (6 groupes) selon `enabledModules` — même principe que le filtrage déjà fait cette session pour cacher "Utilisateurs & rôles" aux rôles non autorisés : une ligne de `.filter(...)`, pas une réécriture.

### 4.3 Compte DIRIGEANT par défaut — bootstrap automatique côté serveur

**Décidé : pas de données de démo pour un vrai hôpital.** Un serveur fraîchement déployé doit juste avoir un compte pour pouvoir se connecter la première fois — rien d'autre. Au démarrage d'`app-server` (ou via un script exécuté une fois au déploiement), si la table `Company` est vide (base neuve) :
- Créer une `Company` par défaut (nom générique, ex. "Nouvel établissement" — modifiable ensuite via Paramètres → Établissement, déjà fonctionnel).
- Créer un `User` DIRIGEANT par défaut avec un identifiant/mot de passe connus et documentés (ex. `admin@pandorahealth.local` / un mot de passe par défaut affiché dans la doc de déploiement), à changer dès la première connexion.

Ce bootstrap remplace l'actuel `seed.ts` pour un déploiement hôpital réel — `seed.ts` reste tel quel pour vos propres environnements de démo (peuplé à la main quand vous en avez besoin, pas déclenché depuis l'app).

À la première connexion, le DIRIGEANT peut changer son mot de passe (déjà possible, `ChangePasswordModal`) et son email — actuellement seuls nom/rôle/statut actif sont modifiables via `PATCH /users/:id`, il faut y ajouter l'email (petit ajout).

### 4.4 Sélection des modules — arborescence groupe/écran

**Décidé : par écran ET par groupe**, comme des dossiers/sous-dossiers. Chaque groupe de la navigation (Soins & Patients, Examens & plateau technique, Médicaments & Stocks, Administration, Gouvernance & Qualité, Intelligence & Pilotage) devient une entrée dépliable :
- Cocher un groupe entier = coche tous les écrans qu'il contient.
- Décocher un seul écran à l'intérieur d'un groupe laisse les autres cochés (le groupe passe à un état "partiellement coché" visuellement, comme une case à cocher indéterminée classique).

Stocké comme une simple liste d'identifiants d'écran dans `enabledModules` (pas d'identifiants de groupe séparés — un groupe "entièrement coché" se déduit du fait que tous ses écrans y sont).

### 4.5 Assistant de configuration initiale (renderer)

Nouvel écran, avant `LoginScreen` si `!setupComplete` :
1. Étape 1 — URL du serveur : champ texte, bouton "Tester la connexion" (`GET /health`), ne continue que si succès.
2. Étape 2 — Connexion (réutilise `LoginScreen` existant) avec le compte DIRIGEANT par défaut (§4.3) ou déjà personnalisé.
3. Étape 3 — Modules : arborescence groupe/écran (§4.4), tout coché par défaut.
4. Écrit `config.json` (`setupComplete: true`), puis bascule sur l'app normale.
5. Un rappel non bloquant ("Pensez à changer le mot de passe par défaut") s'affiche tant que le mot de passe par défaut n'a pas été changé — pas forcé dans l'assistant lui-même, pour rester rapide, mais visible.

Modules reconfigurables plus tard, pas seulement au premier lancement : la section "Modules activés" de Paramètres (déjà là, actuellement un simple statut) devient l'arborescence éditable en continu.

---

## 6. Fait — détail de l'implémentation et vérifications (2026-09-21)

**Serveur** :
- `app-server/src/services/bootstrap.service.ts` — crée automatiquement une `Company` générique + un compte DIRIGEANT par défaut (`admin@pandorahealth.local` / `ChangeMoi1234`) au démarrage si la base est complètement vide. Appelé dans `index.ts` après `app.listen`.
- `email` ajouté à `UpdateUserInput`/`updateUser()` (validation format + unicité côté route).

**app-core (main)** :
- `remote-api.client.ts` : `API_URL` devient une variable modifiable (`getApiUrl()`/`setApiUrl()`) au lieu d'une constante figée au démarrage — `connectivity.service.ts` réutilise la même source.
- `app-config.service.ts` (nouveau) : lit/écrit `userData/config.json` (`backendUrl`, `enabledModules`, `setupComplete`), applique l'URL stockée au démarrage, teste une URL candidate (`GET /health`) indépendamment de la config déjà enregistrée.
- IPC/preload : `window.api.setup.{getConfig, saveConfig, testConnection}`.

**app-core (renderer)** :
- `shared/setup-types.ts` : `MODULE_GROUPS` (6 groupes, 24 écrans — miroir à jour de `AppShell.tsx::NAV`).
- `components/ModuleTree.tsx` : arborescence groupe/écran réutilisable, case de groupe à 3 états (coché/décoché/indéterminé).
- `features/setup/SetupWizard.tsx` : URL → connexion (réutilise `LoginScreen`, passe par le même `useAuth()` que le reste de l'app) → modules → écrit la config.
- `App.tsx` : affiche l'assistant tant que `!setupComplete`, transmet `enabledModules` à `AppShell`.
- `AppShell.tsx` : filtre `NAV` par écran (`settings` toujours visible), bandeau d'alerte si le compte encore utilisé est le compte par défaut.
- Paramètres → "Modules activés" : même `ModuleTree`, éditable en continu (plus un simple statut).
- Paramètres → "Utilisateurs & rôles" : icône crayon pour modifier nom/email de son propre compte (ou de n'importe quel compte, pour un DIRIGEANT) — `EditUserModal.tsx`.

**Vérifié réellement** (app construite, serveur réel) :
- Assistant complet de bout en bout : URL testée avec succès → connexion avec le compte démo → arborescence de modules → `config.json` écrit avec le bon contenu → bascule sur l'app normale.
- Décocher un seul écran ("Pharmacie") sans toucher au reste de son groupe → sauvegarde → rechargement de l'app → l'écran a bien disparu de la navigation, les autres écrans du même groupe ("Stocks", même groupe "Médicaments & stocks") sont restés visibles. Confirme le filtrage par écran, pas seulement par groupe.
- Remis "Pharmacie" dans l'état normal (coché) après le test.

**Non vérifié en conditions réelles** : le bootstrap automatique (`bootstrapIfEmpty`) lui-même n'a pas pu être testé contre une base réellement vide — vider les tables `company`/`user` pour simuler un serveur neuf a été bloqué par la protection anti-suppression-massive de l'environnement (à raison, même avec une sauvegarde prête). Le code suit exactement le même mécanisme déjà éprouvé pour la création de compte (`users.service.ts::createUser`, testé plus tôt cette session) — risque jugé faible, mais à garder en tête avant un vrai premier déploiement chez un hôpital : vérifier ce chemin sur un serveur de test dédié, pas sur une base partagée.

Typecheck et lint propres sur les deux projets (app-core et app-server) après l'ensemble de ces changements.
