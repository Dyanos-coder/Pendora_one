import { getPrismaClient } from '../db/client'
import type { AdmissionType } from '../generated/prisma/client'

// Statut d'admission du patient tenu à jour automatiquement par les pages Hospitalisation et
// Urgences : une hospitalisation en cours (ou en attente de lit) → HOSPITALISE, sinon un passage aux
// urgences non clôturé → URGENCE. Quand plus rien n'est en cours, un statut posé automatiquement
// retombe à NON_ADMIS ; un statut choisi à la main dans la fiche (NON_ADMIS/AMBULATOIRE) est gardé.

const ACTIVE_HOSPITALIZATION = ['HOSPITALISE', 'EN_ATTENTE'] as const
const ACTIVE_EMERGENCY = ['EN_COURS', 'EN_OBSERVATION', 'EN_ATTENTE_TRIAGE'] as const
const AUTOMATIC: AdmissionType[] = ['HOSPITALISE', 'URGENCE']

/** À appeler après toute création/modification/suppression d'une hospitalisation ou d'un passage
 * aux urgences, avec le(s) patient(s) concerné(s) — ancien ET nouveau si le patient a changé. */
export async function refreshPatientAdmission(...patientIds: (string | null | undefined)[]): Promise<void> {
  const prisma = getPrismaClient()
  const ids = [...new Set(patientIds.filter((id): id is string => Boolean(id)))]

  for (const id of ids) {
    const patient = await prisma.patient.findUnique({ where: { id }, select: { admissionType: true } })
    if (!patient) continue

    const [hospitalizations, emergencies] = await Promise.all([
      prisma.hospitalization.count({ where: { patientId: id, deletedAt: null, status: { in: [...ACTIVE_HOSPITALIZATION] } } }),
      prisma.emergencyVisit.count({ where: { patientId: id, deletedAt: null, status: { in: [...ACTIVE_EMERGENCY] } } })
    ])

    let next: AdmissionType = patient.admissionType
    if (hospitalizations > 0) next = 'HOSPITALISE'
    else if (emergencies > 0) next = 'URGENCE'
    else if (AUTOMATIC.includes(patient.admissionType)) next = 'NON_ADMIS'

    if (next !== patient.admissionType) {
      await prisma.patient.update({ where: { id }, data: { admissionType: next } })
    }
  }
}
