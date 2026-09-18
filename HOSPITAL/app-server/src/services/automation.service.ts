import { randomUUID } from 'crypto'
import { getPrismaClient } from '../db/client'
import { startOfToday, endOfToday } from './date-utils'
import type { AutomationLog, AutomationRule } from '../generated/prisma/client'

function toRule(r: AutomationRule) {
  return {
    id: r.id,
    name: r.name,
    trigger: r.trigger,
    action: r.action,
    category: r.category,
    active: r.active
  }
}

function toLog(l: AutomationLog & { rule: { name: string; category: string } }) {
  return {
    id: l.id,
    ruleId: l.ruleId,
    ruleName: l.rule.name,
    category: l.rule.category,
    runAt: l.runAt.toISOString(),
    success: l.success,
    detail: l.detail
  }
}

export async function listAutomationRules() {
  const prisma = getPrismaClient()
  const rules = await prisma.automationRule.findMany({ orderBy: { name: 'asc' } })
  return rules.map(toRule)
}

export async function listAutomationLogs() {
  const prisma = getPrismaClient()
  const logs = await prisma.automationLog.findMany({
    include: { rule: { select: { name: true, category: true } } },
    orderBy: { runAt: 'desc' },
    take: 50
  })
  return logs.map(toLog)
}

export async function toggleAutomationRule(id: string, active: boolean) {
  const prisma = getPrismaClient()
  const rule = await prisma.automationRule.update({ where: { id }, data: { active } })
  return toRule(rule)
}

interface RuleCheck {
  name: string
  category: 'RENDEZ_VOUS' | 'STOCKS' | 'LABORATOIRE' | 'FINANCES' | 'RH' | 'SOINS_PATIENTS'
  evaluate: () => Promise<string | null> // renvoie le detail du log si la règle se déclenche, sinon null
}

// Conditions réelles par règle, sur les vraies tables des autres domaines — voir §3.3 du plan
// Phase 6 (Phase6-Intelligence-Pilotage.md) pour la justification de chaque mapping.
async function buildChecks(): Promise<Record<string, RuleCheck['evaluate']>> {
  const prisma = getPrismaClient()
  const todayStart = startOfToday()
  const todayEnd = endOfToday()
  const in24h = new Date(Date.now() + 24 * 60 * 60 * 1000)
  const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

  return {
    'Alerte rupture de stock pharmacie': async () => {
      const ruptures = await prisma.medication.findMany({ where: { available: { lte: 0 } }, select: { name: true } })
      if (ruptures.length === 0) return null
      return `Alerte créée — ${ruptures.length} médicament(s) en rupture (${ruptures.map((m) => m.name).join(', ')})`
    },
    'Rappel de rendez-vous SMS': async () => {
      const upcoming = await prisma.appointment.count({
        where: { status: 'CONFIRME', date: { gte: new Date(), lte: in24h } }
      })
      if (upcoming === 0) return null
      return `[simulation] ${upcoming} rappel(s) SMS à envoyer pour les rendez-vous des prochaines 24h`
    },
    'Notification résultat critique': async () => {
      const critical = await prisma.labRequest.count({ where: { status: 'RESULTAT_VALIDE', priority: 'CRITIQUE' } })
      if (critical === 0) return null
      return `${critical} résultat(s) de laboratoire urgent(s) validé(s) — médecin(s) demandeur(s) à notifier`
    },
    'Relance facture impayée': async () => {
      const overdue = await prisma.financeTransaction.count({ where: { type: 'DEPENSE', status: 'EN_RETARD' } })
      if (overdue === 0) return null
      return `[simulation] ${overdue} facture(s) fournisseur en retard — relance à envoyer`
    },
    'Alerte péremption médicament': async () => {
      const expiring = await prisma.medication.findMany({
        where: { nearestExpiry: { not: null, lte: in30Days } },
        select: { name: true }
      })
      if (expiring.length === 0) return null
      return `Alerte créée — ${expiring.length} médicament(s) proche(s) de la péremption (< 30j) : ${expiring.map((m) => m.name).join(', ')}`
    },
    'Suivi post-hospitalisation': async () => {
      const discharged = await prisma.hospitalization.count({
        where: { status: 'SORTI', dischargeDate: { gte: todayStart, lte: todayEnd } }
      })
      if (discharged === 0) return null
      return `${discharged} patient(s) sorti(s) aujourd'hui — appel de suivi à J+7 à planifier`
    },
    'Alerte contrat arrivant à échéance': async () => {
      const expiring = await prisma.employee.count({
        where: { contractType: 'CDD', contractEndDate: { not: null, lte: in30Days } }
      })
      if (expiring === 0) return null
      return `${expiring} contrat(s) CDD arrivant à échéance sous 30 jours — Ressources Humaines à notifier`
    }
  }
}

// Un log par règle et par jour au maximum : évite de noyer le journal si une condition reste
// vraie pendant plusieurs cycles (ex. une rupture de stock non résolue depuis 3 jours ne doit
// pas générer 3 x 96 lignes avec un cycle de 15 min).
async function alreadyLoggedToday(ruleId: string): Promise<boolean> {
  const prisma = getPrismaClient()
  const existing = await prisma.automationLog.findFirst({
    where: { ruleId, runAt: { gte: startOfToday(), lte: endOfToday() } },
    select: { id: true }
  })
  return existing !== null
}

export async function evaluateAutomationRules(): Promise<number> {
  const prisma = getPrismaClient()
  const checks = await buildChecks()
  const rules = await prisma.automationRule.findMany({ where: { active: true } })

  let firedCount = 0
  for (const rule of rules) {
    const check = checks[rule.name]
    if (!check) continue
    if (await alreadyLoggedToday(rule.id)) continue

    const detail = await check()
    if (detail === null) continue

    await prisma.automationLog.create({
      data: { id: randomUUID(), ruleId: rule.id, success: true, detail }
    })
    firedCount += 1
  }
  return firedCount
}
