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

/** Compteur remis à 1 chaque jour, par clé — ex. le n° de passage de la caisse, par service
 * (Plan-Module-Caisse.md). Même table que `nextCode`, avec la date du jour dans le type. */
export async function nextDailyNumber(key: string): Promise<number> {
  const prisma = getPrismaClient()
  const now = new Date()
  const day = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
  const counter = await prisma.documentCounter.upsert({
    where: { type_year: { type: `DAILY:${key}:${day}`, year: now.getFullYear() } },
    update: { value: { increment: 1 } },
    create: { type: `DAILY:${key}:${day}`, year: now.getFullYear(), value: 1 }
  })
  return counter.value
}
