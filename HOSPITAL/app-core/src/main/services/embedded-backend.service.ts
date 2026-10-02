import { app } from 'electron'
import { join } from 'path'
import { startBackgroundTasks, startEmbeddedServer } from '../server'
import { setJwtSecret } from '../server/auth/jwt'
import { configureRemoteDatabase } from '../server/db/client'
import { setDbReachable } from '../server/db/db-status'
import { migrateRemoteDatabase } from '../server/db/migrate-remote-db'
import { testDbConnection } from '../server/db/test-connection'
import type { DbConnectionConfig } from '../server/db/connection-config'
import {
  getOrCreateJwtSecret,
  getStoredDbAccess,
  getStoredDevice,
  isDeviceRevoked,
  markDeviceRevoked,
  saveDbAccess,
  saveDevice,
  toPrefill
} from './app-config.service'
import { requestActivation, requestCredentials, siteUrl, type SiteDbAccess } from './pandora-site.client'
import { checkConnectivityNow } from './connectivity.service'
import { setApiUrl } from './remote-api.client'
import type { ActivationInfo, DbAccessInput, DbStartupStatus, SaveDbAccessResult } from '../../shared/setup-types'

// Orchestration du backend embarqué (voir Plan-Backend-Embarque-Travaux.md §2) : démarrage du
// serveur local, contrôle de la base au lancement, et (re)saisie des accès.

const INTERNET_PROBES = ['https://www.google.com/generate_204', 'https://1.1.1.1/cdn-cgi/trace']

let status: DbStartupStatus = { state: 'CHECKING' }
let startupCheck: Promise<DbStartupStatus> | null = null

function migrationsDir(): string {
  return join(app.getAppPath(), 'prisma-remote', 'migrations')
}

/** Internet fonctionne-t-il ? Sert à distinguer « pas de réseau » (mode hors connexion normal)
 * de « réseau OK mais base injoignable » (accès probablement faux → on les redemande). */
async function hasInternet(): Promise<boolean> {
  for (const url of INTERNET_PROBES) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 4000)
    try {
      await fetch(url, { method: 'HEAD', signal: controller.signal })
      return true
    } catch {
      // essai suivant
    } finally {
      clearTimeout(timeout)
    }
  }
  return false
}

/** Base joignable avec ces accès : on applique les migrations manquantes puis on lance les tâches
 * de fond. Renvoie le statut final. */
async function activate(config: DbConnectionConfig): Promise<DbStartupStatus> {
  await configureRemoteDatabase(config)
  const migration = await migrateRemoteDatabase(migrationsDir()).catch(
    (error: Error) => ({ ok: false, reason: 'FAILED', message: error.message }) as const
  )
  if (!migration.ok) {
    setDbReachable(false)
    return migration.reason === 'APP_OUTDATED'
      ? { state: 'APP_OUTDATED', message: migration.message }
      : { state: 'MIGRATION_FAILED', message: migration.message }
  }
  if (migration.applied.length > 0) console.log('[remote-db] migrations appliquées :', migration.applied.join(', '))
  setDbReachable(true)
  startBackgroundTasks()
  void checkConnectivityNow()
  return { state: 'READY' }
}

async function runStartupCheck(): Promise<DbStartupStatus> {
  const stored = getStoredDbAccess()
  if (!stored) {
    setDbReachable(false)
    return { state: 'NOT_CONFIGURED' }
  }
  if (isDeviceRevoked()) {
    setDbReachable(false)
    return { state: 'NEEDS_ACTIVATION', message: 'Ce poste n’est plus autorisé par Pandora. Saisissez un code d’activation.' }
  }
  await configureRemoteDatabase(stored)

  const test = await testDbConnection(stored)
  if (test.ok) return activate(stored)

  setDbReachable(false)
  if (!(await hasInternet())) return { state: 'OFFLINE' }

  // Internet fonctionne mais pas la base : les accès ont peut-être changé (mot de passe modifié,
  // base déplacée) — on demande les accès à jour au site Pandora avant de bloquer le poste.
  const refreshed = await refreshAccessFromSite(stored)
  if (refreshed) return refreshed
  return { state: 'NEEDS_ACCESS', message: test.message, prefill: toPrefill(stored) }
}

function sameAccess(a: DbConnectionConfig, b: SiteDbAccess): boolean {
  return a.host === b.host && Number(a.port) === Number(b.port) && a.database === b.database && a.user === b.user && a.password === b.password && a.ssl === b.ssl
}

function toConfig(db: SiteDbAccess): DbConnectionConfig {
  return { host: db.host, port: Number(db.port) || 3306, database: db.database, user: db.user, password: db.password, ssl: Boolean(db.ssl) }
}

/** Accès à jour du site pour un poste activé. Renvoie le nouveau statut si la situation est
 * réglée (nouveaux accès qui marchent → READY ; poste révoqué → NEEDS_ACTIVATION), sinon null. */
