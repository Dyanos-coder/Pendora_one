import 'dotenv/config'
import { defineConfig } from 'prisma/config'
import { getDbConnectionConfig, buildDatabaseUrl } from './src/db/connection-config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts'
  },
  datasource: {
    url: buildDatabaseUrl(getDbConnectionConfig())
  }
})
