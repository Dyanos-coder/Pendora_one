import { randomUUID } from 'crypto'
import { getPrismaClient } from '../db/client'
import type { EmployeeTraining, TrainingStatus, Employee } from '../generated/prisma/client'

export interface CreateTrainingInput {
  employeeId: string
  title: string
  provider?: string
  startDate: string
  endDate?: string
  status?: TrainingStatus
  certified?: boolean
}

export interface UpdateTrainingInput {
  title?: string
  provider?: string | null
  startDate?: string
  endDate?: string | null
  status?: TrainingStatus
  certified?: boolean
}

type TrainingWithEmployee = EmployeeTraining & { employee: Employee }

function toDisplay(t: TrainingWithEmployee) {
  return {
    id: t.id,
    employeeId: t.employeeId,
    employeeName: `${t.employee.firstName} ${t.employee.lastName}`,
    title: t.title,
    provider: t.provider,
    startDate: t.startDate.toISOString(),
    endDate: t.endDate?.toISOString() ?? null,
    status: t.status,
    certified: t.certified
  }
}

export async function listTrainings() {
  const prisma = getPrismaClient()
  const trainings = await prisma.employeeTraining.findMany({
    where: { deletedAt: null },
    include: { employee: true },
    orderBy: { startDate: 'desc' }
  })
  return trainings.map(toDisplay)
}

export async function createTraining(input: CreateTrainingInput) {
  const prisma = getPrismaClient()
  const training = await prisma.employeeTraining.create({
    data: {
      id: randomUUID(),
      employeeId: input.employeeId,
      title: input.title,
      provider: input.provider,
      startDate: new Date(input.startDate),
      endDate: input.endDate ? new Date(input.endDate) : undefined,
      status: input.status ?? 'PLANIFIEE',
      certified: input.certified ?? false
    },
    include: { employee: true }
  })
  return toDisplay(training)
}

export async function updateTraining(id: string, input: UpdateTrainingInput) {
  const prisma = getPrismaClient()
  const training = await prisma.employeeTraining.update({
    where: { id },
    data: {
      title: input.title,
      provider: input.provider === undefined ? undefined : input.provider,
      startDate: input.startDate !== undefined ? new Date(input.startDate) : undefined,
      endDate: input.endDate !== undefined ? (input.endDate ? new Date(input.endDate) : null) : undefined,
      status: input.status,
      certified: input.certified
    },
    include: { employee: true }
  })
  return toDisplay(training)
}

export async function deleteTraining(id: string): Promise<void> {
  const prisma = getPrismaClient()
  await prisma.employeeTraining.update({ where: { id }, data: { deletedAt: new Date() } })
}