async function refreshAccessFromSite(current: DbConnectionConfig): Promise<DbStartupStatus | null> {
  const device = getStoredDevice()
  if (!device) return null
  const result = await requestCredentials(device.token)
  if (result.kind === 'refused' && (result.reason === 'REVOKED' || result.reason === 'INVALID')) {
    markDeviceRevoked()
    return { state: 'NEEDS_ACTIVATION', message: result.message }
  }
  if (result.kind !== 'ok' || sameAccess(current, result.data.db)) return null
  const config = toConfig(result.data.db)
  const test = await testDbConnection(config)
  if (!test.ok) return null
  const next = await activate(config)
  if (next.state === 'READY') {
    saveDbAccess(config)
    saveDevice({ ...device, hospitalId: result.data.hospital.id, hospitalName: result.data.hospital.name })
    console.log('[activation] nouveaux accès récupérés auprès du site Pandora')
  }
  return next
}

/** Poste en marche : vérification discrète auprès du site (dernière connexion, version, accès
 * changés, révocation) — sans jamais interrompre la session en cours. */
async function backgroundSiteCheck(): Promise<void> {
  const device = getStoredDevice()
  const current = getStoredDbAccess()
  if (!device || !current) return
  const result = await requestCredentials(device.token)
  if (result.kind === 'refused' && result.reason === 'REVOKED') {
    // Poste révoqué : la session en cours n'est pas coupée, le code sera redemandé au prochain lancement.
    markDeviceRevoked()
    console.log('[activation] poste révoqué par Pandora')
    return
  }
  if (result.kind !== 'ok') return
  saveDevice({ ...device, hospitalId: result.data.hospital.id, hospitalName: result.data.hospital.name })
  // Nouveaux accès qui fonctionnent : enregistrés pour le prochain lancement.
  if (!sameAccess(current, result.data.db)) {
    const config = toConfig(result.data.db)
    if ((await testDbConnection(config)).ok) saveDbAccess(config)
  }
}

/** Activation du poste avec le code de son hôpital : le site renvoie les accès à la base (déjà
 * testés de son côté), on les vérifie, on prépare la base, puis on enregistre tout chiffré. */
export async function activateWithCode(code: string): Promise<SaveDbAccessResult> {
  if (!code.trim()) return { ok: false, message: 'Saisissez le code d’activation.' }
  const result = await requestActivation(code.trim())
  if (result.kind !== 'ok') return { ok: false, message: result.message }

  const config = toConfig(result.data.db)
  const test = await testDbConnection(config)
  if (!test.ok) return { ok: false, message: `Le site a fourni les accès, mais ce poste n'arrive pas à joindre la base : ${test.message}` }

  const previous = getStoredDbAccess()
  const next = await activate(config)
  if (next.state !== 'READY') {
    await configureRemoteDatabase(previous)
    return { ok: false, message: 'message' in next ? next.message : 'Base inutilisable.' }
  }
  saveDbAccess(config)
  saveDevice({ token: result.data.deviceToken, hospitalId: result.data.hospital.id, hospitalName: result.data.hospital.name, siteUrl: siteUrl() })
  status = next
  return { ok: true }
}

export function getActivationInfo(): ActivationInfo {
  const device = getStoredDevice()
  return { activated: device !== null, hospitalName: device?.hospitalName ?? null }
}

/** À appeler une fois au démarrage, avant le moniteur de connectivité : démarre le backend local
 * et lance (sans l'attendre) le contrôle de la base distante. */
export async function initEmbeddedBackend(): Promise<void> {
  setJwtSecret(getOrCreateJwtSecret())
  const url = await startEmbeddedServer()
  setApiUrl(url)
  startupCheck = runStartupCheck().then((result) => {
    status = result
    if (result.state === 'READY') void backgroundSiteCheck().catch(() => undefined)
    return result
  })
}

export async function getDbStatus(): Promise<DbStartupStatus> {
  if (startupCheck) await startupCheck
  return status
}

/** « Réessayer » avec les accès déjà enregistrés. */
export async function retryDb(): Promise<DbStartupStatus> {
  startupCheck = runStartupCheck().then((result) => {
    status = result
    return result
  })
  return startupCheck
}

/** « Continuer hors connexion » : l'app démarre sur la base locale ; la sonde de connectivité
 * rebasculera en ligne d'elle-même si la base redevient joignable avec les accès enregistrés. */
export function continueOffline(): DbStartupStatus {
  status = { state: 'OFFLINE' }
  return status
}

export function getDbPrefill() {
  return toPrefill(getStoredDbAccess())
}

/** Assistant de premier lancement, écran de reconnexion et Paramètres : teste les accès saisis,
 * met la base à jour, puis les enregistre (chiffrés) seulement s'ils fonctionnent. */
export async function saveDbAccessInput(input: DbAccessInput): Promise<SaveDbAccessResult> {
  const previous = getStoredDbAccess()
  const password = input.password === '' && previous ? previous.password : input.password
  const config: DbConnectionConfig = {
    host: input.host.trim(),
    port: Number(input.port) || 3306,
    database: input.database.trim(),
    user: input.user.trim(),
    password,
    ssl: input.ssl
  }
  if (!config.host || !config.database || !config.user) {
    return { ok: false, message: "Renseignez l'hôte, le nom de la base et l'utilisateur." }
  }

  const test = await testDbConnection(config)
  if (!test.ok) return { ok: false, message: test.message }

  const result = await activate(config)
  if (result.state !== 'READY') {
    // Accès valides mais base inutilisable par cette version : on revient aux anciens accès.
    await configureRemoteDatabase(previous)
    return { ok: false, message: 'message' in result ? result.message : 'Base inutilisable.' }
  }
  saveDbAccess(config)
  status = result
  return { ok: true }
}
