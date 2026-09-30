import { randomUUID } from 'crypto'
import { getPrismaClient } from '../db/client'
import { ConflictError } from '../lib/conflict-error'
import { nextCode } from './counter.service'
import { computeAge } from './date-utils'
import { buildXlsxDocument } from './xlsx-export'
import type { Consultation, ConsultationStatus, Employee, Gender, Patient } from '../generated/prisma/client'

export interface CreateConsultationInput {
  /** Optionnel : id généré côté client (mode hors-ligne, voir
   * Plan-Mode-Hors-Ligne-Synchronisation.md §4) — création idempotente si rejoué. */
  id?: string
  patientId?: string
  patientName?: string
  patientCode?: string
  patientAge?: number
  patientGender?: Gender
  doctorId?: string
  date: string
  service?: string
  motive?: string
  status?: ConsultationStatus
}

export interface UpdateConsultationInput {
  patientId?: string | null
  doctorId?: string | null
  date?: string
  service?: string | null
  motive?: string | null
  status?: ConsultationStatus
  /** Dernière version connue (`updatedAt`) du poste qui modifie, pour détecter un conflit si la
   * fiche a été modifiée entre-temps par quelqu'un d'autre (mode hors-ligne, voir
   * Plan-Mode-Hors-Ligne-Synchronisation.md §6.3). Absent : pas de vérification (mise à jour en
   * ligne normale, jamais hors-ligne). */
  expectedUpdatedAt?: string
}

type ConsultationWithRelations = Consultation & { patient: Patient | null; doctor: Employee | null }

function doctorDisplayName(doctor: Employee | null): string | null {
  return doctor ? `Dr. ${doctor.lastName} ${doctor.firstName}.` : null
}

function toDisplay(c: ConsultationWithRelations) {
  return {
    id: c.id,
    dossier: c.dossier,
    date: c.date.toISOString(),
    service: c.service,
    motive: c.motive,
    status: c.status,
    patientId: c.patientId,
    patientName: c.patient ? `${c.patient.firstName} ${c.patient.lastName}` : c.patientName,
    patientCode: c.patient?.code ?? c.patientCode,
    age: c.patient ? computeAge(c.patient.birthDate) : c.patientAge,
    gender: c.patient?.gender ?? c.patientGender,
    doctorId: c.doctorId,
    doctorName: doctorDisplayName(c.doctor),
    documentFileName: c.documentFileName,
    documentMimeType: c.documentMimeType,
    documentFileSize: c.documentFileSize,
    updatedAt: c.updatedAt.toISOString()
  }
}

/** Mappe le statut d'une consultation vers celui du rendez-vous miroir (item 1 PETITES MODIFS —
 * une consultation EST aussi un rendez-vous, voir createConsultation/updateConsultation). */
function toAppointmentStatus(status: ConsultationStatus): 'CONFIRME' | 'EN_ATTENTE' | 'ANNULE' | 'TERMINE' {
  if (status === 'TERMINEE') return 'TERMINE'
  if (status === 'ANNULEE') return 'ANNULE'
  if (status === 'EN_COURS') return 'CONFIRME'
  return 'EN_ATTENTE'
}

export async function listConsultations() {
  const prisma = getPrismaClient()
  const consultations = await prisma.consultation.findMany({
    where: { deletedAt: null },
    include: { patient: true, doctor: true },
    orderBy: { date: 'asc' }
  })
  return consultations.map(toDisplay)
}

// Rollout "Export Excel" (item 10, voir xlsx-export.ts) — réutilise listConsultations() plutôt
// que de dupliquer la requête Prisma.
export async function exportConsultations() {
  const consultations = await listConsultations()
  return buildXlsxDocument(
    'Consultations',
    'Consultations',
    [
      { header: 'Dossier', key: 'dossier', width: 16 },
      { header: 'Date', key: 'date', width: 18 },
      { header: 'Patient', key: 'patientName', width: 24 },
      { header: 'Code patient', key: 'patientCode', width: 16 },
      { header: 'Âge', key: 'age', width: 8 },
      { header: 'Sexe', key: 'gender', width: 8 },
      { header: 'Service', key: 'service', width: 18 },
      { header: 'Motif', key: 'motive', width: 24 },
      { header: 'Statut', key: 'status', width: 18 },
      { header: 'Médecin', key: 'doctorName', width: 20 }
    ],
    consultations.map((c) => ({
      ...c,
      date: new Date(c.date).toLocaleString('fr-FR')
    }))
  )
}

/** Dernières consultations d'un patient — utilisé par le dossier patient agrégé (item 8, voir
 * patients.service.ts::getPatientDossier). */
export async function listConsultationsByPatient(patientId: string) {
  const prisma = getPrismaClient()
  const consultations = await prisma.consultation.findMany({
    where: { patientId, deletedAt: null },
    include: { patient: true, doctor: true },
    orderBy: { date: 'desc' },
    take: 10
  })
  return consultations.map(toDisplay)
}

