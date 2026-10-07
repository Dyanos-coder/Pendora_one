# Plan — Embarquer le backend dans l'application

*Rédigé le : 2026-09-28*

---

## 1. Ce qui est demandé

### Aujourd'hui : 3 morceaux séparés

```
 Poste de l'hôpital                        Internet
┌──────────────────────────┐      HTTP      ┌────────────────────┐      SQL      ┌──────────────┐
│ app-core (Electron)      │ ─────────────► │ app-server         │ ────────────► │ MariaDB      │
│  - interface React       │                │ (Express, Render)  │               │ (distante)   │
│  - base locale SQLite    │ ◄───────────── │  - auth, RBAC      │ ◄──────────── │              │
│    (hors connexion)      │                │  - logique métier  │               │              │
└──────────────────────────┘                └────────────────────┘               └──────────────┘
```

Il faut donc **héberger et maintenir** `app-server` (Render). Cela coûte de l'argent, et le service peut tomber en panne ou s'endormir. Chaque déploiement demande aussi une étape en plus : pousser le code, lancer le build, appliquer les migrations.

### Demain : l'application contient le backend

```
 Poste de l'hôpital                                                     Internet
┌──────────────────────────────────────────────┐          SQL          ┌──────────────┐
│ app-core (Electron)                          │ ────────────────────► │ MariaDB      │
│  - interface React                           │                       │ (distante,   │
│  - backend embarqué (ex app-server)          │ ◄──────────────────── │  partagée)   │
│  - base locale SQLite (hors connexion)       │                       │              │
└──────────────────────────────────────────────┘                       └──────────────┘
```

- **Plus de serveur à héberger.** Le code de `app-server` (routes, services, auth, RBAC, exports Excel/PDF, IA…) tourne à l'intérieur de l'application, dans le processus principal d'Electron.
- **La base MariaDB reste distante et partagée.** Tous les postes de l'hôpital se connectent directement à la même base. C'est elle qui garde les données communes.
- **Le mode hors connexion ne change pas.** La base SQLite locale, la file d'attente des modifications (outbox) et la synchronisation continuent de fonctionner comme aujourd'hui. Seule la cible change : la synchronisation parle au backend embarqué, qui écrit dans MariaDB.

## 2. Ce qui change et ce qui ne change pas

| Élément | Aujourd'hui | Après |
| --- | --- | --- |
| Hébergement Render | Nécessaire | **Supprimé** |
| Base MariaDB distante | Joignable seulement par le serveur | Joignable **par chaque poste** |
| Interface React | Inchangée | Inchangée |
| Base locale SQLite + synchronisation | En place | En place, sans changement de logique |
| `remote-api.client.ts` (≈ 260 fonctions) | Appelle l'URL Render | Appelle le backend embarqué (voir §4) |
| Identifiants de la base | Dans le `.env` du serveur | Dans la configuration **de chaque poste** (chiffrée) |
| Migrations de la base | `prisma migrate deploy` au démarrage sur Render | Lancées par l'application (voir §3.5) |
| Assistant de configuration initiale | Demande l'URL du backend | Demande **les identifiants de la base** (hôte, port, nom, utilisateur, mot de passe) |

## 3. Points d'attention (à lire avant de décider)

L'architecture est faisable et assez simple à mettre en place. Mais retirer le serveur intermédiaire a des conséquences qu'il faut accepter en connaissance de cause.

### 3.1 Sécurité : c'est le point le plus important

Aujourd'hui, **seul le serveur connaît le mot de passe de la base**. Un utilisateur ne peut faire que ce que l'API lui permet : il est authentifié par jeton et limité par son rôle (RBAC).

Après la migration, **chaque poste détient les identifiants de la base**. Même chiffrés sur le disque (via `safeStorage` de Windows, comme la clé de la base locale actuelle), une personne ayant les droits administrateur sur un poste et des compétences techniques peut les récupérer. Elle peut alors se connecter directement à MariaDB, **sans passer par l'authentification ni par les rôles** de l'application. Le RBAC devient une protection de l'interface, pas une protection des données.

Mesures pour limiter le risque (toutes recommandées) :
- **Utilisateur MariaDB dédié à l'application**, avec seulement `SELECT`, `INSERT`, `UPDATE` et `DELETE` sur la base de l'hôpital. Pas de `DROP`, pas de `GRANT`, pas d'accès aux autres bases.
- **Un second utilisateur, réservé aux migrations** (`ALTER`, `CREATE`…), qui n'est jamais enregistré sur les postes. Voir §3.5.
- **Connexion chiffrée (TLS)** obligatoire entre les postes et MariaDB.
- **Liste blanche d'adresses IP** chez l'hébergeur MySQL, si l'hôpital a une IP fixe.
- **Identifiants stockés chiffrés** sur le poste (DPAPI/`safeStorage`) et jamais visibles dans l'interface après la saisie.

