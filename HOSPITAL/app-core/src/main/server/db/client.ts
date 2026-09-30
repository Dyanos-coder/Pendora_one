import { PrismaClient } from '../generated/prisma/client'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import { getDbConnectionConfig, mariadbOptions, setDbConnectionConfig, type DbConnectionConfig } from './connection-config'

let prismaClient: PrismaClient | undefined

export function getPrismaClient(): PrismaClient {
  if (!prismaClient) {
    const config = getDbConnectionConfig()
    // Pool réduit : chaque poste a le sien, et un poste = un seul utilisateur. Avec 20 postes on
    // reste à ~60 connexions, sous la limite des offres MySQL mutualisées.
    const adapter = new PrismaMariaDb({
      ...mariadbOptions(config),
      connectionLimit: 3,
      acquireTimeout: 8000
    })
    prismaClient = new PrismaClient({ adapter })
  }
  return prismaClient
}

/** Change les accès à la base (assistant, écran de reconnexion) : le pool actuel est fermé et le
 * prochain `getPrismaClient()` en recrée un avec les nouveaux accès. */
export async function configureRemoteDatabase(config: DbConnectionConfig | null): Promise<void> {
  const previous = prismaClient
  prismaClient = undefined
  setDbConnectionConfig(config)
  await previous?.$disconnect().catch(() => undefined)
}

/** Sonde de joignabilité réelle de la base (`SELECT 1`), bornée dans le temps. */
export async function pingDatabase(timeoutMs = 5000): Promise<boolean> {
  try {
    const prisma = getPrismaClient()
    const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs))
    await Promise.race([prisma.$queryRawUnsafe('SELECT 1'), timeout])
    return true
  } catch {
    return false
  }
}
