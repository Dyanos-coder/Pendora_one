import { randomUUID } from 'crypto'
import { getPrismaClient } from '../db/client'
import { ConflictError } from '../lib/conflict-error'
import { nextCode } from './counter.service'
import { computeAge } from './date-utils'
import { listConsultationsByPatient } from './consultations.service'
import { listUpcomingAppointmentsByPatient } from './appointments.service'
import { refreshPatientAdmission } from './patient-admission.service'
import { createPdfBuffer, drawEmptyNote, drawHeaderBand, drawInfoCard, drawSectionTitle, drawTable } from './pdf-layout'
import type {
  Gender,
  AdmissionType,
  PatientStatus,
  Patient,
  Vitals,
  Prescription,
  LabRequest,
  ImagingRequest,
  CardioExam,
  PathologyRequest,
  EndoscopyProcedure,
  EmergencyVisit,
  Hospitalization,
  Surgery
} from '../generated/prisma/client'

export interface CreatePatientInput {
  /** Optionnel : id généré côté client (mode hors-ligne, voir Plan-Mode-Hors-Ligne-Synchronisation.md
   * §4). Permet une création idempotente — si un patient avec cet id existe déjà (rejeu d'une
   * synchro après une confirmation perdue), on renvoie l'existant plutôt que d'en créer un second. */
  id?: string
  firstName: string
  lastName: string
  gender: Gender
  birthDate: string
  phone?: string
  email?: string
  bloodType?: string
  allergies?: string
  admissionType?: AdmissionType
  service?: string
  insuranceProvider?: string
  insuranceNumber?: string
  insuranceExpiry?: string
  emergencyContactName?: string
  emergencyContactPhone?: string
  medicalHistory?: string[]
  familyHistory?: string[]
  lifestyle?: string[]
}

export interface UpdatePatientInput {
  firstName?: string
  lastName?: string
  gender?: Gender
  birthDate?: string
  phone?: string | null
  email?: string | null
  bloodType?: string | null
  allergies?: string | null
  admissionType?: AdmissionType
  status?: PatientStatus
  service?: string | null
  insuranceProvider?: string | null
  insuranceNumber?: string | null
  insuranceExpiry?: string | null
  emergencyContactName?: string | null
  emergencyContactPhone?: string | null
  /** Dernière version connue (`updatedAt`) du poste qui modifie, pour détecter un conflit si la
   * fiche a été modifiée entre-temps par quelqu'un d'autre (mode hors-ligne, voir
   * Plan-Mode-Hors-Ligne-Synchronisation.md §6.3). Absent : pas de vérification (mise à jour en
   * ligne normale, jamais hors-ligne). */
  expectedUpdatedAt?: string
}

function computeRecordCompleteness(patient: Patient): number {
  let score = 40
  if (patient.bloodType) score += 10
  if (patient.allergies) score += 10
  if (patient.insuranceNumber) score += 10
  if (patient.emergencyContactName) score += 10
  if (Array.isArray(patient.medicalHistory) && patient.medicalHistory.length > 0) score += 10
  if (Array.isArray(patient.familyHistory) && patient.familyHistory.length > 0) score += 10
  return Math.min(score, 100)
}

function toSummary(patient: Patient) {
  return {
    id: patient.id,
    code: patient.code,
    firstName: patient.firstName,
    lastName: patient.lastName,
    age: computeAge(patient.birthDate),
    gender: patient.gender,
    status: patient.status,
    service: patient.service,
    insuranceProvider: patient.insuranceProvider,
    lastVisit: null as string | null
  }
}

function toDetail(patient: Patient) {
  return {
    ...toSummary(patient),
    birthDate: patient.birthDate.toISOString(),
    phone: patient.phone,
    email: patient.email,
    bloodType: patient.bloodType,
    allergies: patient.allergies,
    admissionType: patient.admissionType,
    insuranceNumber: patient.insuranceNumber,
    insuranceExpiry: patient.insuranceExpiry?.toISOString() ?? null,
    emergencyContact: { name: patient.emergencyContactName, phone: patient.emergencyContactPhone },
    medicalHistory: (patient.medicalHistory as string[] | null) ?? [],
    familyHistory: (patient.familyHistory as string[] | null) ?? [],
    lifestyle: (patient.lifestyle as string[] | null) ?? [],
    recordCompleteness: computeRecordCompleteness(patient),
    updatedAt: patient.updatedAt.toISOString()
  }
}

