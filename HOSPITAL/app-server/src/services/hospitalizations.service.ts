import { randomUUID } from 'crypto'
import { getPrismaClient } from '../db/client'
import { ConflictError } from '../lib/conflict-error'
import { ensurePicklistValue, PICKLIST_KEYS } from './picklist.service'
import { buildXlsxDocument } from './xlsx-export'
import type { Bed, Employee, Hospitalization, HospitalizationStatus, Patient } from '../generated/prisma/client'

export interface CreateHospitalizationInput {
  /** Optionnel : id généré côté client (mode hors-ligne) — création idempotente si rejoué. */
  id?: string
  patientId?: string
  patientName?: string
  patientCode?: string
  bedId?: string
  doctorId?: string
  admissionDate: string
  service?: string
  motive?: string
  status?: HospitalizationStatus
}

export interface UpdateHospitalizationInput {
  patientId?: string | null
  doctorId?: string | null
  bedId?: string | null
  admissionDate?: string
  dischargeDate?: string | null
  service?: string | null
  motive?: string | null
  status?: HospitalizationStatus
  /** Dernière version connue (`updatedAt`) du poste qui modifie, pour détecter un conflit si la
   * fiche a été modifiée entre-temps par quelqu'un d'autre (mode hors-ligne, voir
   * Plan-Mode-Hors-Ligne-Synchronisation.md §6.3). Absent : pas de vérification (mise à jour en
   * ligne normale, jamais hors-ligne). */
  expectedUpdatedAt?: string
}

type HospitalizationWithRelations = Hospitalization & { patient: Patient | null; doctor: Employee | null; bed: Bed | null }

function doctorDisplayName(doctor: Employee | null): string | null {
  return doctor ? `Dr. ${doctor.lastName} ${doctor.firstName}.` : null
}

function formatDuration(from: Date, to: Date): string {
  const hours = Math.max(0, Math.round((to.getTime() - from.getTime()) / 3600000))
  if (hours < 24) return `${hours} h`
  const days = Math.round(hours / 24)
  return `${days} jour${days > 1 ? 's' : ''}`
}

function toDisplay(h: HospitalizationWithRelations) {
  const end = h.dischargeDate ?? new Date()
  return {
    id: h.id,
    admissionDate: h.admissionDate.toISOString(),
    dischargeDate: h.dischargeDate?.toISOString() ?? null,
    service: h.service,
    motive: h.motive,
    status: h.status,
    stayDuration: formatDuration(h.admissionDate, end),
    patientId: h.patientId,
    patientName: h.patient ? `${h.patient.firstName} ${h.patient.lastName}` : h.patientName,
    patientCode: h.patient?.code ?? h.patientCode,
    room: h.bed?.room ?? null,
    bed: h.bed?.label ?? null,
    bedId: h.bedId,
    doctorId: h.doctorId,
    doctorName: doctorDisplayName(h.doctor),
    updatedAt: h.updatedAt.toISOString()
  }
}

export async function listHospitalizations() {
  const prisma = getPrismaClient()
  const hospitalizations = await prisma.hospitalization.findMany({
    where: { deletedAt: null },
    include: { patient: true, doctor: true, bed: true },
    orderBy: { admissionDate: 'desc' }
  })
  return hospitalizations.map(toDisplay)
}

// Rollout "Export Excel" (item 10, voir xlsx-export.ts) — réutilise listHospitalizations() plutôt
// que de dupliquer la requête Prisma.
export async function exportHospitalizations() {
  const hospitalizations = await listHospitalizations()
  return buildXlsxDocument(
    'Hospitalisation',
    'Hospitalisations',
    [
      { header: 'Patient', key: 'patientName', width: 22 },
      { header: 'Code patient', key: 'patientCode', width: 14 },
      { header: 'Date d’admission', key: 'admissionDate', width: 18 },
      { header: 'Date de sortie', key: 'dischargeDate', width: 18 },
      { header: 'Service', key: 'service', width: 18 },
      { header: 'Chambre', key: 'room', width: 12 },
      { header: 'Lit', key: 'bed', width: 10 },
      { header: 'Médecin responsable', key: 'doctorName', width: 22 },
      { header: 'Motif', key: 'motive', width: 24 },
      { header: 'Statut', key: 'status', width: 14 },
      { header: 'Durée du séjour', key: 'stayDuration', width: 16 }
    ],
    hospitalizations.map((h) => ({
      ...h,
      admissionDate: new Date(h.admissionDate).toLocaleString('fr-FR'),
      dischargeDate: h.dischargeDate ? new Date(h.dischargeDate).toLocaleString('fr-FR') : ''
    }))
  )
}

export async function deleteHospitalization(id: string): Promise<void> {
  const prisma = getPrismaClient()
  await prisma.hospitalization.update({ where: { id }, data: { deletedAt: new Date() } })
}

export async function createHospitalization(input: CreateHospitalizationInput) {
  const prisma = getPrismaClient()

  if (input.id) {
    const existing = await prisma.hospitalization.findUnique({ where: { id: input.id }, include: { patient: true, doctor: true, bed: true } })
    if (existing) return toDisplay(existing)
  }

  const hospitalization = await prisma.hospitalization.create({
    data: {
      id: input.id ?? randomUUID(),
      patientId: input.patientId,
      patientName: input.patientName,
      patientCode: input.patientCode,
      bedId: input.bedId,
      doctorId: input.doctorId,
      admissionDate: new Date(input.admissionDate),
      service: input.service,
      motive: input.motive,
      status: input.status ?? 'EN_ATTENTE'
    },
    include: { patient: true, doctor: true, bed: true }
  })
  await ensurePicklistValue(PICKLIST_KEYS.HOSPITALIZATION_SERVICE, input.service)
  return toDisplay(hospitalization)
}

export async function updateHospitalization(id: string, input: UpdateHospitalizationInput) {
  const prisma = getPrismaClient()

  if (input.expectedUpdatedAt) {
    const current = await prisma.hospitalization.findUnique({ where: { id }, include: { patient: true, doctor: true, bed: true } })
    if (current && current.updatedAt.toISOString() !== input.expectedUpdatedAt) {
      throw new ConflictError(toDisplay(current))
    }
  }

  const hospitalization = await prisma.hospitalization.update({
    where: { id },
    data: {
      patientId: input.patientId === undefined ? undefined : input.patientId,
      doctorId: input.doctorId === undefined ? undefined : input.doctorId,
      bedId: input.bedId === undefined ? undefined : input.bedId,
      admissionDate: input.admissionDate !== undefined ? new Date(input.admissionDate) : undefined,
      dischargeDate: input.dischargeDate !== undefined ? (input.dischargeDate ? new Date(input.dischargeDate) : null) : undefined,
      service: input.service === undefined ? undefined : input.service,
      motive: input.motive === undefined ? undefined : input.motive,
      status: input.status
    },
    include: { patient: true, doctor: true, bed: true }
  })
  await ensurePicklistValue(PICKLIST_KEYS.HOSPITALIZATION_SERVICE, input.service)
  return toDisplay(hospitalization)
}
