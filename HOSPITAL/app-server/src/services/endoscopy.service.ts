import { randomUUID } from 'crypto'
import { getPrismaClient } from '../db/client'
import { ConflictError } from '../lib/conflict-error'
import { computeAge } from './date-utils'
import type { Employee, EndoscopyPriority, EndoscopyProcedure, EndoscopyStatus, Gender, Patient } from '../generated/prisma/client'

export interface CreateEndoscopyProcedureInput {
  /** Optionnel : id généré côté client (mode hors-ligne) — création idempotente si rejoué. */
  id?: string
  patientId?: string
  patientName?: string
  patientCode?: string
  patientAge?: number
  patientGender?: Gender
  requestedAt?: string
  procedureType: string
  indication?: string
  service?: string
  endoscopistId?: string
  priority?: EndoscopyPriority
  status?: EndoscopyStatus
  expectedDurationMin?: number
  room?: string
}

export interface UpdateEndoscopyProcedureInput {
  patientId?: string | null
  endoscopistId?: string | null
  requestedAt?: string
  resultAt?: string | null
  procedureType?: string
  indication?: string | null
  service?: string | null
  priority?: EndoscopyPriority
  status?: EndoscopyStatus
  expectedDurationMin?: number | null
  room?: string | null
  /** Dernière version connue (`updatedAt`) du poste qui modifie, pour détecter un conflit si la
   * fiche a été modifiée entre-temps par quelqu'un d'autre (mode hors-ligne, voir
   * Plan-Mode-Hors-Ligne-Synchronisation.md §6.3). Absent : pas de vérification (mise à jour en
   * ligne normale, jamais hors-ligne). */
  expectedUpdatedAt?: string
}

type EndoscopyProcedureWithRelations = EndoscopyProcedure & { patient: Patient | null; endoscopist: Employee | null }

function doctorDisplayName(doctor: Employee | null): string | null {
  return doctor ? `Dr. ${doctor.lastName} ${doctor.firstName}.` : null
}

function toDisplay(p: EndoscopyProcedureWithRelations) {
  return {
    id: p.id,
    requestedAt: p.requestedAt.toISOString(),
    resultAt: p.resultAt?.toISOString() ?? null,
    procedureType: p.procedureType,
    indication: p.indication,
    service: p.service,
    room: p.room,
    status: p.status,
    priority: p.priority,
    expectedDurationMin: p.expectedDurationMin,
    patientId: p.patientId,
    patientName: p.patient ? `${p.patient.firstName} ${p.patient.lastName}` : p.patientName,
    patientCode: p.patient?.code ?? p.patientCode,
    age: p.patient ? computeAge(p.patient.birthDate) : p.patientAge,
    gender: p.patient?.gender ?? p.patientGender,
    endoscopistId: p.endoscopistId,
    endoscopistName: doctorDisplayName(p.endoscopist),
    resultFileName: p.resultFileName,
    resultMimeType: p.resultMimeType,
    resultFileSize: p.resultFileSize,
    updatedAt: p.updatedAt.toISOString()
  }
}

export interface UploadedFile {
  fileName: string
  mimeType: string
  content: Buffer
}

export async function uploadEndoscopyResultFile(id: string, file: UploadedFile) {
  const prisma = getPrismaClient()
  const procedure = await prisma.endoscopyProcedure.update({
    where: { id },
    data: {
      resultFileName: file.fileName,
      resultMimeType: file.mimeType,
      resultFileSize: file.content.length,
      resultContent: new Uint8Array(file.content)
    },
    include: { patient: true, endoscopist: true }
  })
  return toDisplay(procedure)
}

export async function getEndoscopyResultFile(id: string) {
  const prisma = getPrismaClient()
  const procedure = await prisma.endoscopyProcedure.findUnique({ where: { id } })
  if (!procedure || procedure.deletedAt || !procedure.resultContent || !procedure.resultFileName) return null
  return { filename: procedure.resultFileName, contentBase64: Buffer.from(procedure.resultContent).toString('base64') }
}

export async function listEndoscopyProcedures() {
  const prisma = getPrismaClient()
  const procedures = await prisma.endoscopyProcedure.findMany({
    where: { deletedAt: null },
    include: { patient: true, endoscopist: true },
    orderBy: { requestedAt: 'desc' }
  })
  return procedures.map(toDisplay)
}

export async function countDistinctEndoscopyPatients(): Promise<number> {
  const prisma = getPrismaClient()
  const [byPatientId, byName] = await Promise.all([
    prisma.endoscopyProcedure.findMany({
      where: { patientId: { not: null }, deletedAt: null },
      distinct: ['patientId'],
      select: { patientId: true }
    }),
    prisma.endoscopyProcedure.findMany({
      where: { patientId: null, deletedAt: null },
      distinct: ['patientName'],
      select: { patientName: true }
    })
  ])
  return byPatientId.length + byName.length
}

export async function deleteEndoscopyProcedure(id: string): Promise<void> {
  const prisma = getPrismaClient()
  await prisma.endoscopyProcedure.update({ where: { id }, data: { deletedAt: new Date() } })
}

export async function createEndoscopyProcedure(input: CreateEndoscopyProcedureInput) {
  const prisma = getPrismaClient()

  if (input.id) {
    const existing = await prisma.endoscopyProcedure.findUnique({ where: { id: input.id }, include: { patient: true, endoscopist: true } })
    if (existing) return toDisplay(existing)
  }

  const procedure = await prisma.endoscopyProcedure.create({
    data: {
      id: input.id ?? randomUUID(),
      patientId: input.patientId,
      patientName: input.patientName,
      patientCode: input.patientCode,
      patientAge: input.patientAge,
      patientGender: input.patientGender,
      requestedAt: input.requestedAt ? new Date(input.requestedAt) : new Date(),
      procedureType: input.procedureType,
      indication: input.indication,
      service: input.service,
      endoscopistId: input.endoscopistId,
      priority: input.priority ?? 'NORMALE',
      status: input.status ?? 'EN_ATTENTE',
      expectedDurationMin: input.expectedDurationMin,
      room: input.room
    },
    include: { patient: true, endoscopist: true }
  })
  return toDisplay(procedure)
}

export async function updateEndoscopyProcedure(id: string, input: UpdateEndoscopyProcedureInput) {
  const prisma = getPrismaClient()

  if (input.expectedUpdatedAt) {
    const current = await prisma.endoscopyProcedure.findUnique({ where: { id }, include: { patient: true, endoscopist: true } })
    if (current && current.updatedAt.toISOString() !== input.expectedUpdatedAt) {
      throw new ConflictError(toDisplay(current))
    }
  }

  const procedure = await prisma.endoscopyProcedure.update({
    where: { id },
    data: {
      patientId: input.patientId === undefined ? undefined : input.patientId,
      endoscopistId: input.endoscopistId === undefined ? undefined : input.endoscopistId,
      requestedAt: input.requestedAt !== undefined ? new Date(input.requestedAt) : undefined,
      resultAt: input.resultAt !== undefined ? (input.resultAt ? new Date(input.resultAt) : null) : undefined,
      procedureType: input.procedureType,
      indication: input.indication === undefined ? undefined : input.indication,
      service: input.service === undefined ? undefined : input.service,
      priority: input.priority,
      status: input.status,
      expectedDurationMin: input.expectedDurationMin === undefined ? undefined : input.expectedDurationMin,
      room: input.room === undefined ? undefined : input.room
    },
    include: { patient: true, endoscopist: true }
  })
  return toDisplay(procedure)
}
