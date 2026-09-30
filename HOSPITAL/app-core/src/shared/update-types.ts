// Mise à jour automatique de l'application (electron-updater + GitHub Releases) — voir
// Plan-Mise-A-Jour-Automatique.md.

export type UpdateStatus =
  /** Application non installée (développement) : pas de mise à jour automatique. */
  | { state: 'DISABLED' }
  | { state: 'IDLE' }
  | { state: 'CHECKING' }
  | { state: 'UP_TO_DATE'; checkedAt: string }
  | { state: 'DOWNLOADING'; version: string; percent: number }
  /** Téléchargée et vérifiée : installée au redémarrage (ou à la fermeture de l'app). */
  | { state: 'READY'; version: string }
  | { state: 'ERROR'; message: string }

export interface UpdateInfo {
  currentVersion: string
  status: UpdateStatus
}
