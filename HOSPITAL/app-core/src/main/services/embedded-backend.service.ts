import { app } from 'electron'
import { join } from 'path'
import { startBackgroundTasks, startEmbeddedServer } from '../server'
import { setJwtSecret } from '../server/auth/jwt'
import { configureRemoteDatabase } from '../server/db/client'
import { setDbReachable } from '../server/db/db-status'
import { migrateRemoteDatabase } from '../server/db/migrate-remote-db'
import { testDbConnection } from '../server/db/test-connection'
import type { DbConnectionConfig } from '../server/db/connection-config'
import { getOrCreateJwtSecret, getStoredDbAccess, saveDbAccess, toPrefill } from './app-config.service'
import { checkConnectivityNow } from './connectivity.service'
import { setApiUrl } from './remote-api.client'
import type { DbAccessInput, DbStartupStatus, SaveDbAccessResult } from '../../shared/setup-types'

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
  await configureRemoteDatabase(stored)

  const test = await testDbConnection(stored)
  if (test.ok) return activate(stored)

  setDbReachable(false)
  if (!(await hasInternet())) return { state: 'OFFLINE' }
  return { state: 'NEEDS_ACCESS', message: test.message, prefill: toPrefill(stored) }
}

/** À appeler une fois au démarrage, avant le moniteur de connectivité : démarre le backend local
 * et lance (sans l'attendre) le contrôle de la base distante. */
export async function initEmbeddedBackend(): Promise<void> {
  setJwtSecret(getOrCreateJwtSecret())
  const url = await startEmbeddedServer()
  setApiUrl(url)
  startupCheck = runStartupCheck().then((result) => {
    status = result
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