export async function listPatients() {
  const prisma = getPrismaClient()
  const patients = await prisma.patient.findMany({ where: { deletedAt: null }, orderBy: { lastName: 'asc' } })
  return patients.map(toSummary)
}

export async function getPatientById(id: string) {
  const prisma = getPrismaClient()
  const patient = await prisma.patient.findUnique({ where: { id } })
  return patient && !patient.deletedAt ? toDetail(patient) : null
}

export async function deletePatient(id: string): Promise<void> {
  const prisma = getPrismaClient()
  await prisma.patient.update({ where: { id }, data: { deletedAt: new Date() } })
}

export async function createPatient(input: CreatePatientInput) {
  const prisma = getPrismaClient()

  if (input.id) {
    const existing = await prisma.patient.findUnique({ where: { id: input.id } })
    if (existing) return toDetail(existing)
  }

  const code = await nextCode('PATIENT', 'P')

  const patient = await prisma.patient.create({
    data: {
      id: input.id ?? randomUUID(),
      code,
      firstName: input.firstName,
      lastName: input.lastName,
      gender: input.gender,
      birthDate: new Date(input.birthDate),
      phone: input.phone,
      email: input.email,
      bloodType: input.bloodType,
      allergies: input.allergies,
      admissionType: manualAdmissionType(input.admissionType) ?? 'NON_ADMIS',
      status: 'ACTIVE' as PatientStatus,
      service: input.service,
      insuranceProvider: input.insuranceProvider,
      insuranceNumber: input.insuranceNumber,
      insuranceExpiry: input.insuranceExpiry ? new Date(input.insuranceExpiry) : undefined,
      emergencyContactName: input.emergencyContactName,
      emergencyContactPhone: input.emergencyContactPhone,
      medicalHistory: input.medicalHistory ?? [],
      familyHistory: input.familyHistory ?? [],
      lifestyle: input.lifestyle ?? []
    }
  })

  return toDetail(patient)
}

export async function updatePatient(id: string, input: UpdatePatientInput) {
  const prisma = getPrismaClient()

  if (input.expectedUpdatedAt) {
    const current = await prisma.patient.findUnique({ where: { id } })
    if (current && current.updatedAt.toISOString() !== input.expectedUpdatedAt) {
      throw new ConflictError(toDetail(current))
    }
  }

  const patient = await prisma.patient.update({
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
      admissionType: manualAdmissionType(input.admissionType),
      status: input.status,
      service: input.service === undefined ? undefined : input.service,
      insuranceProvider: input.insuranceProvider === undefined ? undefined : input.insuranceProvider,
      insuranceNumber: input.insuranceNumber === undefined ? undefined : input.insuranceNumber,
      insuranceExpiry: input.insuranceExpiry !== undefined ? (input.insuranceExpiry ? new Date(input.insuranceExpiry) : null) : undefined,
      emergencyContactName: input.emergencyContactName === undefined ? undefined : input.emergencyContactName,
      emergencyContactPhone: input.emergencyContactPhone === undefined ? undefined : input.emergencyContactPhone
    }
  })
  // Une hospitalisation/un passage aux urgences en cours reste prioritaire sur le choix manuel.
  if (input.admissionType !== undefined) {
    await refreshPatientAdmission(id)
    const refreshed = await prisma.patient.findUnique({ where: { id } })
    if (refreshed) return toDetail(refreshed)
  }
  return toDetail(patient)
}

/** Seuls NON_ADMIS/AMBULATOIRE se choisissent à la main : HOSPITALISE/URGENCE sont posés par les
 * pages Hospitalisation et Urgences (voir patient-admission.service.ts). */
