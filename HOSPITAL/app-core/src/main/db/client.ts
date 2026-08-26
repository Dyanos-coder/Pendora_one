import { join } from 'path'
import { PrismaClient } from '../../generated/prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import { getAppDataDir, isDevEnvironment } from '../paths'
import { getOrCreateDatabaseKey } from '../security/db-key'

/**
 * Emplacement de la base locale de ce poste. Un seul fichier pour l'instant : en l'absence
 * d'annuaire cloud (itération 1), cette base joue à la fois le rôle d'annuaire et de données
 * du tenant (voir prisma/schema.prisma).
 *
 * Dev : `dev.db` en clair, à la racine du projet — c'est le même fichier que celui utilisé
 * par `prisma migrate dev` / `prisma db seed` / `prisma studio`, qui ne savent pas ouvrir un
 * fichier chiffré. Prod : `pandora-health.db` chiffré (voir db-key.ts), isolé dans `userData`.
 */
function resolveDatabasePath(): string {
  return join(getAppDataDir(), isDevEnvironment() ? 'dev.db' : 'pandora-health.db')
}

let prismaClient: PrismaClient | undefined

export function getPrismaClient(): PrismaClient {
  if (!prismaClient) {
    const dbPath = resolveDatabasePath()
    const encryptionKey = isDevEnvironment() ? undefined : getOrCreateDatabaseKey()
    const adapter = new PrismaLibSql({ url: `file:${dbPath}`, encryptionKey })
    prismaClient = new PrismaClient({ adapter })
  }
  return prismaClient
}
