import { randomUUID } from 'crypto'
import { getPrismaClient } from '../db/client'
import type { EmployeeContractType, Role } from '../generated/prisma/client'

const WORKING_DAYS_PER_MONTH = 21

export interface CreateHrEmployeeInput {
  firstName: string
  lastName: string
  role: Role
  specialty?: string
  department?: string
  matricule?: string
  contractType?: EmployeeContractType
  contractNumber?: string
  hireDate?: string
  contractEndDate?: string
}

export interface UpdateHrEmployeeInput {
  firstName?: string
  lastName?: string
  role?: Role
  specialty?: string | null
  department?: string | null
  matricule?: string | null
  contractType?: EmployeeContractType | null
  contractNumber?: string | null
  hireDate?: string | null
  contractEndDate?: string | null
}

function toDisplay(e: {
  id: string
  firstName: string
  lastName: string
  role: string
  specialty: string | null
  department: string | null
  matricule: string | null
  contractType: string | null
  contractNumber: string | null
  hireDate: Date | null
  contractEndDate: Date | null
  dailyStatus: string | null
  presentDays: number | null
  absentDays: number | null
  lateDays: number | null
  averageHoursMin: number | null
  overtimeHoursMin: number | null
}) {
  const presenceRate =
    e.presentDays !== null ? Math.round((e.presentDays / WORKING_DAYS_PER_MONTH) * 1000) / 10 : null

  return {
    id: e.id,
    firstName: e.firstName,
    lastName: e.lastName,
    role: e.role,
    specialty: e.specialty,
    department: e.department,
    matricule: e.matricule,
    contractType: e.contractType,
    contractNumber: e.contractNumber,
    hireDate: e.hireDate?.toISOString() ?? null,
    contractEndDate: e.contractEndDate?.toISOString() ?? null,
    dailyStatus: e.dailyStatus,
    presentDays: e.presentDays,
    absentDays: e.absentDays,
    lateDays: e.lateDays,
    monthlyPresenceRate: presenceRate,
    averageHoursMin: e.averageHoursMin,
    overtimeHoursMin: e.overtimeHoursMin
  }
}

export async function listHrEmployees() {
  const prisma = getPrismaClient()
  const employees = await prisma.employee.findMany({
    where: { isActive: true },
    orderBy: { lastName: 'asc' }
  })
  return employees.map(toDisplay)
}

export async function createHrEmployee(input: CreateHrEmployeeInput) {
  const prisma = getPrismaClient()
  const employee = await prisma.employee.create({
    data: {
      id: randomUUID(),
      firstName: input.firstName,
      lastName: input.lastName,
      role: input.role,
      specialty: input.specialty,
      department: input.department,
      matricule: input.matricule,
      contractType: input.contractType,
      contractNumber: input.contractNumber,
      hireDate: input.hireDate ? new Date(input.hireDate) : undefined,
      contractEndDate: input.contractEndDate ? new Date(input.contractEndDate) : undefined
    }
  })
  return toDisplay(employee)
}

/** "Supprimer" un employé = le désactiver (réutilise Employee.isActive, déjà le mécanisme de
 * masquage utilisé par listHrEmployees) plutôt que d'ajouter un second champ deletedAt
 * redondant sur ce modèle. */
export async function deleteHrEmployee(id: string): Promise<void> {
  const prisma = getPrismaClient()
  await prisma.employee.update({ where: { id }, data: { isActive: false } })
}

export async function updateHrEmployee(id: string, input: UpdateHrEmployeeInput) {
  const prisma = getPrismaClient()
  const employee = await prisma.employee.update({
    where: { id },
    data: {
      firstName: input.firstName,
      lastName: input.lastName,
      role: input.role,
      specialty: input.specialty === undefined ? undefined : input.specialty,
      department: input.department === undefined ? undefined : input.department,
      matricule: input.matricule === undefined ? undefined : input.matricule,
      contractType: input.contractType === undefined ? undefined : input.contractType,
      contractNumber: input.contractNumber === undefined ? undefined : input.contractNumber,
      hireDate: input.hireDate !== undefined ? (input.hireDate ? new Date(input.hireDate) : null) : undefined,
      contractEndDate:
        input.contractEndDate !== undefined ? (input.contractEndDate ? new Date(input.contractEndDate) : null) : undefined
    }
  })
  return toDisplay(employee)
}
