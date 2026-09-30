import { getPrismaClient } from '../db/client'
import type {
  AdmissionType,
  CreatePatientInput,
  Gender,
  PatientDetail,
  PatientStatus,
  PatientSummary,
  UpdatePatientInput
} from '../../shared/patient-types'
import type { Patient as LocalPatientRow } from '../../generated/prisma/client'

// Mode hors-ligne — Phase 1 : Patients (voir Plan-Mode-Hors-Ligne-Synchronisation.md). Miroir
// local volontairement limité aux champs de liste/création/modification (§ note du schéma local).

/** Même logique que app-server/src/services/date-utils.ts::computeAge — dupliquée ici car il n'y
 * a pas de package partagé entre app-core et app-server, cette fonction est petite et stable. */
function computeAge(birthDate: Date): number {
  const now = new Date()
  let age = now.getFullYear() - birthDate.getFullYear()
  const hasHadBirthdayThisYear =
    now.getMonth() > birthDate.getMonth() || (now.getMonth() === birthDate.getMonth() && now.getDate() >= birthDate.getDate())
  if (!hasHadBirthdayThisYear) age -= 1
  return age
}

function toSummary(row: LocalPatientRow): PatientSummary {
  return {
    id: row.id,
    code: row.code,
    firstName: row.firstName,
    lastName: row.lastName,
    age: computeAge(row.birthDate),
    gender: row.gender as Gender,
    status: row.status as PatientStatus,
    service: row.service,
    insuranceProvider: row.insuranceProvider,
    lastVisit: null
  }
}

// `medicalHistory`/`familyHistory`/`lifestyle` ne sont pas mirorés localement (non nécessaires à
// la liste ni à la création/modification hors-ligne) : toujours vides sur un PatientDetail
// reconstruit depuis le miroir local, contrairement à celui renvoyé par le serveur.
function toDetail(row: LocalPatientRow): PatientDetail {
  let score = 40
  if (row.bloodType) score += 10
  if (row.allergies) score += 10
  if (row.insuranceNumber) score += 10
  if (row.emergencyContactName) score += 10

  return {
    ...toSummary(row),
    birthDate: row.birthDate.toISOString(),
    phone: row.phone,
    email: row.email,
    bloodType: row.bloodType,
    allergies: row.allergies,
    admissionType: row.admissionType as AdmissionType,
    insuranceNumber: row.insuranceNumber,
    insuranceExpiry: row.insuranceExpiry?.toISOString() ?? null,
    emergencyContact: { name: row.emergencyContactName, phone: row.emergencyContactPhone },
    medicalHistory: [],
    familyHistory: [],
    lifestyle: [],
    recordCompleteness: Math.min(score, 100),
    updatedAt: row.updatedAt.toISOString()
  }
}

/** Version serveur connue (`serverUpdatedAt`) de la fiche, si déjà synchronisée — `undefined` si
 * la fiche n'a jamais été confirmée par le serveur (création encore PENDING) ou n'existe pas
 * localement, auquel cas aucune vérification de conflit n'est possible ni nécessaire (voir
 * Plan-Mode-Hors-Ligne-Synchronisation.md §6.3). */
export async function getLocalPatientServerUpdatedAt(id: string): Promise<string | undefined> {
  const prisma = getPrismaClient()
  const row = await prisma.patient.findUnique({ where: { id } })
  return row?.serverUpdatedAt ? row.serverUpdatedAt.toISOString() : undefined
}

export async function listLocalPatients(): Promise<PatientSummary[]> {
  const prisma = getPrismaClient()
  const rows = await prisma.patient.findMany({ where: { deletedAt: null }, orderBy: { lastName: 'asc' } })
  return rows.map(toSummary)
}

export async function getLocalPatient(id: string): Promise<PatientDetail | null> {
  const prisma = getPrismaClient()
  const row = await prisma.patient.findUnique({ where: { id } })
  return row && !row.deletedAt ? toDetail(row) : null
}

/** Écrit une nouvelle fiche patient en local avec un code provisoire (§5 du plan, option A) —
 * remplacé par le vrai code du serveur dès que la création est synchronisée. */
export async function createLocalPatient(id: string, input: CreatePatientInput): Promise<PatientDetail> {
  const prisma = getPrismaClient()
  const provisionalCode = `P-LOCAL-${id.slice(0, 4).toUpperCase()}`
  const row = await prisma.patient.create({
    data: {
      id,
      code: provisionalCode,
      firstName: input.firstName,
      lastName: input.lastName,
      gender: input.gender,
      birthDate: new Date(input.birthDate),
      phone: input.phone,
      email: input.email,
      bloodType: input.bloodType,
      allergies: input.allergies,
      admissionType: input.admissionType ?? 'NON_ADMIS',
      status: 'ACTIVE',
      service: input.service,
      insuranceProvider: input.insuranceProvider,
      insuranceNumber: input.insuranceNumber,
      insuranceExpiry: input.insuranceExpiry ? new Date(input.insuranceExpiry) : undefined,
      emergencyContactName: input.emergencyContactName,
      emergencyContactPhone: input.emergencyContactPhone,
      syncStatus: 'PENDING'
    }
  })
  return toDetail(row)
}

