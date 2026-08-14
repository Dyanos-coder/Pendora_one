import { app } from 'electron'

/**
 * Dossier de données de l'application. En dev : racine du projet (même fichier que
 * celui utilisé par `prisma migrate dev` / `prisma db seed`). En prod : `userData`,
 * isolé par utilisateur/OS. `app.getPath` n'est disponible qu'après `app.whenReady()`.
 */
export function getAppDataDir(): string {
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged
  return isDev ? process.cwd() : app.getPath('userData')
}

export function isDevEnvironment(): boolean {
  return process.env.NODE_ENV === 'development' || !app.isPackaged
}
