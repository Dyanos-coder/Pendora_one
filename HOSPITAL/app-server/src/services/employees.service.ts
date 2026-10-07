import { getPrismaClient } from '../db/client'

export async function listEmployees() {
  const prisma = getPrismaClient()
  const employees = await prisma.employee.findMany({
    where: { isActive: true },
    orderBy: { lastName: 'asc' }
  })
  return employees.map((e) => ({
    id: e.id,
    firstName: e.firstName,
    lastName: e.lastName,
    role: e.role,
    specialty: e.specialty,
    department: e.department
  }))
}

/** Fiches employé actives pas encore rattachées à un compte de connexion (`Employee.userId`
 * encore vide) — alimente le sélecteur "Lier à une fiche employé" à la création d'un compte
 * (voir UserFormModal.tsx, app-core) : un médecin ne peut être restreint à ses propres
 * rendez-vous que si son compte est effectivement rattaché à sa fiche employé. */
export async function listUnlinkedEmployees() {
  const prisma = getPrismaClient()
  const employees = await prisma.employee.findMany({
    where: { isActive: true, userId: null },
    orderBy: { lastName: 'asc' }
  })
  return employees.map((e) => ({
    id: e.id,
    firstName: e.firstName,
    lastName: e.lastName,
    role: e.role,
    specialty: e.specialty,
    department: e.department
  }))
}
