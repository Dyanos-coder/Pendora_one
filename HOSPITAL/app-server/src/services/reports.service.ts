import { randomUUID } from 'crypto'
import { getPrismaClient } from '../db/client'
import { buildXlsxDocument, type XlsxColumn } from './xlsx-export'
import type { GeneratedReport, ReportCategory } from '../generated/prisma/client'

const CATEGORY_LABEL: Record<ReportCategory, string> = {
  ACTIVITE_MEDICALE: 'Activité médicale',
  FINANCES: 'Finances',
  RESSOURCES_HUMAINES: 'Ressources Humaines',
  QUALITE_CONFORMITE: 'Qualité & Conformité',
  STOCKS_ACHATS: 'Stocks & Achats'
}

interface ReportSheet {
  columns: XlsxColumn[]
  rows: Record<string, unknown>[]
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('fr-FR')
}

// Rapports « Rapports & Analyse » — générés en Excel mis en forme (item 16 PETITES MODIFS, même
// gabarit que tous les exports via buildXlsxDocument) plutôt qu'en CSV brut. Les rapports déjà
// générés en CSV restent téléchargeables tels quels (le format est stocké avec le contenu).
async function buildSheet(category: ReportCategory): Promise<ReportSheet> {
  const prisma = getPrismaClient()

  switch (category) {
    case 'ACTIVITE_MEDICALE': {
      const rows = await prisma.consultation.findMany({
        where: { deletedAt: null },
        include: { patient: { select: { firstName: true, lastName: true } }, doctor: { select: { firstName: true, lastName: true } } },
        orderBy: { date: 'desc' }
      })
      return {
        columns: [
          { header: 'Dossier', key: 'dossier', width: 16 },
          { header: 'Date', key: 'date', width: 12 },
          { header: 'Service', key: 'service', width: 18 },
          { header: 'Motif', key: 'motif', width: 28 },
          { header: 'Statut', key: 'statut', width: 14 },
          { header: 'Patient', key: 'patient', width: 24 },
          { header: 'Médecin', key: 'medecin', width: 22 }
        ],
        rows: rows.map((c) => ({
          dossier: c.dossier,
          date: formatDate(c.date),
          service: c.service ?? '',
          motif: c.motive ?? '',
          statut: c.status,
          patient: c.patient ? `${c.patient.lastName} ${c.patient.firstName}` : (c.patientName ?? ''),
          medecin: c.doctor ? `Dr ${c.doctor.lastName} ${c.doctor.firstName}` : ''
        }))
      }
    }
    case 'FINANCES': {
      const rows = await prisma.financeTransaction.findMany({ where: { deletedAt: null }, orderBy: { occurredAt: 'desc' } })
      return {
        columns: [
          { header: 'Référence', key: 'reference', width: 16 },
          { header: 'Date', key: 'date', width: 12 },
          { header: 'Type', key: 'type', width: 12 },
          { header: 'Tiers', key: 'tiers', width: 24 },
          { header: 'Catégorie', key: 'categorie', width: 18 },
          { header: 'Montant (FCFA)', key: 'montant', width: 16 },
          { header: 'Statut', key: 'statut', width: 14 }
        ],
        rows: rows.map((t) => ({
          reference: t.reference,
          date: formatDate(t.occurredAt),
          type: t.type,
          tiers: t.party,
          categorie: t.category,
          montant: t.amount,
          statut: t.status
        }))
      }
    }
    case 'RESSOURCES_HUMAINES': {
      const rows = await prisma.employee.findMany({ where: { isActive: true }, orderBy: { lastName: 'asc' } })
      return {
        columns: [
          { header: 'Matricule', key: 'matricule', width: 14 },
          { header: 'Nom', key: 'nom', width: 26 },
          { header: 'Spécialité', key: 'specialite', width: 20 },
          { header: 'Contrat', key: 'contrat', width: 12 },
          { header: 'Statut du jour', key: 'statutJour', width: 16 },
          { header: 'Jours présents', key: 'joursPresents', width: 14 },
          { header: 'Jours absents', key: 'joursAbsents', width: 14 }
        ],
        rows: rows.map((e) => ({
          matricule: e.matricule ?? '',
          nom: `${e.lastName} ${e.firstName}`,
          specialite: e.specialty ?? '',
          contrat: e.contractType ?? '',
          statutJour: e.dailyStatus ?? '',
          joursPresents: e.presentDays ?? '',
          joursAbsents: e.absentDays ?? ''
        }))
      }
    }
    case 'QUALITE_CONFORMITE': {
      const rows = await prisma.qualityIndicator.findMany({ orderBy: { name: 'asc' } })
      return {
        columns: [
          { header: 'Indicateur', key: 'indicateur', width: 32 },
          { header: 'Catégorie', key: 'categorie', width: 18 },
          { header: 'Valeur', key: 'valeur', width: 12 },
          { header: 'Cible', key: 'cible', width: 12 },
          { header: 'Statut', key: 'statut', width: 14 },
          { header: 'Mesuré le', key: 'mesureLe', width: 14 }
        ],
        rows: rows.map((i) => ({
          indicateur: i.name,
          categorie: i.category,
          valeur: i.currentValue,
          cible: i.target,
          statut: i.status,
          mesureLe: formatDate(i.lastMeasuredAt)
        }))
      }
    }
    case 'STOCKS_ACHATS': {
      const rows = await prisma.procurementRequest.findMany({ where: { deletedAt: null }, orderBy: { requestedAt: 'desc' } })
      return {
        columns: [
          { header: 'Référence', key: 'reference', width: 16 },
          { header: 'Date', key: 'date', width: 12 },
          { header: 'Article', key: 'article', width: 28 },
          { header: 'Catégorie', key: 'categorie', width: 18 },
          { header: 'Quantité', key: 'quantite', width: 12 },
          { header: 'Priorité', key: 'priorite', width: 12 },
          { header: 'Statut', key: 'statut', width: 14 },
          { header: 'Demandeur', key: 'demandeur', width: 22 }
        ],
        rows: rows.map((r) => ({
          reference: r.reference,
          date: formatDate(r.requestedAt),
          article: r.article,
          categorie: r.category,
          quantite: r.quantity,
          priorite: r.priority,
          statut: r.status,
          demandeur: r.requester
        }))
      }
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
  const sheet = await buildSheet(category)
  const title = `Rapport ${CATEGORY_LABEL[category]} — ${new Date().toLocaleDateString('fr-FR')}`
  const workbook = await buildXlsxDocument(title, CATEGORY_LABEL[category], sheet.columns, sheet.rows)

  const report = await prisma.generatedReport.create({
    data: { id: randomUUID(), category, title, format: 'XLSX', content: Buffer.from(workbook.contentBase64, 'base64') }
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
