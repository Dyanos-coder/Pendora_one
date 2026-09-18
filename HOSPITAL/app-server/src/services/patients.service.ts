import { randomUUID } from 'crypto'
import PDFDocument from 'pdfkit'
import { getPrismaClient } from '../db/client'
import { nextCode } from './counter.service'
import { computeAge } from './date-utils'
import { listConsultationsByPatient } from './consultations.service'
import { listUpcomingAppointmentsByPatient } from './appointments.service'
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
    balance: patient.balance,
    emergencyContact: { name: patient.emergencyContactName, phone: patient.emergencyContactPhone },
    medicalHistory: (patient.medicalHistory as string[] | null) ?? [],
    familyHistory: (patient.familyHistory as string[] | null) ?? [],
    lifestyle: (patient.lifestyle as string[] | null) ?? [],
    recordCompleteness: computeRecordCompleteness(patient)
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
  const code = await nextCode('PATIENT', 'P')

  const patient = await prisma.patient.create({
    data: {
      id: randomUUID(),
      code,
      firstName: input.firstName,
      lastName: input.lastName,
      gender: input.gender,
      birthDate: new Date(input.birthDate),
      phone: input.phone,
      email: input.email,
      bloodType: input.bloodType,
      allergies: input.allergies,
      admissionType: input.admissionType ?? 'AMBULATOIRE',
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
      admissionType: input.admissionType,
      status: input.status,
      service: input.service === undefined ? undefined : input.service,
      insuranceProvider: input.insuranceProvider === undefined ? undefined : input.insuranceProvider,
      insuranceNumber: input.insuranceNumber === undefined ? undefined : input.insuranceNumber,
      insuranceExpiry: input.insuranceExpiry !== undefined ? (input.insuranceExpiry ? new Date(input.insuranceExpiry) : null) : undefined,
      emergencyContactName: input.emergencyContactName === undefined ? undefined : input.emergencyContactName,
      emergencyContactPhone: input.emergencyContactPhone === undefined ? undefined : input.emergencyContactPhone
    }
  })
  return toDetail(patient)
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
      bloodPressure: input.bloodPressure,
      temperature: input.temperature,
      heartRate: input.heartRate,
      weight: input.weight,
      oxygenSaturation: input.oxygenSaturation
    }
  })
  return vitalsToRows(vitals)
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
function pdfBuffer(build: (doc: PDFKit.PDFDocument) => void): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 })
    const chunks: Buffer[] = []
    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
    build(doc)
    doc.end()
  })
}

export async function generatePatientSummaryPdf(patientId: string) {
  const prisma = getPrismaClient()
  const patient = await prisma.patient.findUnique({ where: { id: patientId } })
  if (!patient || patient.deletedAt) return null

  const dossier = await getPatientDossier(patientId)
  const age = computeAge(patient.birthDate)
  const medicalHistory = (patient.medicalHistory as string[] | null) ?? []

  const buffer = await pdfBuffer((doc) => {
    doc.fontSize(18).text('Pandora Health — Résumé du dossier patient', { align: 'center' })
    doc.moveDown()

    doc.fontSize(14).fillColor('#000').text(`${patient.firstName} ${patient.lastName}`)
    doc
      .fontSize(10)
      .fillColor('#555')
      .text(`Code patient : ${patient.code} · ${age} ans · ${patient.gender === 'M' ? 'Masculin' : 'Féminin'}`)
    doc.text(`Né(e) le ${patient.birthDate.toLocaleDateString('fr-FR')}`)
    doc.moveDown(0.75)
    doc.fillColor('#000')

    doc.fontSize(12).text('Informations médicales clés', { underline: true })
    doc.fontSize(10)
    doc.text(`Groupe sanguin : ${patient.bloodType ?? 'Non renseigné'}`)
    doc.text(`Allergies : ${patient.allergies ?? 'Non renseignées'}`)
    doc.text(`Antécédents médicaux : ${medicalHistory.length > 0 ? medicalHistory.join(', ') : 'Non renseignés'}`)
    doc.moveDown()

    doc.fontSize(12).text('Dernières consultations', { underline: true })
    doc.fontSize(10)
    if (dossier.consultations.length === 0) {
      doc.text('Aucune consultation enregistrée.')
    } else {
      for (const c of dossier.consultations.slice(0, 8)) {
        doc.text(`${new Date(c.date).toLocaleDateString('fr-FR')} — ${c.service ?? '—'} — ${c.motive ?? '—'} — ${c.status}`)
      }
    }
    doc.moveDown()

    doc.fontSize(12).text('Ordonnances en cours', { underline: true })
    doc.fontSize(10)
    const activePrescriptions = dossier.prescriptions.filter((p) => p.active)
    if (activePrescriptions.length === 0) {
      doc.text('Aucune ordonnance active.')
    } else {
      for (const p of activePrescriptions) {
        doc.text(`${p.name} — ${p.dosage}`)
      }
    }
    doc.moveDown()

    doc.fontSize(12).text('Constantes récentes', { underline: true })
    doc.fontSize(10)
    if (dossier.vitals.length === 0) {
      doc.text('Aucune donnée.')
    } else {
      for (const v of dossier.vitals) {
        doc.text(`${v.label} : ${v.value}`)
      }
    }

    doc.moveDown(2)
    doc.fontSize(8).fillColor('#888').text(`Document généré le ${new Date().toLocaleString('fr-FR')}`, { align: 'right' })
  })

  const filename = `Dossier-${patient.code}.pdf`.replace(/[\\/:*?"<>|]/g, '_')
  return { filename, contentBase64: buffer.toString('base64') }
}
