import { randomUUID } from 'crypto'
import { getPrismaClient } from '../db/client'
import type { EmployeeDocument, Employee } from '../generated/prisma/client'

export interface CreateEmployeeDocumentInput {
  employeeId: string
  title: string
  category?: string
}

type DocumentWithEmployee = EmployeeDocument & { employee: Employee }

function toDisplay(d: DocumentWithEmployee) {
  return {
    id: d.id,
    employeeId: d.employeeId,
    employeeName: `${d.employee.firstName} ${d.employee.lastName}`,
    title: d.title,
    category: d.category,
    fileName: d.fileName,
    fileSize: d.fileSize,
    uploadedAt: d.uploadedAt.toISOString()
  }
}

export async function listEmployeeDocuments() {
  const prisma = getPrismaClient()
  const documents = await prisma.employeeDocument.findMany({
    where: { deletedAt: null },
    include: { employee: true },
    orderBy: { uploadedAt: 'desc' }
  })
  return documents.map(toDisplay)
}

export async function createEmployeeDocument(input: CreateEmployeeDocumentInput) {
  const prisma = getPrismaClient()
  const document = await prisma.employeeDocument.create({
    data: {
      id: randomUUID(),
      employeeId: input.employeeId,
      title: input.title,
      category: input.category
    },
    include: { employee: true }
  })
  return toDisplay(document)
}

export async function deleteEmployeeDocument(id: string): Promise<void> {
  const prisma = getPrismaClient()
  await prisma.employeeDocument.update({ where: { id }, data: { deletedAt: new Date() } })
}

export interface UploadedFile {
  fileName: string
  mimeType: string
  content: Buffer
}

export async function uploadEmployeeDocumentFile(id: string, file: UploadedFile) {
  const prisma = getPrismaClient()
  const document = await prisma.employeeDocument.update({
    where: { id },
    data: {
      fileName: file.fileName,
      mimeType: file.mimeType,
      fileSize: file.content.length,
      content: new Uint8Array(file.content)
    },
    include: { employee: true }
  })
  return toDisplay(document)
}

export async function getEmployeeDocumentFile(id: string) {
  const prisma = getPrismaClient()
  const document = await prisma.employeeDocument.findUnique({ where: { id } })
  if (!document || document.deletedAt || !document.content || !document.fileName) return null
  return { filename: document.fileName, contentBase64: Buffer.from(document.content).toString('base64') }
}
