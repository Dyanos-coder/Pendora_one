import { getPrismaClient } from '../db/client'

export type AlertCategory = 'Stock' | 'Financier'
export type AlertSeverity = 'Info' | 'Attention' | 'Critique'

export interface CalculatedAlert {
  id: string
  title: string
  category: AlertCategory
  severity: AlertSeverity
  detail: string
  recommendedAction: string
}

// Remplace les « prédictions » à confiance inventée du mock front par de vraies alertes
// calculées sur l'état actuel des données — voir Phase6-Intelligence-Pilotage.md §3.4 pour la
// liste des 4 prédictions du mock supprimées faute d'historique permettant de les calculer
// honnêtement (réadmission, affluence, anomalie de conso, temps d'attente).
export async function listCalculatedAlerts(): Promise<CalculatedAlert[]> {
  const prisma = getPrismaClient()
  const alerts: CalculatedAlert[] = []

  const [medications, depotItems, overdueTransactions, pendingTransactions] = await Promise.all([
    prisma.medication.findMany({ select: { id: true, name: true, available: true, minThreshold: true, location: true } }),
    prisma.depotItem.findMany({
      select: { id: true, name: true, available: true, minThreshold: true, depot: { select: { name: true } } }
    }),
    prisma.financeTransaction.findMany({
      where: { type: 'DEPENSE', status: 'EN_RETARD' },
      select: { id: true, reference: true, party: true, amount: true }
    }),
    prisma.financeTransaction.findMany({
      where: { type: 'DEPENSE', status: 'EN_ATTENTE' },
      select: { id: true, reference: true, party: true, amount: true }
    })
  ])

  for (const m of medications) {
    if (m.available <= 0) {
      alerts.push({
        id: `med-rupture-${m.id}`,
        title: `Rupture de stock — ${m.name}`,
        category: 'Stock',
        severity: 'Critique',
        detail: `Le stock de ${m.name} (${m.location}) est à 0.`,
        recommendedAction: 'Valider ou créer une demande urgente dans Approvisionnement.'
      })
    } else if (m.available < m.minThreshold) {
      alerts.push({
        id: `med-faible-${m.id}`,
        title: `Stock faible — ${m.name}`,
        category: 'Stock',
        severity: 'Attention',
        detail: `${m.name} (${m.location}) : ${m.available} unité(s) disponible(s) pour un seuil de ${m.minThreshold}.`,
        recommendedAction: 'Anticiper une demande de réapprovisionnement.'
      })
    }
  }

  for (const i of depotItems) {
    if (i.available <= 0) {
      alerts.push({
        id: `depot-rupture-${i.id}`,
        title: `Rupture de stock — ${i.name}`,
        category: 'Stock',
        severity: 'Critique',
        detail: `Le stock de ${i.name} (${i.depot.name}) est à 0.`,
        recommendedAction: 'Valider ou créer une demande urgente dans Approvisionnement.'
      })
    } else if (i.available < i.minThreshold) {
      alerts.push({
        id: `depot-faible-${i.id}`,
        title: `Stock faible — ${i.name}`,
        category: 'Stock',
        severity: 'Attention',
        detail: `${i.name} (${i.depot.name}) : ${i.available} unité(s) disponible(s) pour un seuil de ${i.minThreshold}.`,
        recommendedAction: 'Anticiper une demande de réapprovisionnement.'
      })
    }
  }

  for (const t of overdueTransactions) {
    alerts.push({
      id: `finance-retard-${t.id}`,
      title: `Facture en retard — ${t.party}`,
      category: 'Financier',
      severity: 'Critique',
      detail: `La facture ${t.reference} (${t.party}, ${t.amount.toLocaleString('fr-FR')} FCFA) est en retard de paiement.`,
      recommendedAction: 'Prioriser le règlement ou contacter le fournisseur.'
    })
  }

  for (const t of pendingTransactions) {
    alerts.push({
      id: `finance-attente-${t.id}`,
      title: `Facture en attente — ${t.party}`,
      category: 'Financier',
      severity: 'Info',
      detail: `La facture ${t.reference} (${t.party}, ${t.amount.toLocaleString('fr-FR')} FCFA) n'est pas encore réglée.`,
      recommendedAction: 'Suivre son échéance dans Finances.'
    })
  }

  return alerts
}
