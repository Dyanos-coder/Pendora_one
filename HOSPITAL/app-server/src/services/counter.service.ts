import { getPrismaClient } from '../db/client'

/** Génère un code lisible et unique (ex. P-2025-0001245) via un compteur atomique par
 * établissement, par type de document et par année — réutilisé par tous les domaines qui ont
 * besoin d'un identifiant métier distinct de l'id technique (voir Proposition-Architecture-
 * Backend.md §5.3). */
export async function nextCode(type: string, prefix: string, padding = 7): Promise<string> {
  const prisma = getPrismaClient()
  const year = new Date().getFullYear()

  const counter = await prisma.documentCounter.upsert({
    where: { type_year: { type, year } },
    update: { value: { increment: 1 } },
    create: { type, year, value: 1 }
  })

  return `${prefix}-${year}-${String(counter.value).padStart(padding, '0')}`
}
