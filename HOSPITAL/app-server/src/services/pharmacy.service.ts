import { randomUUID } from 'crypto'
import { getPrismaClient } from '../db/client'
import { ConflictError } from '../lib/conflict-error'
import { ensurePicklistValue, PICKLIST_KEYS } from './picklist.service'
import type { Medication } from '../generated/prisma/client'

export interface CreateMedicationInput {
  /** Optionnel : id généré côté client (mode hors-ligne) — création idempotente si rejoué. */
  id?: string
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
  /** Dernière version connue (`updatedAt`) du poste qui modifie, pour détecter un conflit si la
   * fiche a été modifiée entre-temps par quelqu'un d'autre (mode hors-ligne, voir
   * Plan-Mode-Hors-Ligne-Synchronisation.md §6.3). Absent : pas de vérification (mise à jour en
   * ligne normale, jamais hors-ligne). */
  expectedUpdatedAt?: string
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
    nearestExpiry: m.nearestExpiry?.toISOString() ?? null,
    updatedAt: m.updatedAt.toISOString()
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

  if (input.id) {
    const existing = await prisma.medication.findUnique({ where: { id: input.id } })
    if (existing) return toDisplay(existing)
  }

  const medication = await prisma.medication.create({
    data: {
      id: input.id ?? randomUUID(),
      name: input.name,
      category: input.category,
      location: input.location,
      available: input.available,
      minThreshold: input.minThreshold,
      nearestExpiry: input.nearestExpiry ? new Date(input.nearestExpiry) : undefined
    }
  })
  await ensurePicklistValue(PICKLIST_KEYS.PHARMACY_MEDICATION_NAME, input.name)
  await ensurePicklistValue(PICKLIST_KEYS.PHARMACY_MEDICATION_CATEGORY, input.category)
  return toDisplay(medication)
}

export async function updateMedication(id: string, input: UpdateMedicationInput) {
  const prisma = getPrismaClient()

  if (input.expectedUpdatedAt) {
    const current = await prisma.medication.findUnique({ where: { id } })
    if (current && current.updatedAt.toISOString() !== input.expectedUpdatedAt) {
      throw new ConflictError(toDisplay(current))
    }
  }

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
  await ensurePicklistValue(PICKLIST_KEYS.PHARMACY_MEDICATION_NAME, input.name)
  await ensurePicklistValue(PICKLIST_KEYS.PHARMACY_MEDICATION_CATEGORY, input.category)
  return toDisplay(medication)
}
