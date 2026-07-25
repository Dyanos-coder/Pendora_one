# Architecture application PC — Electron + React, multi-tenant sectoriel

*Suite de [Resume-Pandora-One.md](Resume-Pandora-One.md) — traduction technique de la vision "Core + Modules sectoriels" (§2.1, §2.8) et "Serveur local / Offline-first" (§6) du cahier des charges.*

## 1. Validation de ton idée

### Ce qui est bon (à garder tel quel)

- **Electron + React** : bon choix. Cross-platform Windows/Mac/Linux, écosystème mature, et ça te permet de réutiliser des composants/logique avec une éventuelle version web plus tard.
- **Socle commun + divergences sectorielles dans des dossiers séparés** : c'est exactement la bonne architecture. Ça s'appelle une **architecture modulaire / plugin**, et c'est le seul moyen réaliste de tenir la promesse du cahier des charges ("chaque module sectoriel hérite automatiquement de toute l'intelligence du Core, sans développement spécifique supplémentaire").
- **Une base de données dédiée par entité cliente** : c'est un pattern multi-tenant **reconnu et éprouvé**, appelé *"silo model"* (ou *"database-per-tenant"*). Ce n'est pas une improvisation — c'est ce que font beaucoup de logiciels SaaS professionnels quand l'isolation des données est importante (et elle l'est énormément pour toi : données médicales du module Santé, données financières, etc.). Ce choix colle aussi parfaitement avec le "Serveur local" du cahier des charges (§6.2) : chaque client peut littéralement avoir sa DB en local chez lui.
- **Login → récupération de l'identité → routage vers la bonne DB → connexion avec le bon rôle** : c'est le bon flux, c'est ainsi que fonctionnent les vrais systèmes multi-tenant à DB séparée.

### Ce qu'il faut ajuster

1. **"Une BD par secteur qui garde la liste des users de ce secteur"** → à corriger légèrement. Ne segmente pas l'annuaire des utilisateurs *par secteur*, segmente-le *par client (tenant)*. Pourquoi : le cahier des charges dit explicitement que Pandora One doit accompagner une entreprise "sans jamais nécessiter de changer d'outil" — y compris si elle grandit et active un deuxième secteur (ex : une clinique qui ouvre aussi une pharmacie, un commerce qui ajoute un module RH). Si l'annuaire est cloisonné par secteur, un client multi-secteurs devient un problème à gérer à la main.
   → **Solution** : un seul **annuaire central (Identity/Tenant Directory)**, avec pour chaque *tenant* (= entreprise cliente) une liste des secteurs/modules qu'elle a activés. Le secteur n'est plus une clé de routage vers un annuaire différent, c'est un attribut du tenant.

2. **Installeur "on choisit le secteur et ça installe que ça"** → possible, mais réfléchis au coût. Deux options, à trancher toi-même (voir §4.1) :
   - **Option A (recommandée pour démarrer)** : un seul installeur universel qui embarque tous les modules sectoriels déjà développés, mais où seul le module payé/activé par licence est déverrouillé. Plus simple à maintenir, un seul pipeline de build, upsell facile plus tard ("active le module Restauration").
   - **Option B** : un installeur différent par secteur (le module Santé n'est même pas présent dans le binaire d'un client Retail). Plus lourd à maintenir (autant de builds que de secteurs) mais plus léger côté client et plus étanche si tu vends aussi du code à des revendeurs.

3. **Manques à combler dans ta description** (normal, tu n'avais pas encore creusé) :
   - Comment on se connecte **hors-ligne** une fois qu'on s'est déjà connecté une fois (le cahier des charges l'exige, §6).
   - Comment on gère les **rôles/permissions** une fois routé vers la bonne DB (RBAC).
   - Comment on empêche un client d'activer un module sectoriel qu'il n'a pas payé (licence).
   - Comment on protège les données sensibles en local (chiffrement du fichier de DB sur le PC — critique pour le module Santé).

## 2. Vue d'ensemble

```
                         ┌─────────────────────────────┐
                         │   ANNUAIRE CENTRAL (cloud)   │
                         │  users / tenants / memberships│
                         │  / modules activés / licences │
                         └──────────────┬───────────────┘
                                        │ résolution identité
                                        │ (au login, avec internet)
                                        ▼
   ┌────────────────────────────────────────────────────────────────┐
   │                     APP PC ELECTRON + REACT                     │
   │  ┌────────────┐   ┌───────────────────────────────────────┐    │
   │  │   CORE      │   │  MODULES SECTORIELS (plugins)         │    │
   │  │  auth, RBAC,│   │  santé / retail / restauration / RH...│    │
   │  │  sync, UI   │   │  chacun: schéma DB + écrans + règles  │    │
   │  │  shell      │   │  métier, se greffe sur le Core         │    │
   │  └─────┬───────┘   └───────────────────────────────────────┘    │
   │        │                                                        │
   │        ▼                                                        │
   │  ┌─────────────────────────┐                                    │
   │  │  DB LOCALE DU TENANT     │  ← 1 fichier DB par entreprise    │
   │  │  (SQLite chiffrée)       │     cliente, isolée               │
   │  └─────────┬────────────────┘                                   │
   └────────────┼──────────────────────────────────────────────────┘
                │ file de synchronisation (queue), dès que réseau dispo
                ▼
   ┌────────────────────────────────────────────────────────────────┐
   │        BACKEND CLOUD (multi-tenant, 1 schéma Postgres/tenant)    │
   └────────────────────────────────────────────────────────────────┘
```

## 3. Pourquoi "DB par tenant" est le bon choix (et pas les autres modèles)

Il existe 3 façons standard de faire du multi-tenant. Je te les mets pour que tu voies que ton instinct correspond au bon choix, pas au plus simple :

| Modèle | Description | Adapté à Pandora One ? |
|---|---|---|
| **A. DB unique partagée** (colonne `tenant_id` dans chaque table) | Tous les clients dans la même base | ❌ Non — mauvaise isolation (un bug de filtre = fuite de données médicales entre cliniques), incompatible avec le mode hors-ligne par client |
| **B. Un schéma par tenant** (même moteur DB, schémas séparés) | Isolation moyenne, mutualisation des ressources serveur | ✅ Bon compromis côté **cloud** (backend), pour ne pas gérer des centaines d'instances Postgres séparées |
| **C. Une DB par tenant** (ce que tu proposes) | Isolation maximale, chaque client a sa base | ✅✅ Le bon choix côté **app locale** (chaque PC/serveur local a la DB d'une seule entreprise) |

**Recommandation concrète** : modèle C en local (chaque installation Electron ne connaît qu'un seul tenant à la fois, sa propre DB SQLite), modèle B côté cloud (un schéma Postgres par tenant, pour ne pas exploser le nombre d'instances de bases à gérer). C'est ce qui donne le meilleur équilibre isolation/coût d'exploitation.

## 4. Architecture détaillée

### 4.1 Structure du projet (monorepo)

```
pandora-one/
├── apps/
│   └── desktop/                 # l'app Electron (shell + bootstrap React)
├── packages/
│   ├── core/                    # socle commun
│   │   ├── auth/                # login, résolution tenant, session
│   │   ├── rbac/                # rôles & permissions
│   │   ├── sync/                # moteur de synchronisation offline
│   │   ├── db/                  # schéma Prisma de base (users, tenants locaux, audit log...)
│   │   └── ui-shell/            # dashboard, Control Tower, navigation
│   ├── modules/
│   │   ├── sante/                # schéma + écrans + règles métier du secteur santé
│   │   ├── retail/
│   │   ├── restauration/
│   │   ├── rh/
│   │   └── ...
│   ├── shared-ui/               # composants React réutilisés par tous les modules
│   └── shared-types/            # types TypeScript partagés (contrat entre core et modules)
└── services/
    └── api-cloud/                # backend NestJS (annuaire central + sync + API)
```

**Le contrat Core ↔ Module** (important, c'est ce qui rend le système "vraiment" modulaire et pas juste des dossiers séparés) : chaque module exporte un objet standard, par exemple :

```ts
export const santeModule: PandoraModule = {
  id: "sante",
  schemaExtension: santePrismaSchema,   // tables ajoutées à la DB du tenant
  routes: santeRoutes,                  // écrans React ajoutés à la navigation
  permissions: santePermissions,        // rôles/droits ajoutés au RBAC
  automations: santeAutomations,        // règles Automation Engine spécifiques (ex: alerte péremption)
}
```

Le Core charge dynamiquement la liste des modules activés pour le tenant courant et les "branche" — c'est ça qui permet à un module de "bénéficier automatiquement de toute la couche d'intelligence du Core" comme demandé dans le cahier des charges.

### 4.2 Flux de connexion (détaillé, avec le hors-ligne)

1. L'utilisateur ouvre l'app, saisit email/téléphone + mot de passe (ou code PIN si reconnexion rapide).
2. **Si en ligne** : l'app appelle l'annuaire central (`/auth/resolve`) → renvoie la/les entreprise(s) (tenants) auxquelles cet utilisateur appartient, son rôle dans chacune, et un token de session signé (JWT).
3. Si l'utilisateur appartient à un seul tenant → sélection automatique. Sinon → écran de choix (utile pour un comptable qui gère plusieurs clients par ex.).
4. L'app vérifie si la DB locale de ce tenant existe déjà sur ce PC :
   - Si oui → l'ouvre directement (SQLite locale).
   - Si non (première connexion sur ce poste) → télécharge un instantané initial depuis le cloud et crée la DB locale.
5. Le token + l'ID du tenant + le rôle sont mis en cache de façon sécurisée (via le coffre du système d'exploitation, ex. `keytar`), avec une durée de validité étendue (ex. 30 jours).
6. **Si hors-ligne** : l'app vérifie le token en cache localement (signature + expiration) plutôt que d'appeler le serveur → connexion possible sans réseau, tant que le token n'a pas expiré. Au-delà de l'expiration, ré-authentification en ligne obligatoire (sécurité).
7. Une fois connecté, le Core applique le RBAC : seuls les écrans/actions autorisés pour le rôle de l'utilisateur sont visibles (cf. règle §3.2 du cahier des charges : "chaque personne voit uniquement ce qui la concerne").

### 4.3 Synchronisation offline-first

- Toute écriture locale passe par une **table de file d'attente** (`sync_outbox`) avant/en même temps que son écriture réelle.
- Dès que la connexion revient, un worker envoie les opérations en attente au backend, dans l'ordre, avec reprise automatique en cas d'échec partiel (conforme §6.3 du cahier des charges).
- Conflits (ex: deux ventes sur le dernier article en stock, faites sur deux postes différents hors-ligne) → règle par défaut "premier synchronisé, premier servi" + une entrée dans le Centre d'alertes pour arbitrage manuel (conforme §6.5).
- Ne réinvente pas tout à la main si tu peux l'éviter : regarde **PowerSync** ou **ElectricSQL** — ce sont des outils conçus spécifiquement pour synchroniser une DB locale (SQLite) avec un Postgres cloud en mode offline-first, avec gestion de conflits intégrée. Ça peut t'économiser plusieurs mois de développement sur cette seule brique.

### 4.4 Sécurité & licence

- **Chiffrement de la DB locale** : utilise SQLCipher (variante chiffrée de SQLite) plutôt que du SQLite en clair, surtout pour le module Santé (données médicales, obligation de confidentialité §5.9.21).
- **Licence/entitlement** : un token de licence signé (émis par ton backend), stocké et vérifié au démarrage de l'app, qui liste les modules que ce tenant a le droit d'utiliser. Le Core refuse de charger un module non autorisé même s'il est physiquement présent dans le binaire (pertinent si tu choisis l'Option A de l'installeur unique, §1 point 2).
- **RBAC** : matrice rôle → permissions définie dans le Core, chaque module ne fait qu'*ajouter* des permissions à cette matrice, jamais la contourner. Règle à respecter : un utilisateur ne peut jamais s'auto-attribuer un rôle supérieur (§3.2).
- **Audit log** : toute action significative journalisée en local puis synchronisée, journal non modifiable (§3.8) — à construire comme une table "append-only" dès le départ (triggers DB qui interdisent UPDATE/DELETE).

## 5. Stack technique recommandée

| Brique | Recommandation | Pourquoi |
|---|---|---|
| Shell desktop | **Electron** | Ton choix, confirmé — mature, cross-platform |
| UI | **React + TypeScript** | TypeScript quasi obligatoire vu la taille du projet (socle + N modules) : le typage protège le contrat Core↔Module |
| Bundler renderer | **Vite** | Démarrage/HMR rapide en dev, standard actuel avec Electron |
| État applicatif | **Zustand** (ou Redux Toolkit si tu préfères plus de structure) | Léger, simple à combiner avec un système de plugins |
| ORM | **Prisma** | Un seul schéma décrit en TypeScript, utilisable à la fois en SQLite (local) et Postgres (cloud) — énorme gain pour ton architecture locale/cloud dupliquée |
| DB locale | **SQLite (chiffré via SQLCipher)** | Embarquée, zéro serveur à gérer sur le PC du client — correspond au "serveur local" léger pour une petite structure |
| DB locale (variante multi-poste) | **PostgreSQL sur un des postes / mini-serveur** | Pour un client avec plusieurs postes (ex: une clinique) : un PC fait office de "serveur local" (§6.2), les autres s'y connectent en réseau local |
| Sync offline-first | **PowerSync ou ElectricSQL** (sinon moteur maison basé sur `sync_outbox`) | Évite de réinventer la synchro + résolution de conflits |
| Backend cloud | **NestJS (Node.js/TypeScript) + PostgreSQL** | Structuré, modulaire, cohérent avec Prisma ; schéma Postgres séparé par tenant |
| Auth | **JWT + refresh token**, stockage sécurisé via **keytar** (coffre OS) | Permet la reconnexion hors-ligne en toute sécurité |
| Monorepo | **Turborepo** (ou Nx) | Gérer proprement `core` + `modules/*` + `apps/desktop` + `services/api-cloud` dans un seul repo, avec cache de build |
| Packaging/installeur | **electron-builder** (+ **electron-updater** pour les mises à jour auto) | Standard de l'écosystème Electron, génère `.exe` (NSIS), `.dmg`, `.AppImage` |
| Tests | **Vitest** (unitaire) + **Playwright** (bout-en-bout sur l'app Electron) | Couverture du Core critique (auth, sync, RBAC) |
| CI/CD | **GitHub Actions** | Build multi-plateforme, tests, release automatique |

## 6. Plan de développement (par phases)

### Phase 0 — Fondations (2-3 semaines)
- Monter le monorepo (Turborepo), squelette `apps/desktop` (Electron + React + Vite qui démarre).
- Définir le contrat `PandoraModule` (interface TypeScript) même vide de contenu métier.
- Schéma Prisma de base : `User`, `Tenant`, `Membership`, `Role`, `Permission`, `AuditLog`, `SyncOutbox`.

### Phase 1 — Core : auth + RBAC + DB locale (3-4 semaines)
- Backend `api-cloud` minimal : endpoint `/auth/resolve`, gestion des tenants/utilisateurs.
- Flux de connexion complet décrit en §4.2 (en ligne d'abord, hors-ligne ensuite).
- RBAC fonctionnel : un rôle "dirigeant" vs un rôle "employé" avec écrans différents, pour valider le mécanisme avant d'avoir de vrais modules.
- Chiffrement DB locale (SQLCipher) branché dès cette phase — beaucoup plus dur à ajouter après coup.

### Phase 2 — Premier module sectoriel de bout en bout (4-6 semaines)
- Choisis **un seul secteur** pour prouver l'architecture (suggestion : Retail, plus simple que Santé pour valider le pattern avant d'attaquer le module le plus complexe).
- Implémente-le en respectant strictement le contrat Core↔Module — c'est le test réel de ton architecture "socle + divergences".
- Écran d'installation/activation de module (choix du secteur), même en version simplifiée.

### Phase 3 — Synchronisation offline-first (3-5 semaines)
- Brancher PowerSync/ElectricSQL (ou moteur maison) sur le module Retail déjà fait.
- Tester sérieusement les scénarios de coupure réseau et de conflit (§6.5 du cahier des charges).

### Phase 4 — Deuxième module + généralisation (variable)
- Ajouter un 2e secteur (ex: Restauration) **sans toucher au Core** — si tu dois modifier le Core pour faire rentrer le 2e module, c'est le signal que le contrat Phase 0 était mal conçu, à corriger avant d'aller plus loin.
- À partir de là, le module Santé (le plus gros, 23 briques du cahier des charges) peut être découpé en plusieurs sous-livraisons.

### Phase 5 — Licence, packaging, distribution
- Système de licence/entitlement (§4.4).
- Installeur electron-builder + auto-update.
- Décision finale Option A/B de l'installeur (§1) — à trancher avec le retour terrain des 2 premiers modules.

## 7. Risques & points de vigilance

- **Ne code pas le module Santé en premier.** C'est le plus complexe (23 sous-domaines) et si le Core est mal pensé, tu le découvriras à un moment où tu as déjà beaucoup investi dans ce module. Valide l'architecture sur un secteur plus simple d'abord.
- **Le contrat Core↔Module doit être écrit avant le premier module métier**, pas découvert au fur et à mesure — sinon tu te retrouves avec du code sectoriel qui triche et accède directement à des détails internes du Core, et tu perds l'objectif "un module se greffe sans jamais devoir reconstruire le Core" (§2.1).
- **Décide tôt** si l'app locale doit supporter plusieurs tenants sur un même poste (ex: un comptable multi-clients) ou un seul — ça influence toute la conception de la couche DB locale (un fichier SQLite par tenant, avec bascule, vs un seul).
- **Chiffrement et audit log** sont plus faciles à faire dès le départ qu'à ajouter après — surtout pertinent pour toi vu le secteur Santé prioritaire.
