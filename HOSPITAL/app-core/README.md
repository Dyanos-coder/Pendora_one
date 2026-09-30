# hospital-app-core (Pandora Health)

Frontend Electron + React + TypeScript de **Pandora Health**, le module sectoriel Santé de
Pandora One. Dupliqué depuis `app-core` (le Core générique) puis adapté au métier hospitalier.

## État actuel

L'application couvre 17 domaines cliniques/administratifs, chacun avec son propre modèle de
données, ses routes serveur (RBAC par rôle), son écran et — pour l'entité principale de chaque
domaine — un mode hors-ligne avec synchronisation automatique et détection de conflit :

Patients, Rendez-vous, Consultations, Urgences, Hospitalisation, Bloc opératoire, Laboratoire,
Imagerie, Cardiologie, Anatomopathologie, Endoscopie, Pharmacie, Banque de sang, Stocks,
Approvisionnement, Finance, RH — plus Paramètres, Gouvernance & Qualité, et Intelligence &
Pilotage (tableau de bord, rapports, Automation Studio, assistant IA branché sur un vrai LLM).

Voir [`../Audit-Fonctionnalites-Manquantes.md`](../Audit-Fonctionnalites-Manquantes.md) et
[`../Reste-A-Faire.md`](../Reste-A-Faire.md) pour le détail de ce qui est fait et ce qui reste
(essentiellement des chantiers de robustesse — tests, CI, logging — le produit fonctionnel est
complet).

## Premier lancement

```bash
npm install
npx prisma generate                  # génère le client Prisma local (SQLite, journal d'audit + miroir hors-ligne)
npx prisma migrate dev                # applique les migrations locales (crée dev.db)
npm run dev
```

⚠️ Le login et la quasi-totalité des données appellent `HOSPITAL/app-server` — démarre-le en
parallèle (voir sa configuration `.env`, port `3001` par défaut, distinct du `app-server` du Core
qui reste sur `3000`). Sans lui, seul le mode hors-ligne avec les données déjà synchronisées
localement reste utilisable.

## Comptes de démo (seed côté `HOSPITAL/app-server`)

| Email | Mot de passe | Rôle |
| --- | --- | --- |
| `directeur@demo.pandorahealth` | `demo1234` | DIRIGEANT |
| `praticien@demo.pandorahealth` | `demo1234` | PHARMACIEN |

D'autres comptes (notamment un médecin) peuvent être créés depuis Paramètres → Utilisateurs &
rôles, en rattachant optionnellement le compte à une fiche employé existante — nécessaire pour
qu'un compte de rôle MEDECIN soit restreint à ses propres rendez-vous (voir §4.4 "Sécurité et
rôles" ci-dessous).

## Scripts

- `npm run dev` — lance l'app en mode développement (hot reload)
- `npm run lint` — ESLint (TypeScript + React + Hooks)
- `npm run typecheck` — `tsc --noEmit` (process main + renderer, deux `tsconfig` séparés)
- `npm run build` — build de production (typecheck + electron-vite build)
- `npm run build:win` / `build:mac` / `build:linux` — génère l'installeur (dans `dist/`, sans publier)
- `npm run release` — génère l'installeur Windows ET le publie comme mise à jour (voir ci-dessous)
- `npx prisma studio` — explorateur visuel de la base locale (dev.db)

Le pipeline CI (`.github/workflows/hospital-ci.yml`, à la racine du dépôt) exécute lint +
typecheck + build sur chaque push/PR touchant `HOSPITAL/`.

## Publier une nouvelle version (mise à jour automatique des postes)

Les postes installés vérifient les nouvelles versions au lancement puis toutes les 4 h, sur le
dépôt GitHub **public** `Dyanos-coder/pandora-health-releases`, qui ne contient que les
installateurs. Ils les téléchargent en arrière-plan puis les installent au redémarrage. Voir
`HOSPITAL/Plan-Mise-A-Jour-Automatique.md`.

Une seule fois, sur le poste qui publie :

- créer un jeton GitHub (*Fine-grained*, accès au seul dépôt `pandora-health-releases`,
  permission *Contents : Read and write*) ;
- l'enregistrer dans la variable d'environnement `GH_TOKEN`. Ce jeton n'est jamais embarqué dans
  l'application.

À chaque version :

1. Augmenter `version` dans `package.json` (ex. `0.1.0` → `0.2.0`). Un poste ne se met à jour que
   si la version publiée est **supérieure** à la sienne.
2. `npm run release` : compile, puis dépose sur GitHub Releases le `.exe`, son `.blockmap` et
   `latest.yml`.
3. C'est tout : les postes récupèrent la version dans les 4 h, ou tout de suite via
   Paramètres › Mises à jour.

Si la version contient une migration de la base distante (`prisma-remote/migrations`), le premier
poste mis à jour l'applique. Les postes encore en ancienne version affichent alors « Mise à jour
de l'application nécessaire », avec un bouton « Mettre à jour maintenant ».

En cas de problème sur un poste, consulter le journal de mise à jour :
`%APPDATA%\hospital-app-core\logs\updater.log`.

## Structure

```text
prisma/
  schema.prisma   # miroir local SQLite : journal d'audit + miroir hors-ligne (17 entités) +
                   # file d'attente de synchronisation (SyncOutbox) — l'identité/source de
                   # vérité reste côté HOSPITAL/app-server (MySQL)
src/
  main/
    services/       # un service par domaine — bascule serveur/miroir local hors-ligne pour
                     # l'entité principale de chaque domaine, appel réseau direct pour le reste
    ipc/             # un fichier par domaine, handlers ipcMain.handle('<domaine>:*', ...)
  preload/           # expose window.api.<domaine> au renderer (contextBridge)
  renderer/src/
    features/        # un dossier par domaine (page + formulaires + types + sous-onglets)
    components/      # composants partagés (Modal, Button, Card, ConfirmDialog...)
  shared/            # types partagés main/preload/renderer, un fichier par domaine
```

## Mode hors-ligne et synchronisation

Voir [`../Plan-Mode-Hors-Ligne-Synchronisation.md`](../Plan-Mode-Hors-Ligne-Synchronisation.md)
pour l'architecture complète (écriture locale immédiate, file d'attente, synchronisation
automatique à la reconnexion, détection de conflit avec notification active). Portée volontairement
limitée à l'entité principale des 17 domaines — le dossier patient agrégé et les sous-onglets CRUD
avancés restent en ligne uniquement.

## Sécurité et rôles

RBAC par domaine, matrice définie côté serveur (`HOSPITAL/app-server/src/config/permissions.ts`).
Un compte de rôle MEDECIN, une fois rattaché à une fiche employé, est en plus restreint à ne
programmer/déplacer que ses propres rendez-vous (voir `features/appointments/`).
