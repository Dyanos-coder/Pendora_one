# app-core

Socle commun de Pandora One (Electron + React + TypeScript, via `electron-vite`).

## Scripts

- `npm run dev` — lance l'app en mode développement (hot reload)
- `npm run build` — build de production (typecheck + electron-vite build)
- `npm run build:win` / `build:mac` / `build:linux` — génère l'installeur

## Structure

```
src/
  main/       # process principal Electron
  preload/    # scripts preload (pont sécurisé main <-> renderer)
  renderer/   # application React (UI)
```

Voir [Architecture-App-PC-Multitenant.md](../Architecture-App-PC-Multitenant.md) pour l'architecture complète (Core + modules sectoriels, multi-tenant, offline-first).
