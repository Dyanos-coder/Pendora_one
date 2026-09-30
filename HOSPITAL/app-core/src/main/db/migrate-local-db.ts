import { app } from 'electron'
import { readdirSync, readFileSync } from 'fs'
import { join } from 'path'
import type { PrismaClient } from '../../generated/prisma/client'

const MIGRATIONS_TABLE = '_local_migrations'

/**
 * La base locale (SQLite/libSQL, voir client.ts) n'est migrée par `prisma migrate dev` que sur un
 * poste de développement (le `dev.db` de dev est déjà à jour). En production, chaque poste crée un
 * fichier vide dans `userData` au tout premier lancement — sans jamais de table, puisque rien
 * n'appelle `prisma migrate deploy` (pas d'API prisma pour ça avec l'adaptateur libSQL de toute
 * façon). On rejoue donc ici, une seule fois chacun, les `migration.sql` du dossier
 * `prisma/migrations` dans l'ordre (noms préfixés par horodatage) — trace de ce qui a déjà été
 * appliqué dans une table dédiée plutôt que de supposer l'état de la base à chaque démarrage.
 *
 * `app.getAppPath()` pointe vers la racine du projet en dev et vers `app.asar` en production —
 * dans les deux cas `fs.readFileSync` fonctionne (Electron patche `fs` pour lire dans l'asar de
 * façon transparente), donc pas besoin d'`asarUnpack` pour ces fichiers texte.
 */
export async function migrateLocalDatabase(prisma: PrismaClient): Promise<void> {
  await prisma.$executeRawUnsafe(
    `CREATE TABLE IF NOT EXISTS "${MIGRATIONS_TABLE}" ("name" TEXT NOT NULL PRIMARY KEY, "appliedAt" TEXT NOT NULL)`
  )
  const appliedRows = await prisma.$queryRawUnsafe<{ name: string }[]>(`SELECT "name" FROM "${MIGRATIONS_TABLE}"`)
  const applied = new Set(appliedRows.map((r) => r.name))

  const migrationsDir = join(app.getAppPath(), 'prisma', 'migrations')
  const migrationFolders = readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()

  for (const folder of migrationFolders) {
    if (applied.has(folder)) continue

    const sql = readFileSync(join(migrationsDir, folder, 'migration.sql'), 'utf-8')
    const statements = sql
      .split(/;\s*(?:\r?\n|$)/)
      .map((statement) => statement.trim())
      .filter((statement) => statement.length > 0)

    for (const statement of statements) {
      await prisma.$executeRawUnsafe(statement)
    }
    await prisma.$executeRawUnsafe(
      `INSERT INTO "${MIGRATIONS_TABLE}" ("name", "appliedAt") VALUES (?, ?)`,
      folder,
      new Date().toISOString()
    )
  }
}
