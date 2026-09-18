import { Router } from 'express'
import { requireAccess, requireAuth } from '../middleware/auth.middleware'
import {
  departmentComparison,
  generateReport,
  getReportContent,
  listGeneratedReports,
  reportCategoryCounts
} from '../services/reports.service'
import { logAudit } from '../services/audit.service'
import type { ReportCategory } from '../generated/prisma/client'

const CATEGORIES: ReportCategory[] = ['ACTIVITE_MEDICALE', 'FINANCES', 'RESSOURCES_HUMAINES', 'QUALITE_CONFORMITE', 'STOCKS_ACHATS']

export const reportsRouter = Router()

reportsRouter.use(requireAuth)
reportsRouter.use(requireAccess('reports', 'read'))

reportsRouter.get('/', async (_req, res) => {
  const [categories, reports] = await Promise.all([reportCategoryCounts(), listGeneratedReports()])
  res.json({ ok: true, categories, reports })
})

reportsRouter.get('/department-comparison', async (_req, res) => {
  const departments = await departmentComparison()
  res.json({ ok: true, departments })
})

reportsRouter.post('/', requireAccess('reports', 'write'), async (req, res) => {
  const { category } = req.body ?? {}
  if (typeof category !== 'string' || !(CATEGORIES as string[]).includes(category)) {
    res.status(400).json({ ok: false, error: 'Catégorie de rapport invalide.' })
    return
  }

  const report = await generateReport(category as ReportCategory)
  await logAudit(req.auth!.userId, 'report.generate', 'GeneratedReport', report.id)
  res.status(201).json({ ok: true, report })
})

reportsRouter.get('/:id/content', async (req, res) => {
  const content = await getReportContent(req.params.id)
  if (!content) {
    res.status(404).json({ ok: false, error: 'Rapport introuvable.' })
    return
  }
  res.json({ ok: true, ...content })
})
