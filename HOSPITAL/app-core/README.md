# hospital-app-core (Pandora Health)

Frontend Electron + React + TypeScript de **Pandora Health**, le module sectoriel Santé de
Pandora One. Dupliqué depuis `app-core` (le Core générique) puis nettoyé des écrans génériques
qui ne correspondent pas au métier hospitalier (Ventes, Stocks retail, Finance générique,
Mémoire d'entreprise, Tour de contrôle) — voir la maquette dans
[`HOSPITAL/maquette`](../maquette) (19 écrans, source de vérité visuelle du produit final).

État actuel (itération v1 — "spécification, frontend d'abord") :

- Authentification, session hors-ligne et audit log : repris tels quels du Core (inchangés).
- **Tableau de bord** et **Patients** (liste + dossier patient) : codés en dur à partir de la
  maquette, avec des **données de démonstration statiques** (`features/patients/mock-data.ts`) —
  pas encore branchés sur un vrai schéma Prisma côté serveur, volontairement, le temps de valider
  l'écran visuellement avant d'investir dans le modèle de données.
- Les 25+ autres modules de la maquette (Urgences, Bloc opératoire, Laboratoire, Pharmacie,
  Banque de sang, Finances, RH, Gouvernance & Qualité, Intelligence & Pilotage...) apparaissent
  dans la navigation (fidèle à la maquette) mais affichent un écran "En construction"
  (`features/shell/ComingSoonPage.tsx`) — à spécifier et coder un par un, dans la continuité de
  cette première itération.

## Premier lancement

```bash
npm install
npx prisma migrate dev --name init   # crée dev.db (journal d'audit local uniquement)
npm run dev
```

⚠️ Le login appelle `HOSPITAL/app-server` (voir son README) — démarre-le en parallèle
(`PANDORA_HEALTH_API_URL`, port `3001` par défaut, distinct du `app-server` du Core qui reste
sur `3000`).

## Comptes de démo (seed côté `HOSPITAL/app-server`)

| Email | Mot de passe | Rôle |
| --- | --- | --- |
| `directeur@demo.pandorahealth` | `demo1234` | DIRIGEANT |
| `praticien@demo.pandorahealth` | `demo1234` | EMPLOYE |

## Scripts

- `npm run dev` — lance l'app en mode développement (hot reload)
- `npm run build` — build de production (typecheck + electron-vite build)
- `npm run build:win` / `build:mac` / `build:linux` — génère l'installeur
- `npx prisma studio` — explorateur visuel de la base locale (dev.db, journal d'audit uniquement)

## Structure

```text
prisma/
  schema.prisma   # AuditLog uniquement (l'identité vit côté HOSPITAL/app-server)
src/
  main/
    services/            # auth.service, audit.service, session.store, remote-api.client
    ipc/auth.ipc.ts       # handlers ipcMain.handle('auth:*', ...)
  preload/                # expose window.api.auth au renderer (contextBridge)
  renderer/src/
    features/auth/        # LoginScreen (rebrandé Pandora Health), useAuth
    features/shell/        # AppShell (nav complète de la maquette), ComingSoonPage
    features/dashboard/    # DashboardPage — Picture2 de la maquette
    features/patients/     # PatientsPage (liste, Picture3) + PatientDetailPage (dossier, Picture4)
                             # + types.ts / mock-data.ts (données statiques, à remplacer par de vrais appels)
  shared/
    auth-types.ts   # types partagés main/preload/renderer (Session, Role, ...)
```

## Prochaines étapes (ordre suggéré)

1. Spécifier le modèle de données Patient (champs, relations avec Consultation/RDV/etc.) et le
   porter dans `HOSPITAL/app-server/prisma/schema.prisma` + routes `/patients`.
2. Remplacer `features/patients/mock-data.ts` par de vrais appels IPC → `remote-api.client.ts`,
   sur le modèle de ce que faisait `app-core` pour Stocks/Sales avant duplication.
3. Reprendre les écrans "En construction" un par un, dans l'ordre de priorité métier (Rendez-vous
   et Consultations sont les plus proches de Patients, donc probablement les prochains).

Voir [Architecture-App-PC-Multitenant.md](../../Architecture-App-PC-Multitenant.md) pour
l'architecture complète (Core + modules sectoriels, multi-tenant, offline-first).
