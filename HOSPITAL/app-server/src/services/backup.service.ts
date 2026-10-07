import { getPrismaClient } from '../db/client'

// Sauvegarde/restauration complète de la base (item 21) — approche générique par introspection de
// `information_schema` plutôt qu'une liste de tables écrite à la main (~60 tables aujourd'hui,
// vouée à grandir) : le client Prisma 7 généré ici n'expose plus le DMMF à l'exécution comme les
// versions précédentes, mais interroger directement MySQL donne la même information (et reflète la
// structure RÉELLE de la base, pas le schéma tel que Prisma croit le connaître). Le fichier de
// sauvegarde produit ne dépend d'aucun outil externe (`mysqldump`) — l'hébergement ne garantit pas
// d'accès shell — tout passe par des requêtes SQL via le client déjà en place.

const MIGRATIONS_TABLE = '_prisma_migrations'

interface EncodedBuffer {
  __type: 'buffer'
  base64: string
}
interface EncodedDate {
  __type: 'date'
  iso: string
}
type EncodedValue = EncodedBuffer | EncodedDate | string | number | boolean | null

interface BackupTable {
  table: string
  rows: Record<string, EncodedValue>[]
}

export interface BackupFile {
  version: 1
  generatedAt: string
  database: string
  tables: BackupTable[]
}

async function listDataTables(): Promise<string[]> {
  const prisma = getPrismaClient()
  const rows = await prisma.$queryRawUnsafe<{ TABLE_NAME: string }[]>(
    `SELECT TABLE_NAME FROM information_schema.tables WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME`
  )
  return rows.map((r) => r.TABLE_NAME).filter((name) => name !== MIGRATIONS_TABLE)
}

function encodeValue(value: unknown): EncodedValue {
  // L'adaptateur `@prisma/adapter-mariadb` renvoie les colonnes BLOB en `Uint8Array` brut, pas en
  // `Buffer` Node — `Buffer.isBuffer()` renvoie donc `false` dessus (`Buffer` est une sous-classe
  // de `Uint8Array`, pas l'inverse). Avec le seul test `Buffer.isBuffer`, tout BLOB (documents
  // patient/employé, rapports générés, logo) passait inaperçu et finissait sérialisé en JSON comme
  // un objet `{"0":137,"1":80,...}` — un caractère par octet, illisible et bien plus lourd que le
  // fichier d'origine, d'où le dépassement de `max_allowed_packet` à la restauration.
  if (value instanceof Uint8Array) return { __type: 'buffer', base64: Buffer.from(value).toString('base64') }
  if (value instanceof Date) return { __type: 'date', iso: value.toISOString() }
  return value as EncodedValue
}

function decodeValue(value: EncodedValue): unknown {
  if (value && typeof value === 'object') {
    if ('__type' in value && value.__type === 'buffer') return Buffer.from((value as EncodedBuffer).base64, 'base64')
    if ('__type' in value && value.__type === 'date') return new Date((value as EncodedDate).iso)
  }
  return value
}

export async function exportDatabase(): Promise<BackupFile> {
  const prisma = getPrismaClient()
  const tables = await listDataTables()
  const result: BackupTable[] = []
  for (const table of tables) {
    const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(`SELECT * FROM \`${table}\``)
    result.push({
      table,
      rows: rows.map((row) => {
        const encoded: Record<string, EncodedValue> = {}
        for (const [key, value] of Object.entries(row)) encoded[key] = encodeValue(value)
        return encoded
      })
    })
  }
  const dbNameRow = await prisma.$queryRawUnsafe<{ db: string }[]>('SELECT DATABASE() as db')
  return { version: 1, generatedAt: new Date().toISOString(), database: dbNameRow[0]?.db ?? '', tables: result }
}

const INSERT_CHUNK_ROWS = 200

/** Estimation grossière (en octets) d'une ligne encodée — sert uniquement à ne pas dépasser
 * `max_allowed_packet` côté MySQL, pas besoin d'être exact. */
function estimateRowBytes(row: Record<string, EncodedValue>, columns: string[]): number {
  let size = 0
  for (const c of columns) {
    const value = row[c]
    if (value && typeof value === 'object' && '__type' in value) {
      size += value.__type === 'buffer' ? Math.ceil(((value as EncodedBuffer).base64.length * 3) / 4) : 32
    } else if (typeof value === 'string') {
      size += value.length
    } else {
      size += 16
    }
  }
  return size
}

