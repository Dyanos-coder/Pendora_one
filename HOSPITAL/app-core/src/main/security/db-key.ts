import { safeStorage } from 'electron'
import { randomBytes } from 'crypto'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { getAppDataDir } from '../paths'

const KEY_FILE_NAME = 'db.key.enc'

/**
 * Clé de chiffrement de la base de production, générée une fois par installation et
 * protégée par le coffre de l'OS (DPAPI / Keychain / libsecret) via `safeStorage`.
 * Jamais utilisée en dev : voir client.ts (dev.db reste en clair pour que la CLI
 * Prisma — migrate/seed/studio — continue de fonctionner normalement).
 */
export function getOrCreateDatabaseKey(): string {
  const keyPath = join(getAppDataDir(), KEY_FILE_NAME)

  if (!safeStorage.isEncryptionAvailable()) {
    console.warn(
      '[security] safeStorage indisponible sur ce système : la clé de base est stockée en clair (dégradé).'
    )
    if (existsSync(keyPath)) {
      return readFileSync(keyPath, 'utf-8')
    }
    const fallbackKey = randomBytes(32).toString('hex')
    writeFileSync(keyPath, fallbackKey, 'utf-8')
    return fallbackKey
  }

  if (existsSync(keyPath)) {
    const encrypted = readFileSync(keyPath)
    return safeStorage.decryptString(encrypted)
  }

  const key = randomBytes(32).toString('hex')
  writeFileSync(keyPath, safeStorage.encryptString(key))
  return key
}
