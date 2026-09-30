import { randomUUID } from 'crypto'
import { getPrismaClient } from '../db/client'
import { ConflictError } from '../lib/conflict-error'
import { computeAge } from './date-utils'
import { buildXlsxDocument } from './xlsx-export'
import type { Employee, Gender, OperatingRoom, Patient, Surgery, SurgeryStatus } from '../generated/prisma/client'

export interface CreateSurgeryInput {
  /** Optionnel : id généré côté client (mode hors-ligne) — création idempotente si rejoué. */
  id?: string
  patientId?: string
  patientName?: string
  patientCode?: string
  patientAge?: number
  patientGender?: Gender
  scheduledAt: string
  procedure: string
  procedureDetail?: string
  specialty?: string
  surgeonId?: string
  anesthetistId?: string
  roomId?: string
  status?: SurgeryStatus
  expectedDurationMin?: number
}

export interface UpdateSurgeryInput {
  patientId?: string | null
  surgeonId?: string | null
  anesthetistId?: string | null
  roomId?: string | null
  scheduledAt?: string
  procedure?: string
  procedureDetail?: string | null
  specialty?: string | null
  status?: SurgeryStatus
  expectedDurationMin?: number | null
  /** Dernière version connue (`updatedAt`) de la fiche, pour détecter un conflit si elle a été
   * modifiée entre-temps par quelqu'un d'autre (mode hors-ligne, voir
   * Plan-Mode-Hors-Ligne-Synchronisation.md §6.3). Absent : pas de vérification (mise à jour en
   * ligne normale, jamais hors-ligne). */
  expectedUpdatedAt?: string
}

type SurgeryWithRelations = Surgery & {
  patient: Patient | null
  surgeon: Employee | null
  anesthetist: Employee | null
  room: OperatingRoom | null
}

function doctorDisplayName(doctor: Employee | null): string | null {
  return doctor ? `Dr. ${doctor.lastName} ${doctor.firstName}.` : null
}

function formatMinutes(minutes: number | null): string | null {
  if (minutes === null) return null
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return `${hours}h ${String(rest).padStart(2, '0')}m`
}

function toDisplay(s: SurgeryWithRelations) {
  return {
    id: s.id,
    scheduledAt: s.scheduledAt.toISOString(),
    procedure: s.procedure,
    procedureDetail: s.procedureDetail,
    specialty: s.specialty,
    status: s.status,
    expectedDuration: formatMinutes(s.expectedDurationMin),
    patientId: s.patientId,
    patientName: s.patient ? `${s.patient.firstName} ${s.patient.lastName}` : s.patientName,
    patientCode: s.patient?.code ?? s.patientCode,
    age: s.patient ? computeAge(s.patient.birthDate) : s.patientAge,
    gender: s.patient?.gender ?? s.patientGender,
    surgeonId: s.surgeonId,
    surgeonName: doctorDisplayName(s.surgeon),
    anesthetistId: s.anesthetistId,
    anesthetistName: doctorDisplayName(s.anesthetist),
    roomId: s.roomId,
    roomName: s.room?.name ?? null,
    updatedAt: s.updatedAt.toISOString()
  }
}

export async function listSurgeries() {
  const prisma = getPrismaClient()
  const surgeries = await prisma.surgery.findMany({
    where: { deletedAt: null },
    include: { patient: true, surgeon: true, anesthetist: true, room: true },
    orderBy: { scheduledAt: 'asc' }
  })
  return surgeries.map(toDisplay)
}

// Rollout "Export Excel" (item 10, voir xlsx-export.ts) — réutilise listSurgeries() plutôt que
// de dupliquer la requête Prisma.
export async function exportSurgeries() {
  const surgeries = await listSurgeries()
  return buildXlsxDocument(
    'Bloc opératoire',
    'Interventions chirurgicales',
    [
      { header: 'Date planifiée', key: 'scheduledAt', width: 18 },
      { header: 'Patient', key: 'patientName', width: 24 },
      { header: 'Code patient', key: 'patientCode', width: 16 },
      { header: 'Âge', key: 'age', width: 8 },
      { header: 'Sexe', key: 'gender', width: 8 },
      { header: 'Intervention', key: 'procedure', width: 24 },
      { header: 'Spécialité', key: 'specialty', width: 18 },
      { header: 'Chirurgien', key: 'surgeonName', width: 20 },
      { header: 'Anesthésiste', key: 'anesthetistName', width: 20 },
      { header: 'Salle', key: 'roomName', width: 14 },
      { header: 'Statut', key: 'status', width: 16 },
      { header: 'Durée prévue', key: 'expectedDuration', width: 14 }
    ],
    surgeries.map((s) => ({
      ...s,
      scheduledAt: new Date(s.scheduledAt).toLocaleString('fr-FR'),
      expectedDuration: s.expectedDuration ?? ''
    }))
  )
}

export async function deleteSurgery(id: string): Promise<void> {
  const prisma = getPrismaClient()
  await prisma.surgery.update({ where: { id }, data: { deletedAt: new Date() } })
}

export async function createSurgery(input: CreateSurgeryInput) {
  const prisma = getPrismaClient()

  if (input.id) {
    const existing = await prisma.surgery.findUnique({
      where: { id: input.id },
      include: { patient: true, surgeon: true, anesthetist: true, room: true }
    })
    if (existing) return toDisplay(existing)
  }

  const surgery = await prisma.surgery.create({
    data: {
      id: input.id ?? randomUUID(),
      patientId: input.patientId,
      patientName: input.patientName,
      patientCode: input.patientCode,
      patientAge: input.patientAge,
      patientGender: input.patientGender,
      scheduledAt: new Date(input.scheduledAt),
      procedure: input.procedure,
      procedureDetail: input.procedureDetail,
      specialty: input.specialty,
      surgeonId: input.surgeonId,
      anesthetistId: input.anesthetistId,
      roomId: input.roomId,
      status: input.status ?? 'EN_ATTENTE',
      expectedDurationMin: input.expectedDurationMin
    },
    include: { patient: true, surgeon: true, anesthetist: true, room: true }
  })
  return toDisplay(surgery)
}

export async function updateSurgery(id: string, input: UpdateSurgeryInput) {
  const prisma = getPrismaClient()

  if (input.expectedUpdatedAt) {
    const current = await prisma.surgery.findUnique({
      where: { id },
      include: { patient: true, surgeon: true, anesthetist: true, room: true }
    })
    if (current && current.updatedAt.toISOString() !== input.expectedUpdatedAt) {
      throw new ConflictError(toDisplay(current))
    }
  }

  const surgery = await prisma.surgery.update({
    where: { id },
    data: {
      patientId: input.patientId === undefined ? undefined : input.patientId,
      surgeonId: input.surgeonId === undefined ? undefined : input.surgeonId,
      anesthetistId: input.anesthetistId === undefined ? undefined : input.anesthetistId,
      roomId: input.roomId === undefined ? undefined : input.roomId,
      scheduledAt: input.scheduledAt !== undefined ? new Date(input.scheduledAt) : undefined,
      procedure: input.procedure,
      procedureDetail: input.procedureDetail === undefined ? undefined : input.procedureDetail,
      specialty: input.specialty === undefined ? undefined : input.specialty,
      status: input.status,
      expectedDurationMin: input.expectedDurationMin === undefined ? undefined : input.expectedDurationMin
    },
    include: { patient: true, surgeon: true, anesthetist: true, room: true }
  })
  return toDisplay(surgery)
}
