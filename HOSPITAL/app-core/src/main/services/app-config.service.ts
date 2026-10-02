import { app, safeStorage } from 'electron'
import { randomBytes } from 'crypto'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import type { DbConnectionConfig } from '../server/db/connection-config'
import type { AppConfig, DbAccessPrefill } from '../../shared/setup-types'

// Configuration locale par poste : accès à la base distante, secret des jetons du backend embarqué
// et état de l'assistant de premier lancement — voir Plan-Backend-Embarque-Travaux.md. Un simple
// fichier JSON dans userData plutôt qu'une table de la base locale : c'est une config machine, lue
// avant même qu'une session existe. Les valeurs sensibles (accès base, secret JWT) y sont
// chiffrées par le coffre de l'OS (`safeStorage`, DPAPI sous Windows). Les modules affichés, eux,
// ne sont PAS ici : c'est un réglage d'établissement, stocké en base sur Company.

interface StoredConfig {
  setupComplete?: boolean
  /** DbConnectionConfig en JSON, chiffré puis encodé en base64. */
  db?: string
  /** Secret JWT du backend embarqué, chiffré puis encodé en base64. */
  jwtSecret?: string
  /** Poste activé auprès du site Pandora (jeton, hôpital), JSON chiffré puis encodé en base64. */
  device?: string | null
  /** Poste révoqué par Pandora : le code d'activation est redemandé au prochain lancement. */
  deviceRevoked?: boolean
  /** Imprimante des reçus de caisse sur ce poste (nom système) — vide = boîte d'impression. */
  receiptPrinter?: string | null
}

function configPath(): string {
  return join(app.getPath('userData'), 'config.json')
}

function readStored(): StoredConfig {
  const path = configPath()
  if (!existsSync(path)) return {}
  try {
    return JSON.parse(readFileSync(path, 'utf-8')) as StoredConfig
  } catch {
    // Fichier corrompu/illisible : on repart de zéro plutôt que de planter au démarrage —
    // l'assistant de premier lancement se réaffichera simplement.
    return {}
  }
}

function writeStored(patch: Partial<StoredConfig>): void {
  const next = { ...readStored(), ...patch }
  writeFileSync(configPath(), JSON.stringify(next, null, 2))
}

function encrypt(value: string): string {
  if (!safeStorage.isEncryptionAvailable()) {
    console.warn('[security] safeStorage indisponible : configuration stockée en clair (dégradé).')
    return `plain:${Buffer.from(value, 'utf-8').toString('base64')}`
  }
  return safeStorage.encryptString(value).toString('base64')
}

function decrypt(value: string): string {
  if (value.startsWith('plain:')) return Buffer.from(value.slice('plain:'.length), 'base64').toString('utf-8')
  return safeStorage.decryptString(Buffer.from(value, 'base64'))
}

export function getConfig(): AppConfig {
  const stored = readStored()
  return { setupComplete: stored.setupComplete === true, dbConfigured: getStoredDbAccess() !== null }
}

export function markSetupComplete(): AppConfig {
  writeStored({ setupComplete: true })
  return getConfig()
}

export function getStoredDbAccess(): DbConnectionConfig | null {
  const stored = readStored()
  if (!stored.db) return null
  try {
    return JSON.parse(decrypt(stored.db)) as DbConnectionConfig
  } catch {
    return null
  }
}

export function saveDbAccess(config: DbConnectionConfig): void {
  writeStored({ db: encrypt(JSON.stringify(config)) })
}

export function toPrefill(config: DbConnectionConfig | null): DbAccessPrefill | null {
  if (!config) return null
  return { host: config.host, port: config.port, database: config.database, user: config.user, ssl: config.ssl }
}

/** Poste activé auprès du site Pandora (Plan-Code-Activation.md). `hospitalId` = identifiant de
 * l'hôpital sur le site (sert aussi à vérifier l'abonnement). */
export interface StoredDevice {
  token: string
  hospitalId: string
  hospitalName: string
  siteUrl: string
}

export function getStoredDevice(): StoredDevice | null {
  const stored = readStored()
  if (!stored.device) return null
  try {
    return JSON.parse(decrypt(stored.device)) as StoredDevice
  } catch {
    return null
  }
}

/** Enregistre le poste activé (et lève une éventuelle révocation précédente). */
export function saveDevice(device: StoredDevice): void {
  writeStored({ device: encrypt(JSON.stringify(device)), deviceRevoked: false })
}

export function markDeviceRevoked(): void {
  writeStored({ device: null, deviceRevoked: true })
}

export function isDeviceRevoked(): boolean {
  return readStored().deviceRevoked === true
}

export function getReceiptPrinter(): string | null {
  return readStored().receiptPrinter ?? null
}

export function setReceiptPrinter(name: string | null): void {
  writeStored({ receiptPrinter: name || null })
}

/** Secret propre à ce poste, généré au premier lancement puis conservé : les sessions mises en
 * cache (30 jours) restent valides d'un lancement à l'autre. */
export function getOrCreateJwtSecret(): string {
  const stored = readStored()
  if (stored.jwtSecret) {
    try {
      return decrypt(stored.jwtSecret)
    } catch {
      // Illisible (profil Windows changé…) : on en régénère un, les sessions en cache expireront.
    }
  }
  const secret = randomBytes(48).toString('hex')
  writeStored({ jwtSecret: encrypt(secret) })
  return secret
}
