import { randomUUID } from 'crypto'
import { getPrismaClient } from '../db/client'
import type { Bed, Employee, Hospitalization, HospitalizationStatus, Patient } from '../generated/prisma/client'

export interface CreateHospitalizationInput {
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
    doctorName: doctorDisplayName(h.doctor)
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

export async function deleteHospitalization(id: string): Promise<void> {
  const prisma = getPrismaClient()
  await prisma.hospitalization.update({ where: { id }, data: { deletedAt: new Date() } })
}

export async function createHospitalization(input: CreateHospitalizationInput) {
  const prisma = getPrismaClient()
  const hospitalization = await prisma.hospitalization.create({
    data: {
      id: randomUUID(),
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
  return toDisplay(hospitalization)
}

export async function updateHospitalization(id: string, input: UpdateHospitalizationInput) {
  const prisma = getPrismaClient()
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
  return toDisplay(hospitalization)
}
