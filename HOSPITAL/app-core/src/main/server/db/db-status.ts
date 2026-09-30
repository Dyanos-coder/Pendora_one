// Dernier état connu de la base distante, mis à jour par chaque sonde /health (toutes les 20 s,
// voir connectivity.service.ts) et par le filet d'erreurs du backend. Optimiste au départ : la
// première sonde le corrige immédiatement si besoin.
let reachable = true

export function isDbReachable(): boolean {
  return reachable
}

export function setDbReachable(value: boolean): void {
  reachable = value
}
