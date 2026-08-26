import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { PrismaClient, Role } from '../src/generated/prisma/client'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import { getDbConnectionConfig } from '../src/db/connection-config'

const config = getDbConnectionConfig()
const adapter = new PrismaMariaDb({
  host: config.host,
  port: config.port,
  database: config.database,
  user: config.user,
  password: config.password,
  connectionLimit: 5
})
const prisma = new PrismaClient({ adapter })

const DEMO_PASSWORD = 'demo1234'

async function main(): Promise<void> {
  const companyCount = await prisma.company.count()
  if (companyCount === 0) {
    await prisma.company.create({
      data: { name: 'Hôpital Démo', sector: 'sante' }
    })
  }

  await prisma.user.upsert({
    where: { email: 'directeur@demo.pandorahealth' },
    update: {},
    create: {
      email: 'directeur@demo.pandorahealth',
      name: 'Alain K.',
      passwordHash: bcrypt.hashSync(DEMO_PASSWORD, 10),
      role: Role.DIRIGEANT
    }
  })

  await prisma.user.upsert({
    where: { email: 'praticien@demo.pandorahealth' },
    update: {},
    create: {
      email: 'praticien@demo.pandorahealth',
      name: 'Fatou Mensah',
      passwordHash: bcrypt.hashSync(DEMO_PASSWORD, 10),
      role: Role.EMPLOYE
    }
  })

  console.log('Seed OK — comptes de démo (MySQL distant) :')
  console.log(`  directeur@demo.pandorahealth / ${DEMO_PASSWORD}  (rôle DIRIGEANT)`)
  console.log(`  praticien@demo.pandorahealth / ${DEMO_PASSWORD}  (rôle EMPLOYE)`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
