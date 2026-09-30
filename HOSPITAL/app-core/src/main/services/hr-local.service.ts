import { getPrismaClient } from '../db/client'
import type {
  ApiEmployeeContractType,
  ApiEmployeeDailyStatus,
  ApiHrEmployee,
  ApiRole,
  CreateHrEmployeeInput,
  UpdateHrEmployeeInput
} from '../../shared/hr-types'
import type { Employee as LocalEmployeeRow } from '../../generated/prisma/client'

// Mode hors-ligne — Phase 3 : RH, entité `Employee` uniquement (voir
// Plan-Mode-Hors-Ligne-Synchronisation.md). Aucune relation exposée par le service RH — fonction
// pure comme Pharmacie. Pas de code lisible. Contrairement aux autres domaines, la suppression
// douce se fait via `isActive: false` (comme côté serveur, item 6) et non `deletedAt` — l'entité
// `Employee` n'a pas ce champ côté serveur, le miroir local suit la même convention.

const WORKING_DAYS_PER_MONTH = 21

function toDisplay(row: LocalEmployeeRow): ApiHrEmployee {
  const presenceRate = row.presentDays !== null ? Math.round((row.presentDays / WORKING_DAYS_PER_MONTH) * 1000) / 10 : null
  return {
    id: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    role: row.role as ApiRole,
    specialty: row.specialty,
    department: row.department,
    matricule: row.matricule,
    contractType: row.contractType as ApiEmployeeContractType | null,
    contractNumber: row.contractNumber,
    hireDate: row.hireDate?.toISOString() ?? null,
    contractEndDate: row.contractEndDate?.toISOString() ?? null,
    dailyStatus: row.dailyStatus as ApiEmployeeDailyStatus | null,
    presentDays: row.presentDays,
    absentDays: row.absentDays,
    lateDays: row.lateDays,
    monthlyPresenceRate: presenceRate,
    averageHoursMin: row.averageHoursMin,
    overtimeHoursMin: row.overtimeHoursMin,
    updatedAt: row.updatedAt.toISOString()
  }
}

/** Version serveur connue (`serverUpdatedAt`) de la fiche employé, si déjà synchronisée —
 * `undefined` si elle n'a jamais été confirmée par le serveur (création encore PENDING) ou
 * n'existe pas localement, auquel cas aucune vérification de conflit n'est possible ni nécessaire
 * (voir Plan-Mode-Hors-Ligne-Synchronisation.md §6.3). */
export async function getLocalHrEmployeeServerUpdatedAt(id: string): Promise<string | undefined> {
  const prisma = getPrismaClient()
  const row = await prisma.employee.findUnique({ where: { id } })
  return row?.serverUpdatedAt ? row.serverUpdatedAt.toISOString() : undefined
}

export async function listLocalHrEmployees(): Promise<ApiHrEmployee[]> {
  const prisma = getPrismaClient()
  const rows = await prisma.employee.findMany({ where: { isActive: true }, orderBy: { lastName: 'asc' } })
  return rows.map(toDisplay)
}

export async function getLocalHrEmployee(id: string): Promise<ApiHrEmployee | null> {
  const prisma = getPrismaClient()
  const row = await prisma.employee.findUnique({ where: { id } })
  return row ? toDisplay(row) : null
}

export async function createLocalHrEmployee(id: string, input: CreateHrEmployeeInput): Promise<ApiHrEmployee> {
  const prisma = getPrismaClient()
  const row = await prisma.employee.create({
    data: {
      id,
      firstName: input.firstName,
      lastName: input.lastName,
      role: input.role,
      specialty: input.specialty,
      department: input.department,
      matricule: input.matricule,
      contractType: input.contractType,
      contractNumber: input.contractNumber,
      hireDate: input.hireDate ? new Date(input.hireDate) : undefined,
      contractEndDate: input.contractEndDate ? new Date(input.contractEndDate) : undefined,
      syncStatus: 'PENDING'
    }
  })
  return toDisplay(row)
}

export async function updateLocalHrEmployee(id: string, input: UpdateHrEmployeeInput): Promise<ApiHrEmployee> {
  const prisma = getPrismaClient()
  const row = await prisma.employee.update({
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
      contractEndDate: input.contractEndDate !== undefined ? (input.contractEndDate ? new Date(input.contractEndDate) : null) : undefined,
      syncStatus: 'PENDING'
    }
  })
  return toDisplay(row)
}

export async function softDeleteLocalHrEmployee(id: string): Promise<void> {
  const prisma = getPrismaClient()
  await prisma.employee.update({ where: { id }, data: { isActive: false, syncStatus: 'PENDING' } })
}

export async function upsertSyncedHrEmployee(e: ApiHrEmployee): Promise<void> {
  const prisma = getPrismaClient()
  const data = {
    firstName: e.firstName,
    lastName: e.lastName,
    role: e.role,
    specialty: e.specialty,
    department: e.department,
    matricule: e.matricule,
    contractType: e.contractType,
    contractNumber: e.contractNumber,
    hireDate: e.hireDate ? new Date(e.hireDate) : null,
    contractEndDate: e.contractEndDate ? new Date(e.contractEndDate) : null,
    dailyStatus: e.dailyStatus,
    presentDays: e.presentDays,
    absentDays: e.absentDays,
    lateDays: e.lateDays,
    averageHoursMin: e.averageHoursMin,
    overtimeHoursMin: e.overtimeHoursMin,
    isActive: true,
    serverUpdatedAt: new Date(e.updatedAt),
    syncStatus: 'SYNCED'
  }
  await prisma.employee.upsert({ where: { id: e.id }, update: data, create: { id: e.id, ...data } })
}

export async function syncDownHrEmployees(items: ApiHrEmployee[]): Promise<void> {
  for (const e of items) {
    await upsertSyncedHrEmployee(e)
  }
}
