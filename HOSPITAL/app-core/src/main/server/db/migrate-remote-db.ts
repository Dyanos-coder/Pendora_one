import { createHash, randomUUID } from 'crypto'
import { readdirSync, readFileSync } from 'fs'
import { join } from 'path'
import mariadb from 'mariadb'
import { getDbConnectionConfig, mariadbOptions } from './connection-config'

/**
 * Applique au démarrage les migrations MariaDB manquantes — remplace le `prisma migrate deploy`
 * que lançait le serveur hébergé (la CLI Prisma n'est pas livrée avec l'app). Même table de suivi
 * que Prisma (`_prisma_migrations`), donc compatible avec une base déjà migrée par l'ancien
 * serveur comme avec `prisma migrate` en développement.
 *
 * Plusieurs postes, potentiellement à des versions différentes, partagent la même base :
 * - verrou `GET_LOCK` pour que deux postes ne migrent jamais en même temps ;
 * - si la base contient une migration que cette version de l'app ne connaît pas, elle est plus
 *   récente que l'app → on refuse de continuer (`APP_OUTDATED`) plutôt que d'écrire dans un
 *   schéma inconnu.
 */

export type RemoteMigrationResult =
  | { ok: true; applied: string[] }
  | { ok: false; reason: 'APP_OUTDATED' | 'FAILED'; message: string }

const LOCK_NAME = 'pandora_health_migrations'

const CREATE_MIGRATIONS_TABLE = `CREATE TABLE IF NOT EXISTS \`_prisma_migrations\` (
  \`id\` VARCHAR(36) PRIMARY KEY NOT NULL,
  \`checksum\` VARCHAR(64) NOT NULL,
  \`finished_at\` DATETIME(3),
  \`migration_name\` VARCHAR(255) NOT NULL,
  \`logs\` TEXT,
  \`rolled_back_at\` DATETIME(3),
  \`started_at\` DATETIME(3) NOT NULL DEFAULT current_timestamp(3),
  \`applied_steps_count\` INTEGER UNSIGNED NOT NULL DEFAULT 0
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`

export async function migrateRemoteDatabase(migrationsDir: string): Promise<RemoteMigrationResult> {
  const known = readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()

  const connection = await mariadb.createConnection({ ...mariadbOptions(getDbConnectionConfig()), multipleStatements: true })
  try {
    const lock = (await connection.query('SELECT GET_LOCK(?, 120) AS acquired', [LOCK_NAME])) as { acquired: unknown }[]
    if (Number(lock[0]?.acquired) !== 1) {
      return { ok: false, reason: 'FAILED', message: 'Un autre poste est en train de mettre à jour la base. Réessayez dans un instant.' }
    }

    try {
      await connection.query(CREATE_MIGRATIONS_TABLE)
      const rows = (await connection.query(
        'SELECT migration_name, finished_at FROM `_prisma_migrations` WHERE rolled_back_at IS NULL'
      )) as { migration_name: string; finished_at: Date | null }[]

      const failed = rows.find((r) => r.finished_at === null)
      if (failed) {
        return {
          ok: false,
          reason: 'FAILED',
          message: `La mise à jour « ${failed.migration_name} » de la base a échoué précédemment — intervention manuelle nécessaire.`
        }
      }

      const applied = new Set(rows.map((r) => r.migration_name))
      const knownSet = new Set(known)
      if ([...applied].some((name) => !knownSet.has(name))) {
        return {
          ok: false,
          reason: 'APP_OUTDATED',
          message: "La base de données a été mise à jour par une version plus récente de l'application. Mettez à jour l'application sur ce poste."
        }
      }

      const done: string[] = []
      for (const name of known) {
        if (applied.has(name)) continue
        const sql = readFileSync(join(migrationsDir, name, 'migration.sql'), 'utf-8')
        const id = randomUUID()
        const checksum = createHash('sha256').update(sql).digest('hex')
        await connection.query(
          'INSERT INTO `_prisma_migrations` (id, checksum, migration_name, started_at, applied_steps_count) VALUES (?, ?, ?, NOW(3), 0)',
          [id, checksum, name]
        )
        try {
          if (sql.trim()) await connection.query(sql)
        } catch (error) {
          const message = (error as Error).message
          await connection.query('UPDATE `_prisma_migrations` SET logs = ? WHERE id = ?', [message, id]).catch(() => undefined)
          return { ok: false, reason: 'FAILED', message: `Échec de la mise à jour « ${name} » de la base : ${message}` }
        }
        await connection.query('UPDATE `_prisma_migrations` SET finished_at = NOW(3), applied_steps_count = 1 WHERE id = ?', [id])
        done.push(name)
      }
      return { ok: true, applied: done }
    } finally {
      await connection.query('SELECT RELEASE_LOCK(?)', [LOCK_NAME]).catch(() => undefined)
    }
  } finally {
    await connection.end().catch(() => undefined)
  }
}
