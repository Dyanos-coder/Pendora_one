import { randomUUID } from 'crypto'
import { getPrismaClient } from '../db/client'
import { computeAge } from './date-utils'
import type { Employee, EmergencyStatus, EmergencyVisit, Gender, Patient, Severity } from '../generated/prisma/client'

export interface CreateEmergencyVisitInput {
  patientId?: string
  patientName?: string
  patientCode?: string
  patientAge?: number
  patientGender?: Gender
  arrivalTime?: string
  motive?: string
  detail?: string
  severity: Severity
  zone?: string
  doctorId?: string
  status?: EmergencyStatus
}

export interface UpdateEmergencyVisitInput {
  patientId?: string | null
  doctorId?: string | null
  arrivalTime?: string
  dischargeTime?: string | null
  motive?: string | null
  detail?: string | null
  severity?: Severity
  zone?: string | null
  status?: EmergencyStatus
  outcome?: string | null
}

type EmergencyVisitWithRelations = EmergencyVisit & { patient: Patient | null; doctor: Employee | null }

function doctorDisplayName(doctor: Employee | null): string | null {
  return doctor ? `Dr. ${doctor.lastName} ${doctor.firstName}.` : null
}

function formatDuration(from: Date, to: Date): string {
  const minutes = Math.max(0, Math.round((to.getTime() - from.getTime()) / 60000))
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`
}

function toDisplay(v: EmergencyVisitWithRelations) {
  const end = v.dischargeTime ?? new Date()
  return {
    id: v.id,
    arrivalTime: v.arrivalTime.toISOString(),
    dischargeTime: v.dischargeTime?.toISOString() ?? null,
    motive: v.motive,
    detail: v.detail,
    severity: v.severity,
    zone: v.zone,
    status: v.status,
    outcome: v.outcome,
    duration: formatDuration(v.arrivalTime, end),
    patientId: v.patientId,
    patientName: v.patient ? `${v.patient.firstName} ${v.patient.lastName}` : v.patientName,
    patientCode: v.patient?.code ?? v.patientCode,
    age: v.patient ? computeAge(v.patient.birthDate) : v.patientAge,
    gender: v.patient?.gender ?? v.patientGender,
    doctorId: v.doctorId,
    doctorName: doctorDisplayName(v.doctor)
  }
}

export async function listEmergencyVisits() {
  const prisma = getPrismaClient()
  const visits = await prisma.emergencyVisit.findMany({
    where: { deletedAt: null },
    include: { patient: true, doctor: true },
    orderBy: { arrivalTime: 'desc' }
  })
  return visits.map(toDisplay)
}

export async function deleteEmergencyVisit(id: string): Promise<void> {
  const prisma = getPrismaClient()
  await prisma.emergencyVisit.update({ where: { id }, data: { deletedAt: new Date() } })
}

export async function createEmergencyVisit(input: CreateEmergencyVisitInput) {
  const prisma = getPrismaClient()
  const visit = await prisma.emergencyVisit.create({
    data: {
      id: randomUUID(),
      patientId: input.patientId,
      patientName: input.patientName,
      patientCode: input.patientCode,
      patientAge: input.patientAge,
      patientGender: input.patientGender,
      arrivalTime: input.arrivalTime ? new Date(input.arrivalTime) : new Date(),
      motive: input.motive,
      detail: input.detail,
      severity: input.severity,
      zone: input.zone,
      doctorId: input.doctorId,
      status: input.status ?? 'EN_ATTENTE_TRIAGE'
    },
    include: { patient: true, doctor: true }
  })
  return toDisplay(visit)
}

export async function updateEmergencyVisit(id: string, input: UpdateEmergencyVisitInput) {
  const prisma = getPrismaClient()
  const visit = await prisma.emergencyVisit.update({
    where: { id },
    data: {
      patientId: input.patientId === undefined ? undefined : input.patientId,
      doctorId: input.doctorId === undefined ? undefined : input.doctorId,
      arrivalTime: input.arrivalTime !== undefined ? new Date(input.arrivalTime) : undefined,
      dischargeTime: input.dischargeTime !== undefined ? (input.dischargeTime ? new Date(input.dischargeTime) : null) : undefined,
      motive: input.motive === undefined ? undefined : input.motive,
      detail: input.detail === undefined ? undefined : input.detail,
      severity: input.severity,
      zone: input.zone === undefined ? undefined : input.zone,
      status: input.status,
      outcome: input.outcome === undefined ? undefined : input.outcome
    },
    include: { patient: true, doctor: true }
  })
  return toDisplay(visit)
}