Ce modèle est acceptable si **les postes sont maîtrisés par l'hôpital** (parc interne, sessions Windows non administrateur). Il ne l'est pas si l'application doit être installée sur des machines non maîtrisées.

### 3.2 L'hébergeur MySQL doit accepter les connexions distantes

Chez Hostinger, par exemple, il faut activer **« MySQL distant »** et déclarer les IP autorisées, ou `%` pour toutes, ce qui est moins sûr. Certaines offres mutualisées limitent aussi le **nombre de connexions simultanées** : il faut le vérifier avant de choisir l'offre.

### 3.3 Nombre de connexions à la base

Chaque poste ouvre son propre petit pool de connexions. Avec 20 postes et 5 connexions chacun, cela fait 100 connexions. Il faudra **réduire le pool par poste** (2 ou 3 connexions suffisent pour un seul utilisateur) et vérifier le `max_connections` de l'offre.

### 3.4 Tâches périodiques et amorçage

Le serveur actuel lance au démarrage deux traitements qui ne doivent tourner qu'**une seule fois** pour tout l'hôpital :
- `evaluateAutomationRules()`, toutes les 15 min (Automation Studio). Avec 20 postes, les règles seraient évaluées 20 fois, et les actions ou notifications seraient créées en double.
- `bootstrapIfEmpty()`, qui crée le premier compte DIRIGEANT si la base est vide. Si deux postes démarrent en même temps, le compte risque d'être créé deux fois.

→ Solution : un **verrou en base** (`GET_LOCK()` de MariaDB, ou une table `scheduler_lock` avec expiration). Un seul poste à la fois exécute la tâche, et les autres passent leur tour.

### 3.5 Migrations de la base

Aujourd'hui, un seul serveur applique les migrations. Demain, il y aura plusieurs postes, **potentiellement avec des versions différentes de l'application**. Règles proposées :
- Au démarrage, l'application compare la version du schéma en base (table `_prisma_migrations`) avec celle qu'elle attend.
- **Base plus ancienne** : l'application demande les identifiants « migration » (§3.1) à un DIRIGEANT, applique les migrations, puis oublie ces identifiants.
- **Base plus récente** que l'application : blocage avec le message « Mettez à jour l'application ». Cela évite qu'une ancienne version écrive dans un schéma qu'elle ne connaît pas.
- Les migrations restent **uniquement additives** (ajouts de colonnes ou de tables), pour qu'un poste pas encore mis à jour continue de fonctionner quelque temps.

### 3.6 Autres secrets embarqués

