import { randomUUID } from 'crypto'
import { getPrismaClient } from '../db/client'
import { ConflictError } from '../lib/conflict-error'
import { buildXlsxDocument } from './xlsx-export'
import type { EmployeeContractType, Role } from '../generated/prisma/client'

const WORKING_DAYS_PER_MONTH = 21

export interface CreateHrEmployeeInput {
  /** Optionnel : id généré côté client (mode hors-ligne) — création idempotente si rejoué. */
  id?: string
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
  /** Dernière version connue (`updatedAt`) de l'employé, pour détecter un conflit si sa fiche a
   * été modifiée entre-temps par quelqu'un d'autre (mode hors-ligne, voir
   * Plan-Mode-Hors-Ligne-Synchronisation.md §6.3). Absent : pas de vérification (mise à jour en
   * ligne normale, jamais hors-ligne). */
  expectedUpdatedAt?: string
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
  updatedAt: Date
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
    overtimeHoursMin: e.overtimeHoursMin,
    updatedAt: e.updatedAt.toISOString()
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

// Rollout "Export Excel" (item 10, voir xlsx-export.ts) — réutilise listHrEmployees() plutôt que
// de dupliquer la requête Prisma.
export async function exportHrEmployees() {
  const employees = await listHrEmployees()
  return buildXlsxDocument(
    'Ressources Humaines',
    'Employés',
    [
      { header: 'Nom', key: 'lastName', width: 16 },
      { header: 'Prénom', key: 'firstName', width: 16 },
      { header: 'Matricule', key: 'matricule', width: 14 },
      { header: 'Fonction', key: 'role', width: 16 },
      { header: 'Spécialité', key: 'specialty', width: 20 },
      { header: 'Service', key: 'department', width: 18 },
      { header: 'Type de contrat', key: 'contractType', width: 14 },
      { header: 'N° contrat', key: 'contractNumber', width: 16 },
      { header: "Date d'embauche", key: 'hireDate', width: 16 },
      { header: 'Fin de contrat', key: 'contractEndDate', width: 16 },
      { header: 'Statut du jour', key: 'dailyStatus', width: 14 },
      { header: 'Jours présents', key: 'presentDays', width: 12 },
      { header: 'Jours absents', key: 'absentDays', width: 12 },
      { header: 'Retards', key: 'lateDays', width: 12 },
      { header: 'Taux de présence (%)', key: 'monthlyPresenceRate', width: 16 }
    ],
    employees.map((e) => ({
      ...e,
      hireDate: e.hireDate ? new Date(e.hireDate).toLocaleDateString('fr-FR') : '',
      contractEndDate: e.contractEndDate ? new Date(e.contractEndDate).toLocaleDateString('fr-FR') : ''
    }))
  )
}

export async function createHrEmployee(input: CreateHrEmployeeInput) {
  const prisma = getPrismaClient()

  if (input.id) {
    const existing = await prisma.employee.findUnique({ where: { id: input.id } })
    if (existing) return toDisplay(existing)
  }

  const employee = await prisma.employee.create({
    data: {
      id: input.id ?? randomUUID(),
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

  if (input.expectedUpdatedAt) {
    const current = await prisma.employee.findUnique({ where: { id } })
    if (current && current.updatedAt.toISOString() !== input.expectedUpdatedAt) {
      throw new ConflictError(toDisplay(current))
    }
  }

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
