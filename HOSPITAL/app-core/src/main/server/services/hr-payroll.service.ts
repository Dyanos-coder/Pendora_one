import { randomUUID } from 'crypto'
import { getPrismaClient } from '../db/client'
import type { PayrollEntry, PayrollStatus, Employee } from '../generated/prisma/client'

export interface CreatePayrollEntryInput {
  employeeId: string
  period: string
  baseSalary: number
  bonuses?: number
  deductions?: number
  status?: PayrollStatus
  paidAt?: string
}

export interface UpdatePayrollEntryInput {
  period?: string
  baseSalary?: number
  bonuses?: number
  deductions?: number
  status?: PayrollStatus
  paidAt?: string | null
}

type PayrollWithEmployee = PayrollEntry & { employee: Employee }

function toDisplay(p: PayrollWithEmployee) {
  return {
    id: p.id,
    employeeId: p.employeeId,
    employeeName: `${p.employee.firstName} ${p.employee.lastName}`,
    period: p.period,
    baseSalary: p.baseSalary,
    bonuses: p.bonuses,
    deductions: p.deductions,
    netPay: p.baseSalary + p.bonuses - p.deductions,
    status: p.status,
    paidAt: p.paidAt?.toISOString() ?? null
  }
}

export async function listPayrollEntries() {
  const prisma = getPrismaClient()
  const entries = await prisma.payrollEntry.findMany({
    where: { deletedAt: null },
    include: { employee: true },
    orderBy: { period: 'desc' }
  })
  return entries.map(toDisplay)
}

export async function createPayrollEntry(input: CreatePayrollEntryInput) {
  const prisma = getPrismaClient()
  const entry = await prisma.payrollEntry.create({
    data: {
      id: randomUUID(),
      employeeId: input.employeeId,
      period: input.period,
      baseSalary: input.baseSalary,
      bonuses: input.bonuses ?? 0,
      deductions: input.deductions ?? 0,
      status: input.status ?? 'EN_PREPARATION',
      paidAt: input.paidAt ? new Date(input.paidAt) : undefined
    },
    include: { employee: true }
  })
  return toDisplay(entry)
}

export async function updatePayrollEntry(id: string, input: UpdatePayrollEntryInput) {
  const prisma = getPrismaClient()
  const entry = await prisma.payrollEntry.update({
    where: { id },
    data: {
      period: input.period,
      baseSalary: input.baseSalary,
      bonuses: input.bonuses,
      deductions: input.deductions,
      status: input.status,
      paidAt: input.paidAt !== undefined ? (input.paidAt ? new Date(input.paidAt) : null) : undefined
    },
    include: { employee: true }
  })
  return toDisplay(entry)
}

export async function deletePayrollEntry(id: string): Promise<void> {
  const prisma = getPrismaClient()
  await prisma.payrollEntry.update({ where: { id }, data: { deletedAt: new Date() } })
}
