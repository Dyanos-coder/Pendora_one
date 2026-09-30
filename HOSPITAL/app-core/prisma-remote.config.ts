// Schéma de la base MariaDB DISTANTE (partagée par tous les postes), distinct du schéma SQLite
// local (prisma/schema.prisma, mode hors-ligne) — voir Plan-Backend-Embarque-Travaux.md. Sert
// uniquement en développement (`npm run prisma:remote:generate`, `prisma:remote:migrate`) : en
// production, l'app applique elle-même les migrations au démarrage (voir
// src/main/server/db/migrate-remote-db.ts), sans CLI Prisma.
import 'dotenv/config'
import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: 'prisma-remote/schema.prisma',
  migrations: {
    path: 'prisma-remote/migrations'
  },
  datasource: {
    url: process.env['REMOTE_DATABASE_URL'] ?? 'mysql://user:password@localhost:3306/pandora_health'
  }
})
