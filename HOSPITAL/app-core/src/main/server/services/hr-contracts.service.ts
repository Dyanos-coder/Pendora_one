import { randomUUID } from 'crypto'
import { getPrismaClient } from '../db/client'
import type { EmployeeContract, EmployeeContractType, EmployeeContractStatus, Employee } from '../generated/prisma/client'

export interface CreateContractInput {
  employeeId: string
  type: EmployeeContractType
  contractNumber: string
  position: string
  startDate: string
  endDate?: string
  salary?: number
  status?: EmployeeContractStatus
}

export interface UpdateContractInput {
  type?: EmployeeContractType
  contractNumber?: string
  position?: string
  startDate?: string
  endDate?: string | null
  salary?: number | null
  status?: EmployeeContractStatus
}

type ContractWithEmployee = EmployeeContract & { employee: Employee }

function toDisplay(c: ContractWithEmployee) {
  return {
    id: c.id,
    employeeId: c.employeeId,
    employeeName: `${c.employee.firstName} ${c.employee.lastName}`,
    type: c.type,
    contractNumber: c.contractNumber,
    position: c.position,
    startDate: c.startDate.toISOString(),
    endDate: c.endDate?.toISOString() ?? null,
    salary: c.salary,
    status: c.status
  }
}

export async function listContracts() {
  const prisma = getPrismaClient()
  const contracts = await prisma.employeeContract.findMany({
    where: { deletedAt: null },
    include: { employee: true },
    orderBy: { startDate: 'desc' }
  })
  return contracts.map(toDisplay)
}

export async function createContract(input: CreateContractInput) {
  const prisma = getPrismaClient()
  const contract = await prisma.employeeContract.create({
    data: {
      id: randomUUID(),
      employeeId: input.employeeId,
      type: input.type,
      contractNumber: input.contractNumber,
      position: input.position,
      startDate: new Date(input.startDate),
      endDate: input.endDate ? new Date(input.endDate) : undefined,
      salary: input.salary,
      status: input.status ?? 'ACTIF'
    },
    include: { employee: true }
  })
  return toDisplay(contract)
}

export async function updateContract(id: string, input: UpdateContractInput) {
  const prisma = getPrismaClient()
  const contract = await prisma.employeeContract.update({
    where: { id },
    data: {
      type: input.type,
      contractNumber: input.contractNumber,
      position: input.position,
      startDate: input.startDate !== undefined ? new Date(input.startDate) : undefined,
      endDate: input.endDate !== undefined ? (input.endDate ? new Date(input.endDate) : null) : undefined,
      salary: input.salary === undefined ? undefined : input.salary,
      status: input.status
    },
    include: { employee: true }
  })
  return toDisplay(contract)
}

export async function deleteContract(id: string): Promise<void> {
  const prisma = getPrismaClient()
  await prisma.employeeContract.update({ where: { id }, data: { deletedAt: new Date() } })
}
