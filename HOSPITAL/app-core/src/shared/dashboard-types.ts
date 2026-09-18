// Types partagés entre main, preload et renderer pour le Tableau de bord (Centre de Commandement).

export interface ApiDashboardSummary {
  patientsToday: number
  consultationsToday: number
  revenueTodayFcfa: number
  bedOccupancyPercent: number
  emergenciesWaiting: number
  criticalEmergencies: number
  surgeriesToday: number
  labResultsPending: number
  pendingValidations: number
  pharmacyRuptures: number
  stockRuptures: number
  unpaidReceipts: number
}
