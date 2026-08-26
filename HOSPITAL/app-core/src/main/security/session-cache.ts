import { safeStorage } from 'electron'
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'fs'
import { join } from 'path'
import { getAppDataDir } from '../paths'
import type { Session } from '../../shared/auth-types'

const CACHE_FILE_NAME = 'session.cache.enc'
const SESSION_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 jours (§4.2)

export interface CachedSession {
  session: Session
  /** Jeton d'API (JWT) — nécessaire pour rappeler le backend distant après une reconnexion
   * hors-ligne, jamais exposé au renderer (voir remote-api.client.ts). */
  token: string
}

interface CachedSessionPayload extends CachedSession {
  issuedAt: number
}

function getCachePath(): string {
  return join(getAppDataDir(), CACHE_FILE_NAME)
}

/**
 * Permet la reconnexion automatique hors-ligne (§6, §4.2 étapes 5-6) : la dernière
 * session réussie (+ son jeton d'API) est mise en cache chiffrée (safeStorage) et rechargée
 * au démarrage de l'app tant qu'elle n'a pas expiré, sans appel réseau ni nouvelle saisie.
 */
export function saveSessionCache(cached: CachedSession): void {
  if (!safeStorage.isEncryptionAvailable()) {
    console.warn('[security] safeStorage indisponible : pas de cache de session hors-ligne sur ce poste.')
    return
  }
  const payload: CachedSessionPayload = { ...cached, issuedAt: Date.now() }
  writeFileSync(getCachePath(), safeStorage.encryptString(JSON.stringify(payload)))
}

export function loadSessionCache(): CachedSession | null {
  const cachePath = getCachePath()
  if (!existsSync(cachePath) || !safeStorage.isEncryptionAvailable()) {
    return null
  }

  try {
    const encrypted = readFileSync(cachePath)
    const payload = JSON.parse(safeStorage.decryptString(encrypted)) as CachedSessionPayload

    if (Date.now() - payload.issuedAt > SESSION_CACHE_TTL_MS) {
      clearSessionCache()
      return null
    }

    return { session: payload.session, token: payload.token }
  } catch (error) {
    console.warn('[security] cache de session illisible ou corrompu, ignoré.', error)
    clearSessionCache()
    return null
  }
}

export function clearSessionCache(): void {
  const cachePath = getCachePath()
  if (existsSync(cachePath)) {
    unlinkSync(cachePath)
  }
}
