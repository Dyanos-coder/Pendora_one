import { getPrismaClient } from '../db/client'
import { bedOccupancySummary } from './beds.service'
import { startOfToday, endOfToday } from './date-utils'

// Centre de Commandement (Phase 6) : agrégation pure sur les tables déjà créées en Phases 1-5,
// aucun nouveau modèle Prisma. Le stockState (RUPTURE/STOCK_FAIBLE) n'est pas exprimable en
// clause `where` Prisma (comparaison colonne à colonne) — on charge le peu de lignes existantes
// et on compte en mémoire, comme pharmacy.service.ts / stocks.service.ts le font déjà.
export async function getDashboardSummary() {
  const prisma = getPrismaClient()
  const todayStart = startOfToday()
  const todayEnd = endOfToday()

  const [
    appointmentPatientIds,
    consultationPatientIds,
    emergencyPatientIds,
    consultationsToday,
    revenueToday,
    occupancy,
    emergenciesWaiting,
    criticalEmergencies,
    surgeriesToday,
    labPending,
    imagingPending,
    pathologyPending,
    endoscopyPending,
    medications,
    depotItems,
    unpaidReceipts
  ] = await Promise.all([
    prisma.appointment.findMany({ where: { date: { gte: todayStart, lte: todayEnd } }, select: { patientId: true } }),
    prisma.consultation.findMany({ where: { date: { gte: todayStart, lte: todayEnd } }, select: { patientId: true } }),
    prisma.emergencyVisit.findMany({ where: { arrivalTime: { gte: todayStart, lte: todayEnd } }, select: { patientId: true } }),
    prisma.consultation.count({ where: { date: { gte: todayStart, lte: todayEnd } } }),
    prisma.financeTransaction.aggregate({
      _sum: { amount: true },
      where: { type: 'RECETTE', occurredAt: { gte: todayStart, lte: todayEnd } }
    }),
    bedOccupancySummary(),
    prisma.emergencyVisit.count({ where: { status: { in: ['EN_ATTENTE_TRIAGE', 'EN_COURS', 'EN_OBSERVATION'] } } }),
    prisma.emergencyVisit.count({
      where: { status: { in: ['EN_ATTENTE_TRIAGE', 'EN_COURS', 'EN_OBSERVATION'] }, severity: 'CRITIQUE' }
    }),
    prisma.surgery.count({ where: { scheduledAt: { gte: todayStart, lte: todayEnd }, status: { not: 'ANNULEE' } } }),
    prisma.labRequest.count({ where: { status: { in: ['EN_ATTENTE_PRELEVEMENT', 'EN_COURS'] } } }),
    prisma.imagingRequest.count({ where: { status: { in: ['EN_ATTENTE_LECTURE', 'EN_COURS'] } } }),
    prisma.pathologyRequest.count({ where: { status: { in: ['EN_ATTENTE_PRELEVEMENT', 'EN_COURS'] } } }),
    prisma.endoscopyProcedure.count({ where: { status: { in: ['PROGRAMME', 'EN_COURS'] } } }),
    prisma.medication.findMany({ select: { available: true, minThreshold: true } }),
    prisma.depotItem.findMany({ select: { available: true, minThreshold: true } }),
    prisma.financeTransaction.count({ where: { type: 'RECETTE', status: { not: 'PAYE' } } })
  ])

  const patientsToday = new Set(
    [...appointmentPatientIds, ...consultationPatientIds, ...emergencyPatientIds]
      .map((r) => r.patientId)
      .filter((id): id is string => id !== null)
  ).size

  const pharmacyRuptures = medications.filter((m) => m.available <= 0).length
  const depotRuptures = depotItems.filter((i) => i.available <= 0).length

  return {
    patientsToday,
    consultationsToday,
    revenueTodayFcfa: revenueToday._sum.amount ?? 0,
    bedOccupancyPercent: occupancy.total === 0 ? 0 : Math.round((occupancy.OCCUPIED / occupancy.total) * 100),
    emergenciesWaiting,
    criticalEmergencies,
    surgeriesToday,
    labResultsPending: labPending,
    pendingValidations: labPending + imagingPending + pathologyPending + endoscopyPending,
    pharmacyRuptures,
    stockRuptures: pharmacyRuptures + depotRuptures,
    unpaidReceipts
  }
}
