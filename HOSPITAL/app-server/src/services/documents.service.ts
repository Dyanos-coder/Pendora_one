import { randomUUID } from 'crypto'
import { getPrismaClient } from '../db/client'
import type { ProtocolDocument, ProtocolDocumentStatus } from '../generated/prisma/client'

export interface CreateProtocolDocumentInput {
  title: string
  category: string
  version: string
  owner: string
  status?: ProtocolDocumentStatus
}

export interface UpdateProtocolDocumentInput {
  title?: string
  category?: string
  version?: string
  owner?: string
  status?: ProtocolDocumentStatus
}

function toDisplay(d: ProtocolDocument) {
  return {
    id: d.id,
    title: d.title,
    category: d.category,
    version: d.version,
    status: d.status,
    revisedAt: d.revisedAt.toISOString(),
    owner: d.owner
  }
}

export async function listProtocolDocuments() {
  const prisma = getPrismaClient()
  const documents = await prisma.protocolDocument.findMany({ where: { deletedAt: null }, orderBy: { revisedAt: 'desc' } })
  return documents.map(toDisplay)
}

export async function deleteProtocolDocument(id: string): Promise<void> {
  const prisma = getPrismaClient()
  await prisma.protocolDocument.update({ where: { id }, data: { deletedAt: new Date() } })
}

export async function createProtocolDocument(input: CreateProtocolDocumentInput) {
  const prisma = getPrismaClient()
  const document = await prisma.protocolDocument.create({
    data: {
      id: randomUUID(),
      title: input.title,
      category: input.category,
      version: input.version,
      owner: input.owner,
      status: input.status ?? 'PUBLIE',
      revisedAt: new Date()
    }
  })
  return toDisplay(document)
}

export async function updateProtocolDocument(id: string, input: UpdateProtocolDocumentInput) {
  const prisma = getPrismaClient()
  const document = await prisma.protocolDocument.update({
    where: { id },
    data: {
      title: input.title,
      category: input.category,
      version: input.version,
      owner: input.owner,
      status: input.status,
      revisedAt: new Date()
    }
  })
  return toDisplay(document)
}