function manualAdmissionType(value: AdmissionType | undefined): AdmissionType | undefined {
  return value === 'NON_ADMIS' || value === 'AMBULATOIRE' ? value : undefined
}

// --- Dossier patient agrégé (item 8) ------------------------------------------------------
// Consultations et RDV à venir réutilisent le toDisplay() de leurs domaines respectifs (mêmes
// deux relations patient/doctor, même forme de sortie). Vitaux, ordonnances, résultats et
// chronologie sont propres au dossier patient — aucun autre écran n'en a besoin sous cette forme.

type ExamDomain = 'Laboratoire' | 'Imagerie' | 'Cardiologie' | 'Anatomopathologie' | 'Endoscopie'
interface ExamRow {
  domain: ExamDomain
  label: string
  date: Date
  status: string
}

function labToRow(r: LabRequest): ExamRow {
  return { domain: 'Laboratoire', label: r.analysisType, date: r.resultAt ?? r.requestedAt, status: r.status }
}
function imagingToRow(r: ImagingRequest): ExamRow {
  return { domain: 'Imagerie', label: r.examType, date: r.resultAt ?? r.requestedAt, status: r.status }
}
function cardioToRow(r: CardioExam): ExamRow {
  return { domain: 'Cardiologie', label: r.examType, date: r.resultAt ?? r.requestedAt, status: r.status }
}
function pathologyToRow(r: PathologyRequest): ExamRow {
  return { domain: 'Anatomopathologie', label: r.sampleType, date: r.resultAt ?? r.requestedAt, status: r.status }
}
function endoscopyToRow(r: EndoscopyProcedure): ExamRow {
  return { domain: 'Endoscopie', label: r.procedureType, date: r.resultAt ?? r.requestedAt, status: r.status }
}

// Les 5 domaines ont chacun leur propre enum de statut (LabStatus, ImagingStatus...) mais
// partagent le même vocabulaire de fait : un résultat "validé"/"réalisé", "annulé", ou tout le
// reste (en attente/en cours/programmé) — condensé ici en 3 états pour un affichage uniforme.
function examResultStatus(status: string): 'DISPONIBLE' | 'EN_ATTENTE' | 'ANNULE' {
  if (status === 'RESULTAT_VALIDE' || status === 'REALISE') return 'DISPONIBLE'
  if (status.startsWith('ANNUL')) return 'ANNULE'
  return 'EN_ATTENTE'
}

function buildResults(examRows: ExamRow[]) {
  return [...examRows]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 10)
    .map((r) => ({ label: `${r.domain} — ${r.label}`, date: r.date.toISOString(), status: examResultStatus(r.status) }))
}

type TimelineEventType = 'consultation' | 'exam' | 'emergency' | 'admission' | 'surgery'
interface TimelineRow {
  date: Date
  type: TimelineEventType
  label: string
  service: string | null
}

function vitalsToRows(v: Vitals) {
  const date = v.recordedAt.toISOString()
  const rows: { label: string; value: string; date: string }[] = []
  if (v.bloodPressure) rows.push({ label: 'Tension artérielle', value: v.bloodPressure, date })
  if (v.heartRate) rows.push({ label: 'Pouls', value: v.heartRate, date })
  if (v.temperature) rows.push({ label: 'Température', value: v.temperature, date })
  if (v.weight) rows.push({ label: 'Poids', value: v.weight, date })
  if (v.oxygenSaturation) rows.push({ label: 'Saturation O2', value: v.oxygenSaturation, date })
  if (v.documentFileName) rows.push({ label: 'Document', value: v.documentFileName, date })
  return rows
}

function prescriptionToDisplay(p: Prescription) {
  const remainingDays = p.endDate ? Math.max(0, Math.ceil((p.endDate.getTime() - Date.now()) / 86_400_000)) : 0
  return { id: p.id, name: p.name, dosage: p.dosage, active: p.active, remainingDays }
}