- **`JWT_SECRET`** : les jetons ne circulent plus sur le réseau, on peut donc générer une valeur aléatoire par poste au premier lancement. Pas de risque particulier.
- **`GEMINI_API_KEY`** (assistant IA) : elle serait présente sur chaque poste. On peut la saisir dans les Paramètres et la stocker chiffrée, ou la stocker en base dans une table de configuration.
- **Limiteur de requêtes (`express-rate-limit`)** : il ne sert plus à rien en local, on le retire. La protection contre la force brute sur la connexion reste utile, mais elle doit passer **en base** (compteur d'échecs par compte) pour valoir sur tous les postes.

### 3.7 Latence

Chaque écran fait plusieurs requêtes SQL. Avec un serveur proche de la base, c'était rapide. Depuis un poste de l'hôpital vers une base distante, chaque requête traverse Internet. Il faut **choisir un hébergement MySQL géographiquement proche** de l'hôpital. Les écrans les plus lourds (tableau de bord, dossier patient) seront à surveiller.

## 4. Deux façons techniques de faire, et une recommandation

### Option A : serveur Express embarqué sur `127.0.0.1` (recommandée pour commencer)

On déplace le code de `app-server` dans `app-core/src/main/server/`, et le processus principal d'Electron démarre l'application Express au lancement, **uniquement sur l'interface locale** (`127.0.0.1`, port choisi au hasard). `remote-api.client.ts` pointe simplement vers cette adresse.

- ✅ **Presque aucun changement** dans les ≈ 260 fonctions de `remote-api.client.ts`, dans la synchronisation (outbox, dispatchers, détection de conflits) et dans l'interface.
- ✅ Les routes, le RBAC, `multer` pour les fichiers, les exports et la gestion d'erreurs (`ConflictError`) sont repris tels quels.
- ✅ Migration rapide et peu risquée : ce qui marche aujourd'hui continue de marcher.
- ⚠️ Un passage HTTP local subsiste. Il est invisible pour l'utilisateur et très rapide, mais techniquement superflu.

### Option B : appel direct des services, sans HTTP

On supprime Express, et chaque fonction de `remote-api.client.ts` appelle directement le service correspondant (`listLabRequests()`…), avec une vérification des droits réécrite en simple fonction.

- ✅ Architecture plus « propre », sans serveur local.
- ❌ Il faut réécrire les ≈ 260 fonctions du client, et remplacer `multer`, les middlewares et les codes HTTP. Chantier long et à fort risque de régression.

**Recommandation : option A maintenant.** L'option B pourra se faire plus tard, domaine par domaine, si l'on veut. Elle n'apporte rien de visible pour l'utilisateur.

## 5. Plan de mise en œuvre (option A)

### Étape 1 : intégrer le code serveur dans app-core
- Copier `app-server/src/{routes,services,middleware,auth,config,lib,db}` dans `app-core/src/main/server/`.
- Copier le schéma `app-server/prisma/schema.prisma` et ses migrations dans `app-core/prisma-remote/`, avec un **client Prisma généré dans un dossier distinct** (ex. `src/generated/prisma-remote`), pour ne pas le confondre avec le client SQLite local.
- Ajouter à `app-core` les dépendances serveur : `express`, `helmet`, `multer`, `bcryptjs`, `jsonwebtoken`, `@prisma/adapter-mariadb`, `mariadb`, `exceljs`, `pdfkit`, `@google/genai`. Certaines sont déjà présentes.
- Adapter `electron-builder.yml` si nécessaire (modules à garder hors de l'archive `asar`).

### Étape 2 : démarrer le backend embarqué
- `src/main/server/index.ts` exporte `startEmbeddedServer(): Promise<string>`. La fonction crée l'app Express, fait `listen(0, '127.0.0.1')` et renvoie l'URL, par exemple `http://127.0.0.1:53817`.
- Dans `src/main/index.ts`, appeler `startEmbeddedServer()` avant la création de la fenêtre, puis transmettre l'URL à `remote-api.client.ts`, qui remplace l'URL Render.
- CORS : n'autoriser que l'application elle-même, au lieu de `*`.

### Étape 3 : configuration de la base distante
- `connection-config.ts` lit les identifiants depuis la configuration locale chiffrée (`config.json` + `safeStorage`) au lieu des variables d'environnement. Le `.env` reste utilisable en développement.
- **Assistant de configuration initiale** (`SetupWizard.tsx`) : le champ « URL du backend » devient « Connexion à la base » (hôte, port, nom de la base, utilisateur, mot de passe, TLS), avec un bouton **« Tester la connexion »** qui fait un vrai `SELECT 1`.
- Réduire le pool MariaDB à 2 ou 3 connexions par poste.

### Étape 4 : détection de la connexion
- Aujourd'hui, `connectivity.service.ts` interroge `GET /health` sur Render. Le backend local répondra toujours, il faut donc que **`/health` teste réellement la base** (`SELECT 1` avec un délai court) et renvoie une erreur si MariaDB est injoignable.
- Le reste du mode hors connexion (bascule sur SQLite, outbox, resynchronisation) ne change pas.

### Étape 5 : tâches uniques pour tout l'hôpital
- Ajouter un verrou en base (`GET_LOCK('pandora_automation', 0)`) autour de `evaluateAutomationRules()` et de `bootstrapIfEmpty()`.

### Étape 6 : migrations au démarrage
- Contrôle de version du schéma au démarrage (§3.5) : écran de blocage si la base est plus récente, et migration assistée si elle est plus ancienne, avec les identifiants « migration » demandés ponctuellement.
- Les fichiers SQL de migration sont inclus dans l'installeur.

### Étape 7 : sécurité
- Script SQL fourni pour créer l'utilisateur applicatif restreint et l'utilisateur de migration (§3.1).
- Anti-force brute de la connexion stocké en base.
- Clé Gemini déplacée dans les Paramètres, stockée chiffrée.

### Étape 8 : nettoyage et vérifications
- Vérifier sur 2 postes en parallèle : connexion, création et modification simultanées (détection de conflits), upload et lecture de fichiers de résultats, exports Excel/PDF, sauvegarde/restauration, bascule hors connexion puis resynchronisation, tâche d'automatisation exécutée une seule fois.
- Rendre `app-server` obsolète. On le garde quelque temps dans le dépôt comme référence, puis on le supprime. Arrêter le service Render.
- Mettre à jour `README.md` et `Plan-Installeur-Configurable.md` (l'URL du backend disparaît).

## 6. Décisions à prendre avant de démarrer

1. **Accepter le modèle de sécurité du §3.1** : identifiants de la base présents sur chaque poste, avec un utilisateur restreint et TLS.
2. **Hébergeur MySQL** : confirmer que l'offre accepte les connexions distantes et en assez grand nombre (§3.2, §3.3).
3. **Option A (Express embarqué)** comme recommandé, ou option B directement.
4. **Clé Gemini** : saisie dans les Paramètres de chaque poste, ou stockée en base.
