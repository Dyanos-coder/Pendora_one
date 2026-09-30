// Mode hors-ligne — détection de conflit (voir Plan-Mode-Hors-Ligne-Synchronisation.md §6.3).
// Levée par chaque `updateX()` quand `expectedUpdatedAt` (la dernière version connue du poste qui
// a fait la modification hors-ligne) ne correspond plus à `updatedAt` en base — la fiche a été
// modifiée entre-temps par quelqu'un d'autre. Interceptée par le middleware d'erreur global
// (app-server/src/index.ts) qui répond 409 avec la version actuelle plutôt que d'écraser
// silencieusement (comportement par défaut de Prisma sans ce contrôle).
export class ConflictError extends Error {
  current: unknown

  constructor(current: unknown) {
    super('Cette fiche a été modifiée entre-temps par quelqu’un d’autre.')
    this.name = 'ConflictError'
    this.current = current
  }
}
