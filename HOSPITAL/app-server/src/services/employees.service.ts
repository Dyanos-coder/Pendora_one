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
