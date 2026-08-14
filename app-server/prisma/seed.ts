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
      data: { name: 'Entreprise Démo', sector: 'retail' }
    })
  }

  await prisma.user.upsert({
    where: { email: 'dirigeant@demo.pandora' },
    update: {},
    create: {
      email: 'dirigeant@demo.pandora',
      name: 'Amina Dirigeante',
      passwordHash: bcrypt.hashSync(DEMO_PASSWORD, 10),
      role: Role.DIRIGEANT
    }
  })

  await prisma.user.upsert({
    where: { email: 'employe@demo.pandora' },
    update: {},
    create: {
      email: 'employe@demo.pandora',
      name: 'Koffi Employé',
      passwordHash: bcrypt.hashSync(DEMO_PASSWORD, 10),
      role: Role.EMPLOYE
    }
  })

  const existingInvoices = await prisma.invoice.count()
  if (existingInvoices === 0) {
    await prisma.invoice.createMany({
      data: [
        {
          reference: 'INV-2023-089',
          description: 'Facture #INV-2023-089',
          partyName: 'Global Logistics Corp.',
          amount: 450000,
          status: 'PAYE',
          issuedAt: new Date('2023-10-14')
        },
        {
          reference: 'ACH-2023-041',
          description: 'Achat matériel bureau',
          partyName: 'Stationery Masters',
          amount: 125000,
          status: 'EN_ATTENTE',
          issuedAt: new Date('2023-10-12')
        },
        {
          reference: 'ABO-2023-018',
          description: 'Abonnement Logiciel Cloud',
          partyName: 'Cloud Infrastructure',
          amount: 85000,
          status: 'EN_RETARD',
          issuedAt: new Date('2023-10-08')
        },
        {
          reference: 'CONS-2023-003',
          description: 'Consultance Q3',
          partyName: 'Hervé Consulting',
          amount: 2500000,
          status: 'PAYE',
          issuedAt: new Date('2023-10-05')
        }
      ]
    })
  }

  console.log('Seed OK — comptes de démo (MySQL distant) :')
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
