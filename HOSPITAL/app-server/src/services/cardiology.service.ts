import { randomUUID } from 'crypto'
import { getPrismaClient } from '../db/client'
import { ConflictError } from '../lib/conflict-error'
import { computeAge } from './date-utils'
import { buildXlsxDocument } from './xlsx-export'
import type { CardioExam, CardioPriority, CardioStatus, Employee, Gender, Patient } from '../generated/prisma/client'

export interface CreateCardioExamInput {
  /** Optionnel : id généré côté client (mode hors-ligne) — création idempotente si rejoué. */
  id?: string
  patientId?: string
  patientName?: string
  patientCode?: string
  patientAge?: number
  patientGender?: Gender
  requestedAt?: string
  examType: string
  indication?: string
  doctorId?: string
  priority?: CardioPriority
  status?: CardioStatus
  expectedDurationMin?: number
  room?: string
}

export interface UpdateCardioExamInput {
  patientId?: string | null
  doctorId?: string | null
  requestedAt?: string
  resultAt?: string | null
  examType?: string
  indication?: string | null
  priority?: CardioPriority
  status?: CardioStatus
  expectedDurationMin?: number | null
  room?: string | null
  /** Dernière version connue (`updatedAt`) de la fiche, pour détecter un conflit si elle a été
   * modifiée entre-temps par quelqu'un d'autre (mode hors-ligne, voir
   * Plan-Mode-Hors-Ligne-Synchronisation.md §6.3). Absent : pas de vérification (mise à jour en
   * ligne normale, jamais hors-ligne). */
  expectedUpdatedAt?: string
}

type CardioExamWithRelations = CardioExam & { patient: Patient | null; doctor: Employee | null }

function doctorDisplayName(doctor: Employee | null): string | null {
  return doctor ? `Dr. ${doctor.lastName} ${doctor.firstName}.` : null
}

function toDisplay(e: CardioExamWithRelations) {
  return {
    id: e.id,
    requestedAt: e.requestedAt.toISOString(),
    resultAt: e.resultAt?.toISOString() ?? null,
    examType: e.examType,
    indication: e.indication,
    room: e.room,
    status: e.status,
    priority: e.priority,
    expectedDurationMin: e.expectedDurationMin,
    patientId: e.patientId,
    patientName: e.patient ? `${e.patient.firstName} ${e.patient.lastName}` : e.patientName,
    patientCode: e.patient?.code ?? e.patientCode,
    age: e.patient ? computeAge(e.patient.birthDate) : e.patientAge,
    gender: e.patient?.gender ?? e.patientGender,
    doctorId: e.doctorId,
    doctorName: doctorDisplayName(e.doctor),
    resultFileName: e.resultFileName,
    resultMimeType: e.resultMimeType,
    resultFileSize: e.resultFileSize,
    updatedAt: e.updatedAt.toISOString()
  }
}

export interface UploadedFile {
  fileName: string
  mimeType: string
  content: Buffer
}

// Un seul fichier de résultat par examen (item 10 PETITES MODIFS), même principe qu'Imagerie.
export async function uploadCardioExamResultFile(id: string, file: UploadedFile) {
  const prisma = getPrismaClient()
  const exam = await prisma.cardioExam.update({
    where: { id },
    data: {
      resultFileName: file.fileName,
      resultMimeType: file.mimeType,
      resultFileSize: file.content.length,
      resultContent: new Uint8Array(file.content)
    },
    include: { patient: true, doctor: true }
  })
  return toDisplay(exam)
}

export async function getCardioExamResultFile(id: string) {
  const prisma = getPrismaClient()
  const exam = await prisma.cardioExam.findUnique({ where: { id } })
  if (!exam || exam.deletedAt || !exam.resultContent || !exam.resultFileName) return null
  return { filename: exam.resultFileName, contentBase64: Buffer.from(exam.resultContent).toString('base64') }
}

export async function listCardioExams() {
  const prisma = getPrismaClient()
  const exams = await prisma.cardioExam.findMany({
    where: { deletedAt: null },
    include: { patient: true, doctor: true },
    orderBy: { requestedAt: 'desc' }
  })
  return exams.map(toDisplay)
}

