import { Router } from 'express'
import { requireAccess, requireAuth } from '../middleware/auth.middleware'
import { getDashboardSummary } from '../services/dashboard.service'

export const dashboardRouter = Router()

dashboardRouter.use(requireAuth)
dashboardRouter.use(requireAccess('dashboard', 'read'))

dashboardRouter.get('/summary', async (_req, res) => {
  const summary = await getDashboardSummary()
  res.json({ ok: true, summary })
})