export async function deleteConsultation(id: string): Promise<void> {
  const prisma = getPrismaClient()
  await prisma.consultation.update({ where: { id }, data: { deletedAt: new Date() } })
  // Le rendez-vous miroir (item 1) n'a plus lieu d'être une fois la consultation supprimée.
  await prisma.appointment.updateMany({ where: { consultationId: id }, data: { deletedAt: new Date() } })
}

export async function createConsultation(input: CreateConsultationInput) {
  const prisma = getPrismaClient()

  if (input.id) {
    const existing = await prisma.consultation.findUnique({ where: { id: input.id }, include: { patient: true, doctor: true } })
    if (existing) return toDisplay(existing)
  }

  const dossier = await nextCode('CONSULTATION', 'DOS', 6)
  const date = new Date(input.date)
  const status = input.status ?? 'EN_ATTENTE'

  const consultation = await prisma.consultation.create({
    data: {
      id: input.id ?? randomUUID(),
      dossier,
      patientId: input.patientId,
      patientName: input.patientName,
      patientCode: input.patientCode,
      patientAge: input.patientAge,
      patientGender: input.patientGender,
      doctorId: input.doctorId,
      date,
      service: input.service,
      motive: input.motive,
      status
    },
    include: { patient: true, doctor: true }
  })

  // Une consultation EST aussi un rendez-vous (item 1 PETITES MODIFS) : créé ici plutôt que côté
  // client, pour que ça reste vrai quel que soit l'écran d'origine (formulaire dédié, synchro
  // hors-ligne...). `consultationId` unique évite un doublon si cette création est rejouée.
  await prisma.appointment.create({
    data: {
      id: randomUUID(),
      consultationId: consultation.id,
      patientId: input.patientId,
      patientName: input.patientName,
      patientAge: input.patientAge,
      doctorId: input.doctorId,
      date,
      service: input.service,
      type: 'CONSULTATION',
      motive: input.motive,
      status: toAppointmentStatus(status)
    }
  })

  return toDisplay(consultation)
}

export async function updateConsultation(id: string, input: UpdateConsultationInput) {
  const prisma = getPrismaClient()

  if (input.expectedUpdatedAt) {
    const current = await prisma.consultation.findUnique({ where: { id }, include: { patient: true, doctor: true } })
    if (current && current.updatedAt.toISOString() !== input.expectedUpdatedAt) {
      throw new ConflictError(toDisplay(current))
    }
  }

  const consultation = await prisma.consultation.update({
    where: { id },
    data: {
      patientId: input.patientId === undefined ? undefined : input.patientId,
      doctorId: input.doctorId === undefined ? undefined : input.doctorId,
      date: input.date !== undefined ? new Date(input.date) : undefined,
      service: input.service === undefined ? undefined : input.service,
      motive: input.motive === undefined ? undefined : input.motive,
      status: input.status
    },
    include: { patient: true, doctor: true }
  })

  // Garde le rendez-vous miroir synchronisé (item 1) — no-op si cette consultation a été créée
  // avant l'introduction de ce lien (`consultationId` alors absent côté rendez-vous).
  await prisma.appointment.updateMany({
    where: { consultationId: id },
    data: {
      patientId: input.patientId === undefined ? undefined : input.patientId,
      doctorId: input.doctorId === undefined ? undefined : input.doctorId,
      date: input.date !== undefined ? new Date(input.date) : undefined,
      service: input.service === undefined ? undefined : input.service,
      motive: input.motive === undefined ? undefined : input.motive,
      status: input.status !== undefined ? toAppointmentStatus(input.status) : undefined
    }
  })

  return toDisplay(consultation)
}

export interface UploadedFile {
  fileName: string
  mimeType: string
  content: Buffer
}

// Un seul document par consultation (item 1 PETITES MODIFS) — regroupe diagnostic/infos de la
// consultation, même mécanisme BLOB que PatientDocument/les résultats d'Imagerie et Cardiologie.
export async function uploadConsultationDocument(id: string, file: UploadedFile) {
  const prisma = getPrismaClient()
  const consultation = await prisma.consultation.update({
    where: { id },
    data: {
      documentFileName: file.fileName,
      documentMimeType: file.mimeType,
      documentFileSize: file.content.length,
      documentContent: new Uint8Array(file.content)
    },
    include: { patient: true, doctor: true }
  })
  return toDisplay(consultation)
}

export async function getConsultationDocument(id: string) {
  const prisma = getPrismaClient()
  const consultation = await prisma.consultation.findUnique({ where: { id } })
  if (!consultation || consultation.deletedAt || !consultation.documentContent || !consultation.documentFileName) return null
  return { filename: consultation.documentFileName, contentBase64: Buffer.from(consultation.documentContent).toString('base64') }
}
