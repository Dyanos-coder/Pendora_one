import { randomUUID } from 'crypto'
import { getPrismaClient } from '../db/client'
import type { Risk, RiskStatus } from '../generated/prisma/client'

export type RiskLevel = 'FAIBLE' | 'MODERE' | 'ELEVE' | 'CRITIQUE'

export interface CreateRiskInput {
  title: string
  category: string
  probability: number
  impact: number
  owner: string
  status?: RiskStatus
}

export interface UpdateRiskInput {
  title?: string
  category?: string
  probability?: number
  impact?: number
  owner?: string
  status?: RiskStatus
}

// Même barème que risk-management/status.ts::levelFromScore côté front — dupliqué ici pour
// que le niveau renvoyé par l'API et celui recalculable côté client restent identiques.
function levelFromScore(score: number): RiskLevel {
  if (score >= 12) return 'CRITIQUE'
  if (score >= 8) return 'ELEVE'
  if (score >= 4) return 'MODERE'
  return 'FAIBLE'
}

function toDisplay(r: Risk) {
  return {
    id: r.id,
    title: r.title,
    category: r.category,
    probability: r.probability,
    impact: r.impact,
    level: levelFromScore(r.probability * r.impact),
    status: r.status,
    owner: r.owner,
    identifiedAt: r.identifiedAt.toISOString()
  }
}

export async function listRisks() {
  const prisma = getPrismaClient()
  const risks = await prisma.risk.findMany({ where: { deletedAt: null }, orderBy: { identifiedAt: 'desc' } })
  return risks.map(toDisplay)
}

export async function deleteRisk(id: string): Promise<void> {
  const prisma = getPrismaClient()
  await prisma.risk.update({ where: { id }, data: { deletedAt: new Date() } })
}

export async function createRisk(input: CreateRiskInput) {
  const prisma = getPrismaClient()
  const risk = await prisma.risk.create({
    data: {
      id: randomUUID(),
      title: input.title,
      category: input.category,
      probability: input.probability,
      impact: input.impact,
      owner: input.owner,
      status: input.status ?? 'OUVERT',
      identifiedAt: new Date()
    }
  })
  return toDisplay(risk)
}

export async function updateRisk(id: string, input: UpdateRiskInput) {
  const prisma = getPrismaClient()
  const risk = await prisma.risk.update({
    where: { id },
    data: {
      title: input.title,
      category: input.category,
      probability: input.probability,
      impact: input.impact,
      owner: input.owner,
      status: input.status
    }
  })
  return toDisplay(risk)
}