export async function getPatientDossier(patientId: string) {
  const prisma = getPrismaClient()

  const [
    consultations,
    upcomingAppointments,
    vitalsRecords,
    prescriptions,
    labRequests,
    imagingRequests,
    cardioExams,
    pathologyRequests,
    endoscopyProcedures,
    emergencyVisits,
    hospitalizations,
    surgeries
  ] = await Promise.all([
    listConsultationsByPatient(patientId),
    listUpcomingAppointmentsByPatient(patientId),
    prisma.vitals.findMany({ where: { patientId, deletedAt: null }, orderBy: { recordedAt: 'desc' }, take: 1 }),
    prisma.prescription.findMany({ where: { patientId, deletedAt: null }, orderBy: { createdAt: 'desc' } }),
    prisma.labRequest.findMany({ where: { patientId, deletedAt: null }, orderBy: { requestedAt: 'desc' }, take: 5 }),
    prisma.imagingRequest.findMany({ where: { patientId, deletedAt: null }, orderBy: { requestedAt: 'desc' }, take: 5 }),
    prisma.cardioExam.findMany({ where: { patientId, deletedAt: null }, orderBy: { requestedAt: 'desc' }, take: 5 }),
    prisma.pathologyRequest.findMany({ where: { patientId, deletedAt: null }, orderBy: { requestedAt: 'desc' }, take: 5 }),
    prisma.endoscopyProcedure.findMany({ where: { patientId, deletedAt: null }, orderBy: { requestedAt: 'desc' }, take: 5 }),
    prisma.emergencyVisit.findMany({ where: { patientId, deletedAt: null }, orderBy: { arrivalTime: 'desc' }, take: 5 }),
    prisma.hospitalization.findMany({ where: { patientId, deletedAt: null }, orderBy: { admissionDate: 'desc' }, take: 5 }),
    prisma.surgery.findMany({ where: { patientId, deletedAt: null }, orderBy: { scheduledAt: 'desc' }, take: 5 })
  ])

  const examRows: ExamRow[] = [
    ...labRequests.map(labToRow),
    ...imagingRequests.map(imagingToRow),
    ...cardioExams.map(cardioToRow),
    ...pathologyRequests.map(pathologyToRow),
    ...endoscopyProcedures.map(endoscopyToRow)
  ]

  const timeline: TimelineRow[] = [
    ...consultations
      .filter((c) => c.status === 'TERMINEE')
      .map((c) => ({ date: new Date(c.date), type: 'consultation' as const, label: c.motive ?? 'Consultation', service: c.service })),
    ...examRows
      .filter((r) => examResultStatus(r.status) === 'DISPONIBLE')
      .map((r) => ({ date: r.date, type: 'exam' as const, label: r.label, service: r.domain as string })),
    ...emergencyVisits.map((e: EmergencyVisit) => ({
      date: e.arrivalTime,
      type: 'emergency' as const,
      label: e.motive ?? 'Urgences',
      service: e.zone
    })),
    ...hospitalizations.map((h: Hospitalization) => ({
      date: h.admissionDate,
      type: 'admission' as const,
      label: h.motive ?? 'Hospitalisation',
      service: h.service
    })),
    ...surgeries.map((s: Surgery) => ({ date: s.scheduledAt, type: 'surgery' as const, label: s.procedure, service: s.specialty }))
  ]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 15)

  return {
    consultations,
    upcomingAppointments,
    vitals: vitalsRecords[0] ? vitalsToRows(vitalsRecords[0]) : [],
    prescriptions: prescriptions.map(prescriptionToDisplay),
    results: buildResults(examRows),
    timeline: timeline.map((t) => ({ date: t.date.toISOString(), type: t.type, label: t.label, service: t.service }))
  }
}

export interface CreateVitalsInput {
  /** Contexte de prise (item 2 PETITES MODIFS) — choix obligatoire, voir enum VitalsSource. */
  source: 'ANALYSE' | 'RDV' | 'CONSULTATION'
  bloodPressure?: string
  temperature?: string
  heartRate?: string
  weight?: string
  oxygenSaturation?: string
}