/** `max_allowed_packet` détermine la taille max d'une requête envoyée à MySQL (tables avec
 * documents/BLOBs — `PatientDocument`, `EmployeeDocument`, `Company.logo` — peuvent largement
 * dépasser 200 lignes groupées si on ne regarde que le nombre de lignes). On lit la vraie valeur du
 * serveur plutôt que de deviner, avec une marge de sécurité pour le reste de la requête SQL. */
async function getInsertByteBudget(): Promise<number> {
  const prisma = getPrismaClient()
  try {
    const rows = await prisma.$queryRawUnsafe<{ v: bigint | number }[]>('SELECT @@max_allowed_packet as v')
    const maxAllowedPacket = Number(rows[0]?.v ?? 4 * 1024 * 1024)
    if (!Number.isFinite(maxAllowedPacket) || maxAllowedPacket <= 0) return 2 * 1024 * 1024
    return Math.max(256 * 1024, Math.min(maxAllowedPacket * 0.5, 8 * 1024 * 1024))
  } catch {
    return 2 * 1024 * 1024
  }
}

/** Remplace intégralement le contenu des tables présentes dans le fichier de sauvegarde par son
 * contenu — opération destructive, appelée uniquement depuis une route réservée au DIRIGEANT (voir
 * backup.routes.ts). `FOREIGN_KEY_CHECKS=0` le temps de l'opération : plus simple et tout aussi sûr
 * qu'un tri topologique des ~60 tables par dépendances de clé étrangère, et évite un ordre
 * d'insertion incorrect si le schéma évolue. Toute table du fichier absente de la base actuelle
 * (schéma restauré plus ancien qu'aujourd'hui) est ignorée plutôt que de faire échouer toute la
 * restauration. */
export async function importDatabase(backup: BackupFile): Promise<void> {
  if (!backup || backup.version !== 1 || !Array.isArray(backup.tables)) {
    throw new Error('Fichier de sauvegarde invalide ou format non reconnu.')
  }

  const prisma = getPrismaClient()
  const currentTables = new Set(await listDataTables())
  const insertByteBudget = await getInsertByteBudget()

  await prisma.$transaction(
    async (tx) => {
      await tx.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS=0')
      // On garde l'erreur d'origine à part : si `SET FOREIGN_KEY_CHECKS=1` échoue à son tour dans
      // le `finally` (ex. connexion déjà coupée par le vrai problème), on ne veut surtout pas que
      // cette erreur secondaire remplace la vraie cause — c'est ce qui masquait le diagnostic
      // jusqu'ici (le log ne montrait jamais que la ligne du `finally`).
      let primaryError: unknown
      try {
        for (const { table } of backup.tables) {
          if (!currentTables.has(table)) continue
          await tx.$executeRawUnsafe(`DELETE FROM \`${table}\``)
        }

        for (const { table, rows } of backup.tables) {
          if (!currentTables.has(table) || rows.length === 0) continue
          const columns = Object.keys(rows[0])
          const columnList = columns.map((c) => `\`${c}\``).join(', ')

          let i = 0
          while (i < rows.length) {
            const chunk: typeof rows = [rows[i]]
            let bytes = estimateRowBytes(rows[i], columns)
            i++
            while (i < rows.length && chunk.length < INSERT_CHUNK_ROWS) {
              const nextBytes = estimateRowBytes(rows[i], columns)
              if (bytes + nextBytes > insertByteBudget) break
              chunk.push(rows[i])
              bytes += nextBytes
              i++
            }

            const placeholders = chunk.map(() => `(${columns.map(() => '?').join(', ')})`).join(', ')
            const values = chunk.flatMap((row) => columns.map((c) => decodeValue(row[c])))
            try {
              await tx.$executeRawUnsafe(`INSERT INTO \`${table}\` (${columnList}) VALUES ${placeholders}`, ...values)
            } catch (error) {
              throw new Error(
                `Échec de l'insertion dans "${table}" (${chunk.length} ligne(s), ~${Math.round(bytes / 1024)} Ko) : ${
                  error instanceof Error ? error.message : String(error)
                }`
              )
            }
          }
        }
      } catch (error) {
        primaryError = error
        throw error
      } finally {
        try {
          await tx.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS=1')
        } catch (resetError) {
          if (!primaryError) throw resetError
        }
      }
    },
    { timeout: 10 * 60 * 1000, maxWait: 30 * 1000 }
  )
}
