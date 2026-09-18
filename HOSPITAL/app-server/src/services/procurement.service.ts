import { randomUUID } from 'crypto'
import { getPrismaClient } from '../db/client'
import { nextCode } from './counter.service'
import type { ProcurementPriority, ProcurementRequest, ProcurementStatus } from '../generated/prisma/client'

export interface CreateProcurementRequestInput {
  article: string
  category: string
  quantity: number
  priority?: ProcurementPriority
  requester: string
}

export interface UpdateProcurementRequestInput {
  article?: string
  category?: string
  quantity?: number
  priority?: ProcurementPriority
  status?: ProcurementStatus
  requester?: string
}

function toDisplay(r: ProcurementRequest) {
  return {
    id: r.id,
    reference: r.reference,
    requestedAt: r.requestedAt.toISOString(),
    article: r.article,
    category: r.category,
    quantity: r.quantity,
    priority: r.priority,
    status: r.status,
    requester: r.requester
  }
}

export async function listProcurementRequests() {
  const prisma = getPrismaClient()
  const requests = await prisma.procurementRequest.findMany({ where: { deletedAt: null }, orderBy: { requestedAt: 'desc' } })
  return requests.map(toDisplay)
}

export async function deleteProcurementRequest(id: string): Promise<void> {
  const prisma = getPrismaClient()
  await prisma.procurementRequest.update({ where: { id }, data: { deletedAt: new Date() } })
}

export async function listSuppliers() {
  const prisma = getPrismaClient()
  const suppliers = await prisma.supplier.findMany({ orderBy: { orders: 'desc' } })
  return suppliers.map((s) => ({
    id: s.id,
    name: s.name,
    orders: s.orders,
    onTimePercent: s.onTimePercent,
    quality: s.quality,
    rating: s.rating
  }))
}

export async function createProcurementRequest(input: CreateProcurementRequestInput) {
  const prisma = getPrismaClient()
  const reference = await nextCode('PROCUREMENT', 'BES', 4)

  const request = await prisma.procurementRequest.create({
    data: {
      id: randomUUID(),
      reference,
      requestedAt: new Date(),
      article: input.article,
      category: input.category,
      quantity: input.quantity,
      priority: input.priority ?? 'NORMALE',
      status: 'A_VALIDER',
      requester: input.requester
    }
  })
  return toDisplay(request)
}

export async function updateProcurementRequest(id: string, input: UpdateProcurementRequestInput) {
  const prisma = getPrismaClient()
  const request = await prisma.procurementRequest.update({
    where: { id },
    data: {
      article: input.article,
      category: input.category,
      quantity: input.quantity,
      priority: input.priority,
      status: input.status,
      requester: input.requester
    }
  })
  return toDisplay(request)
}
