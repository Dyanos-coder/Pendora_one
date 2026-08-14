import { join } from 'path'
import bcrypt from 'bcryptjs'
import { PrismaClient, Role } from '../src/generated/prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'

// Script exécuté hors Electron (via tsx), donc pas d'accès à `app.getPath` : on pointe
// directement sur le fichier de dev utilisé par `prisma migrate dev` (racine du projet,
// voir DATABASE_URL dans .env : "file:./dev.db").
const dbPath = join(__dirname, '..', 'dev.db')
const adapter = new PrismaLibSql({ url: `file:${dbPath}` })
const prisma = new PrismaClient({ adapter })

const DEMO_PASSWORD = 'demo1234'

async function main(): Promise<void> {
  const tenant = await prisma.tenant.upsert({
    where: { id: 'demo-tenant' },
    update: {},
    create: { id: 'demo-tenant', name: 'Entreprise Démo', sector: 'retail' }
  })

  const dirigeant = await prisma.user.upsert({
    where: { email: 'dirigeant@demo.pandora' },
    update: {},
    create: {
      email: 'dirigeant@demo.pandora',
      name: 'Amina Dirigeante',
      passwordHash: bcrypt.hashSync(DEMO_PASSWORD, 10)
    }
  })

  const employe = await prisma.user.upsert({
    where: { email: 'employe@demo.pandora' },
    update: {},
    create: {
      email: 'employe@demo.pandora',
      name: 'Koffi Employé',
      passwordHash: bcrypt.hashSync(DEMO_PASSWORD, 10)
    }
  })

  await prisma.membership.upsert({
    where: { userId_tenantId: { userId: dirigeant.id, tenantId: tenant.id } },
    update: { role: Role.DIRIGEANT },
    create: { userId: dirigeant.id, tenantId: tenant.id, role: Role.DIRIGEANT }
  })

  await prisma.membership.upsert({
    where: { userId_tenantId: { userId: employe.id, tenantId: tenant.id } },
    update: { role: Role.EMPLOYE },
    create: { userId: employe.id, tenantId: tenant.id, role: Role.EMPLOYE }
  })

  console.log('Seed OK — comptes de démo :')
  console.log(`  dirigeant@demo.pandora / ${DEMO_PASSWORD}  (rôle DIRIGEANT)`)
  console.log(`  employe@demo.pandora   / ${DEMO_PASSWORD}  (rôle EMPLOYE)`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
