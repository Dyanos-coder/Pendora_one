import { randomUUID } from 'crypto'
import { getPrismaClient } from '../db/client'
import { ConflictError } from '../lib/conflict-error'
import { nextCode } from './counter.service'
import { buildXlsxDocument } from './xlsx-export'
import type { ProcurementPriority, ProcurementRequest, ProcurementStatus } from '../generated/prisma/client'

export interface CreateProcurementRequestInput {
  /** Optionnel : id généré côté client (mode hors-ligne) — création idempotente si rejoué. */
  id?: string
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
  /** Dernière version connue (`updatedAt`) de la demande, pour détecter un conflit si elle a été
   * modifiée entre-temps par quelqu'un d'autre (mode hors-ligne, voir
   * Plan-Mode-Hors-Ligne-Synchronisation.md §6.3). Absent : pas de vérification (mise à jour en
   * ligne normale, jamais hors-ligne). */
  expectedUpdatedAt?: string
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
    requester: r.requester,
    updatedAt: r.updatedAt.toISOString()
  }
}

export async function listProcurementRequests() {
  const prisma = getPrismaClient()
  const requests = await prisma.procurementRequest.findMany({ where: { deletedAt: null }, orderBy: { requestedAt: 'desc' } })
  return requests.map(toDisplay)
}

// Rollout "Export Excel" (item 10, voir xlsx-export.ts) — réutilise listProcurementRequests()
// plutôt que de dupliquer la requête Prisma.
export async function exportProcurementRequests() {
  const requests = await listProcurementRequests()
  return buildXlsxDocument(
    'Approvisionnement',
    "Demandes d'approvisionnement",
    [
      { header: 'Référence', key: 'reference', width: 16 },
      { header: 'Date demande', key: 'requestedAt', width: 18 },
      { header: 'Article', key: 'article', width: 24 },
      { header: 'Catégorie', key: 'category', width: 18 },
      { header: 'Quantité', key: 'quantity', width: 12 },
      { header: 'Priorité', key: 'priority', width: 12 },
      { header: 'Statut', key: 'status', width: 16 },
      { header: 'Demandeur', key: 'requester', width: 20 }
    ],
    requests.map((r) => ({
      ...r,
      requestedAt: new Date(r.requestedAt).toLocaleString('fr-FR')
    }))
  )
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

  if (input.id) {
    const existing = await prisma.procurementRequest.findUnique({ where: { id: input.id } })
    if (existing) return toDisplay(existing)
  }

  const reference = await nextCode('PROCUREMENT', 'BES', 4)

  const request = await prisma.procurementRequest.create({
    data: {
      id: input.id ?? randomUUID(),
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

  if (input.expectedUpdatedAt) {
    const current = await prisma.procurementRequest.findUnique({ where: { id } })
    if (current && current.updatedAt.toISOString() !== input.expectedUpdatedAt) {
      throw new ConflictError(toDisplay(current))
    }
  }

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
