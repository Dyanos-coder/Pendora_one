import { randomUUID } from 'crypto'
import { getPrismaClient } from '../db/client'
import type { Medication } from '../generated/prisma/client'

export interface CreateMedicationInput {
  name: string
  category: string
  location: string
  available: number
  minThreshold: number
  nearestExpiry?: string
}

export interface UpdateMedicationInput {
  name?: string
  category?: string
  location?: string
  available?: number
  minThreshold?: number
  nearestExpiry?: string | null
}

function stockState(m: Pick<Medication, 'available' | 'minThreshold'>): 'RUPTURE' | 'STOCK_FAIBLE' | 'DISPONIBLE' {
  if (m.available <= 0) return 'RUPTURE'
  if (m.available < m.minThreshold) return 'STOCK_FAIBLE'
  return 'DISPONIBLE'
}

function toDisplay(m: Medication) {
  return {
    id: m.id,
    name: m.name,
    category: m.category,
    location: m.location,
    available: m.available,
    minThreshold: m.minThreshold,
    state: stockState(m),
    nearestExpiry: m.nearestExpiry?.toISOString() ?? null
  }
}

export async function listMedications() {
  const prisma = getPrismaClient()
  const medications = await prisma.medication.findMany({ where: { deletedAt: null }, orderBy: { name: 'asc' } })
  return medications.map(toDisplay)
}

export async function deleteMedication(id: string): Promise<void> {
  const prisma = getPrismaClient()
  await prisma.medication.update({ where: { id }, data: { deletedAt: new Date() } })
}

export async function createMedication(input: CreateMedicationInput) {
  const prisma = getPrismaClient()
  const medication = await prisma.medication.create({
    data: {
      id: randomUUID(),
      name: input.name,
      category: input.category,
      location: input.location,
      available: input.available,
      minThreshold: input.minThreshold,
      nearestExpiry: input.nearestExpiry ? new Date(input.nearestExpiry) : undefined
    }
  })
  return toDisplay(medication)
}

export async function updateMedication(id: string, input: UpdateMedicationInput) {
  const prisma = getPrismaClient()
  const medication = await prisma.medication.update({
    where: { id },
    data: {
      name: input.name,
      category: input.category,
      location: input.location,
      available: input.available,
      minThreshold: input.minThreshold,
      nearestExpiry: input.nearestExpiry !== undefined ? (input.nearestExpiry ? new Date(input.nearestExpiry) : null) : undefined
    }
  })
  return toDisplay(medication)
}
