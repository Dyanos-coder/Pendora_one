import mariadb, { type Connection } from 'mariadb'
import { mariadbOptions, type DbConnectionConfig } from './connection-config'

export type DbFailureReason =
  | 'ACCESS_DENIED'
  | 'UNKNOWN_DATABASE'
  | 'HOST_NOT_ALLOWED'
  | 'HOST_NOT_FOUND'
  | 'HOST_UNREACHABLE'
  | 'TIMEOUT'
  | 'UNKNOWN'

export type DbTestResult = { ok: true } | { ok: false; reason: DbFailureReason; message: string }

const MESSAGES: Record<DbFailureReason, string> = {
  ACCESS_DENIED: 'Accès refusé : utilisateur ou mot de passe incorrect.',
  UNKNOWN_DATABASE: 'Base de données introuvable : vérifiez le nom de la base.',
  HOST_NOT_ALLOWED:
    "Ce poste n'est pas autorisé à se connecter : activez « MySQL distant » chez l'hébergeur et autorisez l'IP de l'hôpital.",
  HOST_NOT_FOUND: "Hôte introuvable : vérifiez l'adresse du serveur de base de données.",
  HOST_UNREACHABLE:
    "Serveur de base de données injoignable : vérifiez l'adresse, le port, et que les connexions distantes sont autorisées chez l'hébergeur.",
  TIMEOUT: "Le serveur de base de données ne répond pas (délai dépassé).",
  UNKNOWN: 'Connexion à la base impossible.'
}

function classify(error: unknown): DbFailureReason {
  const e = error as { code?: string; errno?: number; message?: string }
  const code = e.code ?? ''
  if (code === 'ER_ACCESS_DENIED_ERROR' || code === 'ER_DBACCESS_DENIED_ERROR' || e.errno === 1045 || e.errno === 1044) {
    return 'ACCESS_DENIED'
  }
  if (code === 'ER_BAD_DB_ERROR' || e.errno === 1049) return 'UNKNOWN_DATABASE'
  if (code === 'ER_HOST_NOT_PRIVILEGED' || code === 'ER_HOST_IS_BLOCKED' || e.errno === 1130 || e.errno === 1129) {
    return 'HOST_NOT_ALLOWED'
  }
  const text = `${code} ${e.message ?? ''}`
  if (/ENOTFOUND|EAI_AGAIN/.test(text)) return 'HOST_NOT_FOUND'
  if (/ECONNREFUSED|EHOSTUNREACH|ENETUNREACH|ECONNRESET/.test(text)) return 'HOST_UNREACHABLE'
  if (/TIMEOUT|ETIMEDOUT/i.test(text)) return 'TIMEOUT'
  return 'UNKNOWN'
}

/** Ouvre une connexion isolée (hors pool Prisma) pour vérifier des accès — utilisée par
 * l'assistant, l'écran de reconnexion et le contrôle au démarrage, avec une raison lisible. */
export async function testDbConnection(config: DbConnectionConfig): Promise<DbTestResult> {
  let connection: Connection | undefined
  try {
    connection = await mariadb.createConnection(mariadbOptions(config))
    await connection.query('SELECT 1')
    return { ok: true }
  } catch (error) {
    const reason = classify(error)
    const detail = (error as { message?: string }).message
    return { ok: false, reason, message: reason === 'UNKNOWN' && detail ? `${MESSAGES.UNKNOWN} (${detail})` : MESSAGES[reason] }
  } finally {
    await connection?.end().catch(() => undefined)
  }
}