export async function createPatientVitals(patientId: string, input: CreateVitalsInput) {
  const prisma = getPrismaClient()
  const vitals = await prisma.vitals.create({
    data: {
      id: randomUUID(),
      patientId,
      source: input.source,
      bloodPressure: input.bloodPressure,
      temperature: input.temperature,
      heartRate: input.heartRate,
      weight: input.weight,
      oxygenSaturation: input.oxygenSaturation
    }
  })
  return { id: vitals.id, rows: vitalsToRows(vitals) }
}

export interface UploadedVitalsFile {
  fileName: string
  mimeType: string
  content: Buffer
}

// Alternative à la saisie manuelle (item 2 PETITES MODIFS) — un seul fichier par prise de
// constantes, même mécanisme BLOB que les autres documents/résultats de l'application.
export async function uploadVitalsFile(vitalsId: string, file: UploadedVitalsFile) {
  const prisma = getPrismaClient()
  const vitals = await prisma.vitals.update({
    where: { id: vitalsId },
    data: {
      documentFileName: file.fileName,
      documentMimeType: file.mimeType,
      documentFileSize: file.content.length,
      documentContent: new Uint8Array(file.content)
    }
  })
  return { id: vitals.id, rows: vitalsToRows(vitals) }
}

export async function getVitalsFile(vitalsId: string) {
  const prisma = getPrismaClient()
  const vitals = await prisma.vitals.findUnique({ where: { id: vitalsId } })
  if (!vitals || vitals.deletedAt || !vitals.documentContent || !vitals.documentFileName) return null
  return { filename: vitals.documentFileName, contentBase64: Buffer.from(vitals.documentContent).toString('base64') }
}

export interface CreatePrescriptionInput {
  name: string
  dosage: string
  endDate?: string
}

export async function createPatientPrescription(patientId: string, input: CreatePrescriptionInput) {
  const prisma = getPrismaClient()
  const prescription = await prisma.prescription.create({
    data: {
      id: randomUUID(),
      patientId,
      name: input.name,
      dosage: input.dosage,
      endDate: input.endDate ? new Date(input.endDate) : undefined
    }
  })
  return prescriptionToDisplay(prescription)
}

export interface UpdatePrescriptionInput {
  active?: boolean
}

export async function updatePatientPrescription(id: string, input: UpdatePrescriptionInput) {
  const prisma = getPrismaClient()
  const prescription = await prisma.prescription.update({ where: { id }, data: { active: input.active } })
  return prescriptionToDisplay(prescription)
}

// --- Impression du dossier patient (item 9) ------------------------------------------------
// Premier flow "Imprimer" réel de l'appli (les ~15 boutons du même nom ailleurs restent
// décoratifs, voir Audit-Fonctionnalites-Manquantes.md §6) — génère un vrai PDF via `pdfkit`
// (déjà une dépendance, jusqu'ici inutilisée) plutôt qu'un texte statique.
const CONSULTATION_STATUS_LABEL: Record<string, string> = {
  TERMINEE: 'Terminée',
  EN_COURS: 'En cours',
  EN_ATTENTE: 'En attente',
  ANNULEE: 'Annulée'
}

const RESULT_STATUS_LABEL: Record<string, string> = {
  DISPONIBLE: 'Disponible',
  EN_COURS: 'En cours',
  EN_ATTENTE: 'En attente'
}

