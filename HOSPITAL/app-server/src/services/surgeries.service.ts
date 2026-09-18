import { randomUUID } from 'crypto'
import { getPrismaClient } from '../db/client'
import { computeAge } from './date-utils'
import type { Employee, Gender, OperatingRoom, Patient, Surgery, SurgeryStatus } from '../generated/prisma/client'

export interface CreateSurgeryInput {
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
    roomName: s.room?.name ?? null
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

export async function deleteSurgery(id: string): Promise<void> {
  const prisma = getPrismaClient()
  await prisma.surgery.update({ where: { id }, data: { deletedAt: new Date() } })
}

export async function createSurgery(input: CreateSurgeryInput) {
  const prisma = getPrismaClient()
  const surgery = await prisma.surgery.create({
    data: {
      id: randomUUID(),
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
