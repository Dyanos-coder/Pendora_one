import { randomUUID } from 'crypto'
import { getPrismaClient } from '../db/client'
import { nextCode } from './counter.service'
import type { BloodAnalysis, BloodAnalysisResult, BloodPouch } from '../generated/prisma/client'

export interface CreateBloodAnalysisInput {
  pouchId: string
  testType: string
  result?: BloodAnalysisResult
  performedBy: string
  performedAt?: string
  note?: string
}

export interface UpdateBloodAnalysisInput {
  testType?: string
  result?: BloodAnalysisResult
  performedBy?: string
  performedAt?: string
  note?: string | null
}

type AnalysisWithRelations = BloodAnalysis & { pouch: BloodPouch }

function toDisplay(a: AnalysisWithRelations) {
  return {
    id: a.id,
    reference: a.reference,
    pouchId: a.pouchId,
    pouchNumber: a.pouch.pouchNumber,
    testType: a.testType,
    result: a.result,
    performedBy: a.performedBy,
    performedAt: a.performedAt.toISOString(),
    note: a.note
  }
}

// Une analyse positive écarte la poche liée ; une analyse négative sur une poche encore en
// attente d'analyse la rend disponible. Aucun effet si la poche a déjà un autre statut (ex.
// réservée ou transfusée entre-temps) — on ne fait pas régresser un état plus avancé.
async function applyResultToPouch(pouchId: string, result: BloodAnalysisResult): Promise<void> {
  if (result === 'EN_ATTENTE') return
  const prisma = getPrismaClient()
  if (result === 'POSITIF') {
    await prisma.bloodPouch.update({ where: { id: pouchId }, data: { status: 'ECARTEE' } })
    return
  }
  const pouch = await prisma.bloodPouch.findUnique({ where: { id: pouchId } })
  if (pouch?.status === 'EN_ATTENTE_ANALYSE') {
    await prisma.bloodPouch.update({ where: { id: pouchId }, data: { status: 'DISPONIBLE' } })
  }
}

export async function listBloodAnalyses() {
  const prisma = getPrismaClient()
  const analyses = await prisma.bloodAnalysis.findMany({
    where: { deletedAt: null },
    include: { pouch: true },
    orderBy: { performedAt: 'desc' }
  })
  return analyses.map(toDisplay)
}

export async function createBloodAnalysis(input: CreateBloodAnalysisInput) {
  const prisma = getPrismaClient()
  const reference = await nextCode('BLOOD_ANALYSIS', 'ANL', 4)
  const result = input.result ?? 'EN_ATTENTE'

  const analysis = await prisma.bloodAnalysis.create({
    data: {
      id: randomUUID(),
      reference,
      pouchId: input.pouchId,
      testType: input.testType,
      result,
      performedBy: input.performedBy,
      performedAt: input.performedAt ? new Date(input.performedAt) : new Date(),
      note: input.note
    },
    include: { pouch: true }
  })

  await applyResultToPouch(input.pouchId, result)

  return toDisplay(analysis)
}

export async function updateBloodAnalysis(id: string, input: UpdateBloodAnalysisInput) {
  const prisma = getPrismaClient()
  const analysis = await prisma.bloodAnalysis.update({
    where: { id },
    data: {
      testType: input.testType,
      result: input.result,
      performedBy: input.performedBy,
      performedAt: input.performedAt !== undefined ? new Date(input.performedAt) : undefined,
      note: input.note === undefined ? undefined : input.note
    },
    include: { pouch: true }
  })

  if (input.result) {
    await applyResultToPouch(analysis.pouchId, input.result)
  }

  return toDisplay(analysis)
}

export async function deleteBloodAnalysis(id: string): Promise<void> {
  const prisma = getPrismaClient()
  await prisma.bloodAnalysis.update({ where: { id }, data: { deletedAt: new Date() } })
}