// Rollout "Export Excel" (item 10, voir xlsx-export.ts) — réutilise listCardioExams() plutôt que
// de dupliquer la requête Prisma.
export async function exportCardioExams() {
  const exams = await listCardioExams()
  return buildXlsxDocument(
    'Cardiologie',
    'Examens de cardiologie',
    [
      { header: 'Date demande', key: 'requestedAt', width: 18 },
      { header: 'Date résultat', key: 'resultAt', width: 18 },
      { header: 'Patient', key: 'patientName', width: 24 },
      { header: 'Code patient', key: 'patientCode', width: 16 },
      { header: 'Âge', key: 'age', width: 8 },
      { header: 'Sexe', key: 'gender', width: 8 },
      { header: "Type d'examen", key: 'examType', width: 22 },
      { header: 'Motif', key: 'indication', width: 24 },
      { header: 'Priorité', key: 'priority', width: 12 },
      { header: 'Statut', key: 'status', width: 22 },
      { header: 'Salle', key: 'room', width: 14 },
      { header: 'Médecin', key: 'doctorName', width: 20 }
    ],
    exams.map((e) => ({
      ...e,
      requestedAt: new Date(e.requestedAt).toLocaleString('fr-FR'),
      resultAt: e.resultAt ? new Date(e.resultAt).toLocaleString('fr-FR') : ''
    }))
  )
}

export async function countDistinctCardioPatients(): Promise<number> {
  const prisma = getPrismaClient()
  const [byPatientId, byName] = await Promise.all([
    prisma.cardioExam.findMany({
      where: { patientId: { not: null }, deletedAt: null },
      distinct: ['patientId'],
      select: { patientId: true }
    }),
    prisma.cardioExam.findMany({
      where: { patientId: null, deletedAt: null },
      distinct: ['patientName'],
      select: { patientName: true }
    })
  ])
  return byPatientId.length + byName.length
}

export async function deleteCardioExam(id: string): Promise<void> {
  const prisma = getPrismaClient()
  await prisma.cardioExam.update({ where: { id }, data: { deletedAt: new Date() } })
}

export async function createCardioExam(input: CreateCardioExamInput) {
  const prisma = getPrismaClient()

  if (input.id) {
    const existing = await prisma.cardioExam.findUnique({ where: { id: input.id }, include: { patient: true, doctor: true } })
    if (existing) return toDisplay(existing)
  }

  const exam = await prisma.cardioExam.create({
    data: {
      id: input.id ?? randomUUID(),
      patientId: input.patientId,
      patientName: input.patientName,
      patientCode: input.patientCode,
      patientAge: input.patientAge,
      patientGender: input.patientGender,
      requestedAt: input.requestedAt ? new Date(input.requestedAt) : new Date(),
      examType: input.examType,
      indication: input.indication,
      doctorId: input.doctorId,
      priority: input.priority ?? 'NORMALE',
      status: input.status ?? 'EN_ATTENTE',
      expectedDurationMin: input.expectedDurationMin,
      room: input.room
    },
    include: { patient: true, doctor: true }
  })
  return toDisplay(exam)
}

export async function updateCardioExam(id: string, input: UpdateCardioExamInput) {
  const prisma = getPrismaClient()

  if (input.expectedUpdatedAt) {
    const current = await prisma.cardioExam.findUnique({ where: { id }, include: { patient: true, doctor: true } })
    if (current && current.updatedAt.toISOString() !== input.expectedUpdatedAt) {
      throw new ConflictError(toDisplay(current))
    }
  }

  const exam = await prisma.cardioExam.update({
    where: { id },
    data: {
      patientId: input.patientId === undefined ? undefined : input.patientId,
      doctorId: input.doctorId === undefined ? undefined : input.doctorId,
      requestedAt: input.requestedAt !== undefined ? new Date(input.requestedAt) : undefined,
      resultAt: input.resultAt !== undefined ? (input.resultAt ? new Date(input.resultAt) : null) : undefined,
      examType: input.examType,
      indication: input.indication === undefined ? undefined : input.indication,
      priority: input.priority,
      status: input.status,
      expectedDurationMin: input.expectedDurationMin === undefined ? undefined : input.expectedDurationMin,
      room: input.room === undefined ? undefined : input.room
    },
    include: { patient: true, doctor: true }
  })
  return toDisplay(exam)
}
