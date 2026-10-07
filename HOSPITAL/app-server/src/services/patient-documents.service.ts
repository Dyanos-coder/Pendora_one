import { randomUUID } from 'crypto'
import { getPrismaClient } from '../db/client'
import { ensurePicklistValue, PICKLIST_KEYS } from './picklist.service'
import type { PatientDocument, Patient } from '../generated/prisma/client'

export interface CreatePatientDocumentInput {
  patientId: string
  title: string
  category?: string
}

type DocumentWithPatient = PatientDocument & { patient: Patient }

function toDisplay(d: DocumentWithPatient) {
  return {
    id: d.id,
    patientId: d.patientId,
    patientName: `${d.patient.firstName} ${d.patient.lastName}`,
    title: d.title,
    category: d.category,
    fileName: d.fileName,
    fileSize: d.fileSize,
    uploadedAt: d.uploadedAt.toISOString()
  }
}

export async function listPatientDocuments(patientId: string) {
  const prisma = getPrismaClient()
  const documents = await prisma.patientDocument.findMany({
    where: { patientId, deletedAt: null },
    include: { patient: true },
    orderBy: { uploadedAt: 'desc' }
  })
  return documents.map(toDisplay)
}

export async function createPatientDocument(input: CreatePatientDocumentInput) {
  const prisma = getPrismaClient()
  const document = await prisma.patientDocument.create({
    data: {
      id: randomUUID(),
      patientId: input.patientId,
      title: input.title,
      category: input.category
    },
    include: { patient: true }
  })
  await ensurePicklistValue(PICKLIST_KEYS.PATIENT_DOCUMENT_CATEGORY, input.category)
  return toDisplay(document)
}

export async function deletePatientDocument(id: string): Promise<void> {
  const prisma = getPrismaClient()
  await prisma.patientDocument.update({ where: { id }, data: { deletedAt: new Date() } })
}

export interface UploadedFile {
  fileName: string
  mimeType: string
  content: Buffer
}

export async function uploadPatientDocumentFile(id: string, file: UploadedFile) {
  const prisma = getPrismaClient()
  const document = await prisma.patientDocument.update({
    where: { id },
    data: {
      fileName: file.fileName,
      mimeType: file.mimeType,
      fileSize: file.content.length,
      content: new Uint8Array(file.content)
    },
    include: { patient: true }
  })
  return toDisplay(document)
}

export async function getPatientDocumentFile(id: string) {
  const prisma = getPrismaClient()
  const document = await prisma.patientDocument.findUnique({ where: { id } })
  if (!document || document.deletedAt || !document.content || !document.fileName) return null
  return { filename: document.fileName, contentBase64: Buffer.from(document.content).toString('base64') }
}
