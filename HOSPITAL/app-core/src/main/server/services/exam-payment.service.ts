import { getPrismaClient } from '../db/client'
import type { ApiExamType } from '../../../shared/cashier-types'

// Examens encaissés en caisse (Plan-Module-Caisse.md §4-E) : les pages Laboratoire, Imagerie,
// Cardiologie, Anatomopathologie et Endoscopie affichent « Payé / Non payé », en information
// seulement (la réalisation de l'examen n'est pas bloquée). Module volontairement minimal pour
// être importé par ces services sans dépendance circulaire avec cashier.service.ts.

/** Identifiants des examens de ce type couverts par un reçu payé. */
export async function paidExamIds(examType: ApiExamType, examIds?: string[]): Promise<Set<string>> {
  const prisma = getPrismaClient()
  const lines = await prisma.receiptLine.findMany({
    where: { examType, examId: examIds ? { in: examIds } : { not: null }, receipt: { status: 'PAYE' } },
    select: { examId: true }
  })
  return new Set(lines.map((l) => l.examId).filter((id): id is string => Boolean(id)))
}

/** Ajoute `paid` à chaque élément d'une liste d'examens. */
export async function withPaidFlag<T extends { id: string }>(examType: ApiExamType, items: T[]): Promise<(T & { paid: boolean })[]> {
  const paid = await paidExamIds(examType, items.map((i) => i.id))
  return items.map((item) => ({ ...item, paid: paid.has(item.id) }))
}
