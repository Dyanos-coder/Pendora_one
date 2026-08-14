# app-core

Socle commun de Pandora One (Electron + React + TypeScript, via `electron-vite`).

État actuel : couche de données locale (Prisma + SQLite/libSQL), authentification et RBAC simple
(2 rôles), écran de connexion et shell applicatif de base, chiffrement de la base en production
et cache de session hors-ligne (30 jours). Reste à faire : annuaire cloud, premier module
sectoriel — voir `Architecture-App-PC-Multitenant.md`.

## Premier lancement

```bash
npm install
npx prisma migrate dev --name init   # crée dev.db + les tables (déjà fait si vous lisez ceci après moi)
npx prisma db seed                    # crée le tenant + les 2 comptes de démo
npm run dev
```

## Comptes de démo (seed)

| Email | Mot de passe | Rôle |
| --- | --- | --- |
| `dirigeant@demo.pandora` | `demo1234` | DIRIGEANT (nav complète) |
| `employe@demo.pandora` | `demo1234` | EMPLOYE (nav restreinte) |

## Scripts

- `npm run dev` — lance l'app en mode développement (hot reload)
- `npm run build` — build de production (typecheck + electron-vite build)
- `npm run build:win` / `build:mac` / `build:linux` — génère l'installeur
- `npx prisma studio` — explorateur visuel de la base locale (dev.db)
- `npx prisma migrate dev --name <nom>` — après une modification de `prisma/schema.prisma`

## Structure

```
prisma/
  schema.prisma   # Tenant, User, Membership (rôle), AuditLog
  seed.ts         # jeu de données de démo
src/
  main/
    paths.ts             # getAppDataDir() (cwd en dev, userData en prod)
    db/client.ts         # singleton PrismaClient (adapter libSQL, chiffré en prod)
    security/
      db-key.ts           # clé de chiffrement DB, protégée par safeStorage (OS)
      session-cache.ts     # cache de session chiffré, 30 jours (reconnexion hors-ligne)
    services/            # auth.service, rbac.service, audit.service, session.store
    ipc/auth.ipc.ts      # handlers ipcMain.handle('auth:*', ...)
  preload/          # expose window.api.auth au renderer (contextBridge)
  renderer/src/
    features/auth/       # LoginScreen, useAuth
    features/shell/      # AppShell (nav conditionnée par rôle)
  shared/
    auth-types.ts   # types partagés main/preload/renderer (Session, Role, ...)
```

Voir [Architecture-App-PC-Multitenant.md](../Architecture-App-PC-Multitenant.md) pour l'architecture complète (Core + modules sectoriels, multi-tenant, offline-first).

## Notes techniques

- **Prisma 7** exige un driver adapter pour SQLite (`@prisma/adapter-libsql` + `@libsql/client`,
  binaire N-API précompilé — préféré à `better-sqlite3` qui nécessite une compilation native
  locale via node-gyp/Python).
- Le client Prisma est généré dans `src/generated/prisma` (jamais commité, voir `.gitignore`).
- La base de dev vit à la racine du projet (`dev.db`, en clair, ignorée par git) — c'est le fichier
  utilisé par `prisma migrate dev` / `db seed` / `studio`, qui ne savent pas ouvrir un fichier
  chiffré. En production (`app.isPackaged`), la base est créée dans `app.getPath('userData')` et
  chiffrée via `encryptionKey` (libSQL), clé elle-même protégée par `electron.safeStorage`
  (DPAPI/Keychain/libsecret — pas de dépendance native tierce type `keytar`, dépréciée).
- Cache de session (`session.cache.enc`, aussi via `safeStorage`) : permet de rouvrir l'app
  hors-ligne sans ressaisir ses identifiants pendant 30 jours (voir `session-cache.ts`).
