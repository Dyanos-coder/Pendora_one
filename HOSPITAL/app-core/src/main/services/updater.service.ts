import { app, BrowserWindow } from 'electron'
import { appendFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { autoUpdater } from 'electron-updater'
import { onConnectivityChange } from './connectivity.service'
import type { UpdateInfo, UpdateStatus } from '../../shared/update-types'

// Mise à jour automatique (voir Plan-Mise-A-Jour-Automatique.md) : au lancement puis toutes les
// 30 min, electron-updater lit `latest.yml` sur GitHub Releases (bloc `publish` d'electron-builder.yml),
// télécharge en arrière-plan la nouvelle version (différentiel via .blockmap), vérifie son empreinte
// sha512, puis l'installe au clic « Redémarrer » ou à la fermeture de l'app. Les données du poste
// (userData : base locale, accès à la base distante, session) ne sont pas touchées.

// Vérification dès le lancement (quelques secondes, le temps que la fenêtre s'ouvre), puis toutes
// les 30 min — la requête est minuscule (latest.yml). Une vérification ratée (pas encore de
// réseau au démarrage, version publiée à l'instant et pas encore visible chez GitHub…) est
// retentée 2 min plus tard, et une vérification est relancée dès que la connexion revient.
const FIRST_CHECK_DELAY_MS = 3 * 1000
const CHECK_INTERVAL_MS = 30 * 60 * 1000
const RETRY_AFTER_ERROR_MS = 2 * 60 * 1000

let status: UpdateStatus = { state: 'IDLE' }
let started = false
let retryTimer: ReturnType<typeof setTimeout> | null = null

function scheduleRetry(): void {
  if (retryTimer) return
  retryTimer = setTimeout(() => {
    retryTimer = null
    void checkForUpdates()
  }, RETRY_AFTER_ERROR_MS)
}

function logFile(): string {
  const dir = join(app.getPath('userData'), 'logs')
  mkdirSync(dir, { recursive: true })
  return join(dir, 'updater.log')
}

function log(level: string, ...args: unknown[]): void {
  try {
    const line = `[${new Date().toISOString()}] ${level} ${args.map((a) => (a instanceof Error ? a.stack ?? a.message : String(a))).join(' ')}\n`
    appendFileSync(logFile(), line)
  } catch {
    // Journal best-effort : ne doit jamais perturber la mise à jour elle-même.
  }
}

function setStatus(next: UpdateStatus): void {
  status = next
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send('updater:status', status)
  }
}

/** Traduit les erreurs courantes en message lisible — le détail technique va dans updater.log. */
function describeError(error: Error): string {
  const text = error.message ?? ''
  if (/ENOTFOUND|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN|ERR_INTERNET_DISCONNECTED|net::/i.test(text)) {
    return 'Impossible de vérifier les mises à jour : pas de connexion Internet.'
  }
  if (/404|No published versions|Cannot find latest/i.test(text)) {
    return 'Aucune version publiée pour le moment.'
  }
  if (/sha512 checksum mismatch/i.test(text)) {
    return 'Le fichier téléchargé est corrompu — il sera retéléchargé à la prochaine vérification.'
  }
  return 'La mise à jour a échoué. Réessayez plus tard.'
}

export function getUpdateInfo(): UpdateInfo {
  return { currentVersion: app.getVersion(), status }
}

/** À appeler une fois au démarrage. Sans effet en développement (application non installée). */
export function startUpdater(): void {
  if (started) return
  started = true

  if (!app.isPackaged) {
    status = { state: 'DISABLED' }
    return
  }

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.logger = {
    info: (...args: unknown[]) => log('INFO', ...args),
    warn: (...args: unknown[]) => log('WARN', ...args),
    error: (...args: unknown[]) => log('ERROR', ...args),
    debug: () => undefined
  }

  autoUpdater.on('checking-for-update', () => setStatus({ state: 'CHECKING' }))
  autoUpdater.on('update-not-available', () => setStatus({ state: 'UP_TO_DATE', checkedAt: new Date().toISOString() }))
  autoUpdater.on('update-available', (info) => setStatus({ state: 'DOWNLOADING', version: info.version, percent: 0 }))
  autoUpdater.on('download-progress', (progress) => {
    const version = status.state === 'DOWNLOADING' ? status.version : ''
    setStatus({ state: 'DOWNLOADING', version, percent: Math.round(progress.percent) })
  })
  autoUpdater.on('update-downloaded', (info) => setStatus({ state: 'READY', version: info.version }))
  autoUpdater.on('error', (error) => {
    log('ERROR', error)
    // Une mise à jour déjà prête reste installable même si une vérification ultérieure échoue.
    if (status.state !== 'READY') {
      setStatus({ state: 'ERROR', message: describeError(error) })
      scheduleRetry()
    }
  })

  setTimeout(() => void checkForUpdates(), FIRST_CHECK_DELAY_MS)
  setInterval(() => void checkForUpdates(), CHECK_INTERVAL_MS)
  onConnectivityChange((connectivity) => {
    if (connectivity === 'ONLINE') void checkForUpdates()
  })
}

/** Vérification immédiate (bouton Paramètres, écran « poste bloqué »). Le téléchargement démarre
 * tout seul si une version plus récente existe ; l'avancement arrive par l'événement
 * `updater:status`. */
export async function checkForUpdates(): Promise<UpdateInfo> {
  if (
    status.state === 'DISABLED' ||
    status.state === 'CHECKING' ||
    status.state === 'DOWNLOADING' ||
    status.state === 'READY'
  ) {
    return getUpdateInfo()
  }
  try {
    await autoUpdater.checkForUpdates()
  } catch (error) {
    log('ERROR', error)
    setStatus({ state: 'ERROR', message: describeError(error as Error) })
    scheduleRetry()
  }
  return getUpdateInfo()
}

/** Ferme l'app, installe la mise à jour téléchargée en silence et relance l'app. */
export function installUpdateNow(): void {
  if (status.state !== 'READY') return
  autoUpdater.quitAndInstall(true, true)
}
