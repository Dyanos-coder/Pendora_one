import mariadb from 'mariadb'
import { getDbConnectionConfig, mariadbOptions } from './connection-config'

/**
 * Exécute `task` sous un verrou MariaDB nommé (`GET_LOCK`), partagé par tous les postes : les
 * tâches qui ne doivent tourner qu'une fois pour tout l'hôpital (amorçage, automatisations) ne
 * sont pas lancées en double quand plusieurs postes sont allumés. Connexion dédiée, hors pool
 * Prisma : `GET_LOCK` est attaché à la connexion qui l'a pris.
 *
 * `waitSeconds = 0` : si un autre poste tient déjà le verrou, on passe simplement son tour
 * (renvoie `false`).
 */
export async function withDbLock(name: string, task: () => Promise<void>, waitSeconds = 0): Promise<boolean> {
  const connection = await mariadb.createConnection(mariadbOptions(getDbConnectionConfig()))
  try {
    const rows = (await connection.query('SELECT GET_LOCK(?, ?) AS acquired', [name, waitSeconds])) as { acquired: unknown }[]
    if (Number(rows[0]?.acquired) !== 1) return false
    try {
      await task()
    } finally {
      await connection.query('SELECT RELEASE_LOCK(?)', [name]).catch(() => undefined)
    }
    return true
  } finally {
    await connection.end().catch(() => undefined)
  }
}