export async function updateLocalPatient(id: string, input: UpdatePatientInput): Promise<PatientDetail> {
  const prisma = getPrismaClient()
  const row = await prisma.patient.update({
    where: { id },
    data: {
      firstName: input.firstName,
      lastName: input.lastName,
      gender: input.gender,
      birthDate: input.birthDate !== undefined ? new Date(input.birthDate) : undefined,
      phone: input.phone === undefined ? undefined : input.phone,
      email: input.email === undefined ? undefined : input.email,
      bloodType: input.bloodType === undefined ? undefined : input.bloodType,
      allergies: input.allergies === undefined ? undefined : input.allergies,
      admissionType: input.admissionType,
      status: input.status,
      service: input.service === undefined ? undefined : input.service,
      insuranceProvider: input.insuranceProvider === undefined ? undefined : input.insuranceProvider,
      insuranceNumber: input.insuranceNumber === undefined ? undefined : input.insuranceNumber,
      insuranceExpiry: input.insuranceExpiry !== undefined ? (input.insuranceExpiry ? new Date(input.insuranceExpiry) : null) : undefined,
      emergencyContactName: input.emergencyContactName === undefined ? undefined : input.emergencyContactName,
      emergencyContactPhone: input.emergencyContactPhone === undefined ? undefined : input.emergencyContactPhone,
      syncStatus: 'PENDING'
    }
  })
  return toDetail(row)
}

export async function softDeleteLocalPatient(id: string): Promise<void> {
  const prisma = getPrismaClient()
  await prisma.patient.update({ where: { id }, data: { deletedAt: new Date(), syncStatus: 'PENDING' } })
}

/** Écrit/actualise le miroir local avec la version qui fait autorité (réponse serveur, à la
 * création, la modification ou la synchro descendante) — passe `syncStatus` à SYNCED et remplace
 * un éventuel code provisoire par le vrai code serveur. */
export async function upsertSyncedPatient(patient: PatientDetail): Promise<void> {
  const prisma = getPrismaClient()
  const data = {
    code: patient.code,
    firstName: patient.firstName,
    lastName: patient.lastName,
    gender: patient.gender,
    birthDate: new Date(patient.birthDate),
    phone: patient.phone,
    email: patient.email,
    bloodType: patient.bloodType,
    allergies: patient.allergies,
    admissionType: patient.admissionType,
    status: patient.status,
    service: patient.service,
    insuranceProvider: patient.insuranceProvider,
    insuranceNumber: patient.insuranceNumber,
    insuranceExpiry: patient.insuranceExpiry ? new Date(patient.insuranceExpiry) : null,
    emergencyContactName: patient.emergencyContact.name,
    emergencyContactPhone: patient.emergencyContact.phone,
    serverUpdatedAt: new Date(patient.updatedAt),
    syncStatus: 'SYNCED',
    deletedAt: null
  }
  await prisma.patient.upsert({
    where: { id: patient.id },
    update: data,
    create: { id: patient.id, ...data }
  })
}

/** Synchro descendante légère (§6.2 du plan) à partir d'une liste résumée (`GET /patients`) —
 * ne touche pas aux champs détaillés (phone/email/...) absents du résumé pour ne pas les écraser
 * avec `null` : `updateMany` cible uniquement les champs réellement fournis par le résumé. */
export async function syncDownSummaries(patients: PatientSummary[]): Promise<void> {
  const prisma = getPrismaClient()
  for (const p of patients) {
    await prisma.patient.upsert({
      where: { id: p.id },
      update: {
        code: p.code,
        firstName: p.firstName,
        lastName: p.lastName,
        gender: p.gender,
        status: p.status,
        service: p.service,
        insuranceProvider: p.insuranceProvider,
        syncStatus: 'SYNCED',
        deletedAt: null
      },
      create: {
        id: p.id,
        code: p.code,
        firstName: p.firstName,
        lastName: p.lastName,
        gender: p.gender,
        // birthDate n'est pas dans le résumé — placeholder, remplacé dès qu'un create/update/get
        // renvoie le détail complet pour ce patient.
        birthDate: new Date(0),
        status: p.status,
        service: p.service,
        insuranceProvider: p.insuranceProvider,
        syncStatus: 'SYNCED'
      }
    })
  }
}
