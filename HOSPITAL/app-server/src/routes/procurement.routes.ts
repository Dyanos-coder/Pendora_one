import { Router } from 'express'
import { requireAccess, requireAuth } from '../middleware/auth.middleware'
import {
  createProcurementRequest,
  deleteProcurementRequest,
  listProcurementRequests,
  listSuppliers,
  updateProcurementRequest
} from '../services/procurement.service'
import { logAudit } from '../services/audit.service'

export const procurementRouter = Router()

procurementRouter.use(requireAuth)
procurementRouter.use(requireAccess('procurement', 'read'))

procurementRouter.get('/', async (_req, res) => {
  const requests = await listProcurementRequests()
  res.json({ ok: true, requests })
})

procurementRouter.get('/suppliers', async (_req, res) => {
  const suppliers = await listSuppliers()
  res.json({ ok: true, suppliers })
})

procurementRouter.post('/', requireAccess('procurement', 'write'), async (req, res) => {
  const { article, category, quantity, requester } = req.body ?? {}
  if (typeof article !== 'string' || !article.trim()) {
    res.status(400).json({ ok: false, error: 'Article requis.' })
    return
  }
  if (typeof category !== 'string' || typeof quantity !== 'number' || typeof requester !== 'string') {
    res.status(400).json({ ok: false, error: 'Champs invalides.' })
    return
  }

  const request = await createProcurementRequest(req.body)
  await logAudit(req.auth!.userId, 'procurement_request.create', 'ProcurementRequest', request.id)
  res.status(201).json({ ok: true, request })
})

procurementRouter.patch('/:id', requireAccess('procurement', 'write'), async (req, res) => {
  const request = await updateProcurementRequest(req.params.id, req.body ?? {})
  await logAudit(req.auth!.userId, 'procurement_request.update', 'ProcurementRequest', request.id)
  res.json({ ok: true, request })
})

procurementRouter.delete('/:id', requireAccess('procurement', 'full'), async (req, res) => {
  await deleteProcurementRequest(req.params.id)
  await logAudit(req.auth!.userId, 'procurement_request.delete', 'ProcurementRequest', req.params.id)
  res.json({ ok: true })
})
