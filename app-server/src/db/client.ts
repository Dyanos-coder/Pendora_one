import { PrismaClient } from '../generated/prisma/client'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import { getDbConnectionConfig } from './connection-config'

let prismaClient: PrismaClient | undefined

export function getPrismaClient(): PrismaClient {
  if (!prismaClient) {
    const config = getDbConnectionConfig()
    const adapter = new PrismaMariaDb({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      connectionLimit: 5
    })
    prismaClient = new PrismaClient({ adapter })
  }
  return prismaClient
}