// Résumé imprimable du dossier (item 9) — mise en page refaite (item 16 PETITES MODIFS) : bandeau,
// fiche d'identité, sections avec tableaux, pied de page numéroté (voir pdf-layout.ts).
export async function generatePatientSummaryPdf(patientId: string) {
  const prisma = getPrismaClient()
  const patient = await prisma.patient.findUnique({ where: { id: patientId } })
  if (!patient || patient.deletedAt) return null

  const company = await prisma.company.findFirst()
  const establishment = company?.name ?? 'Pandora Health'
  const dossier = await getPatientDossier(patientId)
  const age = computeAge(patient.birthDate)
  const medicalHistory = (patient.medicalHistory as string[] | null) ?? []
  const generatedAt = new Date()
  const fr = (iso: string | Date): string => new Date(iso).toLocaleDateString('fr-FR')

  const buffer = await createPdfBuffer((doc) => {
    drawHeaderBand(
      doc,
      establishment,
      'Résumé du dossier patient',
      `Document confidentiel · généré le ${generatedAt.toLocaleDateString('fr-FR')} à ${generatedAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
    )

    drawInfoCard(doc, `${patient.lastName.toUpperCase()} ${patient.firstName}`, [
      ['Code patient', patient.code],
      ['Âge / Sexe', `${age} ans · ${patient.gender === 'M' ? 'Masculin' : 'Féminin'}`],
      ['Date de naissance', fr(patient.birthDate)],
      ['Groupe sanguin', patient.bloodType ?? 'Non renseigné'],
      ['Téléphone', patient.phone ?? '—'],
      ['Assurance', patient.insuranceProvider ? `${patient.insuranceProvider}${patient.insuranceNumber ? ` · N° ${patient.insuranceNumber}` : ''}` : '—'],
      ['Allergies', patient.allergies ?? 'Non renseignées'],
      [
        "Contact d'urgence",
        patient.emergencyContactName ? `${patient.emergencyContactName}${patient.emergencyContactPhone ? ` · ${patient.emergencyContactPhone}` : ''}` : '—'
      ]
    ])

    drawSectionTitle(doc, 'Antécédents médicaux')
    if (medicalHistory.length === 0) {
      drawEmptyNote(doc, 'Aucun antécédent renseigné.')
    } else {
      drawTable(doc, ['Antécédent'], medicalHistory.map((h) => [h]), [1])
    }

    drawSectionTitle(doc, 'Dernières consultations')
    if (dossier.consultations.length === 0) {
      drawEmptyNote(doc, 'Aucune consultation enregistrée.')
    } else {
      drawTable(
        doc,
        ['Date', 'Service', 'Motif', 'Médecin', 'Statut'],
        dossier.consultations
          .slice(0, 8)
          .map((c) => [fr(c.date), c.service ?? '—', c.motive ?? '—', c.doctorName ?? '—', CONSULTATION_STATUS_LABEL[c.status] ?? c.status]),
        [0.14, 0.18, 0.32, 0.2, 0.16]
      )
    }

    drawSectionTitle(doc, 'Ordonnances en cours')
    const activePrescriptions = dossier.prescriptions.filter((p) => p.active)
    if (activePrescriptions.length === 0) {
      drawEmptyNote(doc, 'Aucune ordonnance active.')
    } else {
      drawTable(
        doc,
        ['Médicament', 'Posologie', 'Jours restants'],
        activePrescriptions.map((p) => [p.name, p.dosage, p.remainingDays > 0 ? `${p.remainingDays} j` : '—']),
        [0.35, 0.45, 0.2]
      )
    }

    drawSectionTitle(doc, 'Dernières constantes')
    if (dossier.vitals.length === 0) {
      drawEmptyNote(doc, 'Aucune constante enregistrée.')
    } else {
      drawTable(doc, ['Mesure', 'Valeur', 'Date'], dossier.vitals.map((v) => [v.label, v.value, fr(v.date)]), [0.4, 0.35, 0.25])
    }

    drawSectionTitle(doc, "Résultats d'examens récents")
    if (dossier.results.length === 0) {
      drawEmptyNote(doc, 'Aucun examen enregistré.')
    } else {
      drawTable(
        doc,
        ['Examen', 'Date', 'Statut'],
        dossier.results.map((r) => [r.label, fr(r.date), RESULT_STATUS_LABEL[r.status] ?? r.status]),
        [0.6, 0.2, 0.2]
      )
    }
  }, `${establishment} — Dossier ${patient.code} — Confidentiel`)

  const filename = `Dossier-${patient.code}.pdf`.replace(/[\\/:*?"<>|]/g, '_')
  return { filename, contentBase64: buffer.toString('base64') }
}
