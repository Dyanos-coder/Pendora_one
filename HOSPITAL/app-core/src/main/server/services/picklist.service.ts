import { randomUUID } from 'crypto'
import { getPrismaClient } from '../db/client'

// Listes "avec ajout automatique" — voir PETITES MODIFS items 3/6/7/8/12. `listKey` identifie le
// champ (une constante par appelant, voir les fonctions plus bas), pas une valeur libre venant du
// client : ça évite qu'un renderer compromis crée des listes arbitraires.
export const PICKLIST_KEYS = {
  PATIENT_DOCUMENT_CATEGORY: 'patientDocumentCategory',
  HOSPITALIZATION_SERVICE: 'hospitalizationService',
  EMERGENCY_ZONE: 'emergencyZone',
  LABORATORY_ANALYSIS_TYPE: 'laboratoryAnalysisType',
  PHARMACY_MEDICATION_NAME: 'pharmacyMedicationName',
  PHARMACY_MEDICATION_CATEGORY: 'pharmacyMedicationCategory',
  BLOOD_DONOR_NAME: 'bloodDonorName'
} as const

export type PicklistKey = (typeof PICKLIST_KEYS)[keyof typeof PICKLIST_KEYS]

export async function listPicklistValues(listKey: string): Promise<string[]> {
  const prisma = getPrismaClient()
  const rows = await prisma.picklistValue.findMany({ where: { listKey }, orderBy: { value: 'asc' } })
  return rows.map((r) => r.value)
}

/** À appeler après chaque création/modification qui fixe l'un de ces champs à une valeur non
 * vide — silencieusement no-op si la valeur est déjà connue (contrainte unique côté base). Jamais
 * bloquant : une erreur ici ne doit pas faire échouer l'enregistrement principal. */
export async function ensurePicklistValue(listKey: PicklistKey, value: string | null | undefined): Promise<void> {
  const trimmed = value?.trim()
  if (!trimmed) return
  const prisma = getPrismaClient()
  try {
    await prisma.picklistValue.upsert({
      where: { listKey_value: { listKey, value: trimmed } },
      update: {},
      create: { id: randomUUID(), listKey, value: trimmed }
    })
  } catch (error) {
    console.error(`[picklist] échec de l'enregistrement de "${trimmed}" pour "${listKey}"`, error)
  }
}
