import { randomUUID } from 'crypto'
import { getPrismaClient } from '../db/client'
import { nextCode } from './counter.service'
import { ConflictError } from '../lib/conflict-error'
import { ensurePicklistValue, PICKLIST_KEYS } from './picklist.service'
import type { BloodDonation, DonationStatus, BloodPouch, Patient } from '../generated/prisma/client'

export interface CreateDonationInput {
  /** Optionnel : id généré côté client (mode hors-ligne) — création idempotente si rejoué. */
  id?: string
  /** Donneur = patient existant (item 13 PETITES MODIFS) — exclusif avec `donorName` en donneur
   * externe, mais les deux ne sont jamais fournis en même temps par le formulaire. */
  patientId?: string
  donorName: string
  donorPhone?: string
  bloodGroup: string
  donationDate?: string
  volumeMl?: number
  status?: DonationStatus
  pouchId?: string
  note?: string
}

export interface UpdateDonationInput {
  patientId?: string | null
  donorName?: string
  donorPhone?: string | null
  bloodGroup?: string
  donationDate?: string
  volumeMl?: number | null
  status?: DonationStatus
  pouchId?: string | null
  note?: string | null
  /** Dernière version connue (`updatedAt`), pour détecter un conflit (voir §6.3). */
  expectedUpdatedAt?: string
}

type DonationWithRelations = BloodDonation & { pouch: BloodPouch | null; patient: Patient | null }

function toDisplay(d: DonationWithRelations) {
  return {
    id: d.id,
    reference: d.reference,
    patientId: d.patientId,
    donorName: d.patient ? `${d.patient.firstName} ${d.patient.lastName}` : d.donorName,
    donorPhone: d.patient?.phone ?? d.donorPhone,
    bloodGroup: d.bloodGroup,
    donationDate: d.donationDate.toISOString(),
    volumeMl: d.volumeMl,
    status: d.status,
    pouchId: d.pouchId,
    pouchNumber: d.pouch?.pouchNumber ?? null,
    note: d.note,
    updatedAt: d.updatedAt.toISOString()
  }
}

export async function listDonations() {
  const prisma = getPrismaClient()
  const donations = await prisma.bloodDonation.findMany({
    where: { deletedAt: null },
    include: { pouch: true, patient: true },
    orderBy: { donationDate: 'desc' }
  })
  return donations.map(toDisplay)
}

export async function createDonation(input: CreateDonationInput) {
  const prisma = getPrismaClient()

  if (input.id) {
    const existing = await prisma.bloodDonation.findUnique({ where: { id: input.id }, include: { pouch: true, patient: true } })
    if (existing) return toDisplay(existing)
  }

  const reference = await nextCode('BLOOD_DONATION', 'DON', 4)

  const donation = await prisma.bloodDonation.create({
    data: {
      id: input.id ?? randomUUID(),
      reference,
      patientId: input.patientId,
      donorName: input.donorName,
      donorPhone: input.donorPhone,
      bloodGroup: input.bloodGroup,
      donationDate: input.donationDate ? new Date(input.donationDate) : new Date(),
      volumeMl: input.volumeMl,
      status: input.status ?? 'PLANIFIE',
      pouchId: input.pouchId,
      note: input.note
    },
    include: { pouch: true, patient: true }
  })
  if (!input.patientId) await ensurePicklistValue(PICKLIST_KEYS.BLOOD_DONOR_NAME, input.donorName)
  return toDisplay(donation)
}

export async function updateDonation(id: string, input: UpdateDonationInput) {
  const prisma = getPrismaClient()

  if (input.expectedUpdatedAt) {
    const current = await prisma.bloodDonation.findUnique({ where: { id }, include: { pouch: true, patient: true } })
    if (current && current.updatedAt.toISOString() !== input.expectedUpdatedAt) {
      throw new ConflictError(toDisplay(current))
    }
  }

  const donation = await prisma.bloodDonation.update({
    where: { id },
    data: {
      patientId: input.patientId === undefined ? undefined : input.patientId,
      donorName: input.donorName,
      donorPhone: input.donorPhone === undefined ? undefined : input.donorPhone,
      bloodGroup: input.bloodGroup,
      donationDate: input.donationDate !== undefined ? new Date(input.donationDate) : undefined,
      volumeMl: input.volumeMl === undefined ? undefined : input.volumeMl,
      status: input.status,
      pouchId: input.pouchId === undefined ? undefined : input.pouchId,
      note: input.note === undefined ? undefined : input.note
    },
    include: { pouch: true, patient: true }
  })
  if (!donation.patientId && input.donorName) await ensurePicklistValue(PICKLIST_KEYS.BLOOD_DONOR_NAME, input.donorName)
  return toDisplay(donation)
}

export async function deleteDonation(id: string): Promise<void> {
  const prisma = getPrismaClient()
  await prisma.bloodDonation.update({ where: { id }, data: { deletedAt: new Date() } })
}
