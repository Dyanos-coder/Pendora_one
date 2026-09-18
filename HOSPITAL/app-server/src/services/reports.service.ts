import { randomUUID } from 'crypto'
import { getPrismaClient } from '../db/client'
import type { GeneratedReport, ReportCategory } from '../generated/prisma/client'

const CATEGORY_LABEL: Record<ReportCategory, string> = {
  ACTIVITE_MEDICALE: 'Activité médicale',
  FINANCES: 'Finances',
  RESSOURCES_HUMAINES: 'Ressources Humaines',
  QUALITE_CONFORMITE: 'Qualité & Conformité',
  STOCKS_ACHATS: 'Stocks & Achats'
}

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0])
  const escape = (v: unknown): string => {
    const s = v === null || v === undefined ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines = [headers.join(','), ...rows.map((r) => headers.map((h) => escape(r[h])).join(','))]
  return lines.join('\n')
}

async function buildCsv(category: ReportCategory): Promise<string> {
  const prisma = getPrismaClient()

  switch (category) {
    case 'ACTIVITE_MEDICALE': {
      const rows = await prisma.consultation.findMany({
        include: { patient: { select: { firstName: true, lastName: true } }, doctor: { select: { firstName: true, lastName: true } } },
        orderBy: { date: 'desc' }
      })
      return toCsv(
        rows.map((c) => ({
          dossier: c.dossier,
          date: c.date.toISOString(),
          service: c.service ?? '',
          motif: c.motive ?? '',
          statut: c.status,
          patient: c.patient ? `${c.patient.lastName} ${c.patient.firstName}` : (c.patientName ?? ''),
          medecin: c.doctor ? `${c.doctor.lastName} ${c.doctor.firstName}` : ''
        }))
      )
    }
    case 'FINANCES': {
      const rows = await prisma.financeTransaction.findMany({ orderBy: { occurredAt: 'desc' } })
      return toCsv(
        rows.map((t) => ({
          reference: t.reference,
          date: t.occurredAt.toISOString(),
          type: t.type,
          tiers: t.party,
          categorie: t.category,
          montant: t.amount,
          statut: t.status
        }))
      )
    }
    case 'RESSOURCES_HUMAINES': {
      const rows = await prisma.employee.findMany({ where: { isActive: true }, orderBy: { lastName: 'asc' } })
      return toCsv(
        rows.map((e) => ({
          matricule: e.matricule ?? '',
          nom: `${e.lastName} ${e.firstName}`,
          specialite: e.specialty ?? '',
          contrat: e.contractType ?? '',
          statutJour: e.dailyStatus ?? '',
          joursPresents: e.presentDays ?? '',
          joursAbsents: e.absentDays ?? ''
        }))
      )
    }
    case 'QUALITE_CONFORMITE': {
      const rows = await prisma.qualityIndicator.findMany({ orderBy: { name: 'asc' } })
      return toCsv(
        rows.map((i) => ({
          indicateur: i.name,
          categorie: i.category,
          valeur: i.currentValue,
          cible: i.target,
          statut: i.status,
          mesureLe: i.lastMeasuredAt.toISOString()
        }))
      )
    }
    case 'STOCKS_ACHATS': {
      const rows = await prisma.procurementRequest.findMany({ orderBy: { requestedAt: 'desc' } })
      return toCsv(
        rows.map((r) => ({
          reference: r.reference,
          date: r.requestedAt.toISOString(),
          article: r.article,
          categorie: r.category,
          quantite: r.quantity,
          priorite: r.priority,
          statut: r.status,
          demandeur: r.requester
        }))
      )
    }
  }
}

function toDisplay(r: GeneratedReport) {
  return {
    id: r.id,
    category: r.category,
    title: r.title,
    format: r.format,
    generatedAt: r.generatedAt.toISOString()
  }
}

export async function reportCategoryCounts() {
  const prisma = getPrismaClient()
  const counts = await prisma.generatedReport.groupBy({ by: ['category'], _count: { _all: true } })
  const byCategory = new Map(counts.map((c) => [c.category, c._count._all]))
  return (Object.keys(CATEGORY_LABEL) as ReportCategory[]).map((category) => ({
    category,
    label: CATEGORY_LABEL[category],
    count: byCategory.get(category) ?? 0
  }))
}

export async function listGeneratedReports() {
  const prisma = getPrismaClient()
  const reports = await prisma.generatedReport.findMany({ orderBy: { generatedAt: 'desc' }, take: 20 })
  return reports.map(toDisplay)
}

export async function generateReport(category: ReportCategory) {
  const prisma = getPrismaClient()
  const csv = await buildCsv(category)
  const title = `Rapport ${CATEGORY_LABEL[category]} — ${new Date().toLocaleDateString('fr-FR')}`

  const report = await prisma.generatedReport.create({
    data: { id: randomUUID(), category, title, format: 'CSV', content: Buffer.from(csv, 'utf-8') }
  })
  return toDisplay(report)
}

export async function getReportContent(id: string) {
  const prisma = getPrismaClient()
  const report = await prisma.generatedReport.findUnique({ where: { id } })
  if (!report) return null
  return { title: report.title, format: report.format, contentBase64: Buffer.from(report.content).toString('base64') }
}

export async function departmentComparison() {
  const prisma = getPrismaClient()
  const counts = await prisma.consultation.groupBy({ by: ['service'], _count: { _all: true } })
  return counts
    .filter((c) => c.service !== null)
    .map((c) => ({ label: c.service as string, count: c._count._all }))
    .sort((a, b) => b.count - a.count)
}
