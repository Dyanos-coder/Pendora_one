import { Router } from 'express'
import { requireAccess, requireAuth } from '../middleware/auth.middleware'
import {
  createProcurementRequest,
  deleteProcurementRequest,
  exportProcurementRequests,
  listProcurementRequests,
  listSuppliers,
  updateProcurementRequest
} from '../services/procurement.service'
import {
  createPurchaseOrder,
  deletePurchaseOrder,
  listPurchaseOrders,
  updatePurchaseOrder
} from '../services/procurement-orders.service'
import {
  createGoodsReception,
  deleteGoodsReception,
  listGoodsReceptions,
  updateGoodsReception
} from '../services/procurement-receptions.service'
import { logAudit } from '../services/audit.service'

export const procurementRouter = Router()

procurementRouter.use(requireAuth)
procurementRouter.use(requireAccess('procurement', 'read'))

// Doit rester avant toute route GET /:id du même routeur (aucune ici, mais gardé en tête par
// précaution, item 10).
procurementRouter.get('/export', async (_req, res) => {
  const document = await exportProcurementRequests()
  res.json({ ok: true, document })
})

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

// --- Commandes (item 13) ------------------------------------------------------------------------

procurementRouter.get('/orders', async (_req, res) => {
  const orders = await listPurchaseOrders()
  res.json({ ok: true, orders })
})

procurementRouter.post('/orders', requireAccess('procurement', 'write'), async (req, res) => {
  const { article, quantity } = req.body ?? {}
  if (typeof article !== 'string' || !article.trim() || typeof quantity !== 'number') {
    res.status(400).json({ ok: false, error: 'Article et quantité requis.' })
    return
  }

  const order = await createPurchaseOrder(req.body)
  await logAudit(req.auth!.userId, 'purchaseOrder.create', 'PurchaseOrder', order.id)
  res.status(201).json({ ok: true, order })
})

procurementRouter.patch('/orders/:id', requireAccess('procurement', 'write'), async (req, res) => {
  const order = await updatePurchaseOrder(req.params.id, req.body ?? {})
  await logAudit(req.auth!.userId, 'purchaseOrder.update', 'PurchaseOrder', order.id)
  res.json({ ok: true, order })
})

procurementRouter.delete('/orders/:id', requireAccess('procurement', 'full'), async (req, res) => {
  await deletePurchaseOrder(req.params.id)
  await logAudit(req.auth!.userId, 'purchaseOrder.delete', 'PurchaseOrder', req.params.id)
  res.json({ ok: true })
})

// --- Réceptions (item 13) -----------------------------------------------------------------------

procurementRouter.get('/receptions', async (_req, res) => {
  const receptions = await listGoodsReceptions()
  res.json({ ok: true, receptions })
})

procurementRouter.post('/receptions', requireAccess('procurement', 'write'), async (req, res) => {
  const { orderId, receivedQty, receivedBy } = req.body ?? {}
  if (typeof orderId !== 'string' || !orderId.trim() || typeof receivedQty !== 'number' || typeof receivedBy !== 'string' || !receivedBy.trim()) {
    res.status(400).json({ ok: false, error: 'Champs invalides.' })
    return
  }

  const reception = await createGoodsReception(req.body)
  await logAudit(req.auth!.userId, 'goodsReception.create', 'GoodsReception', reception.id)
  res.status(201).json({ ok: true, reception })
})

procurementRouter.patch('/receptions/:id', requireAccess('procurement', 'write'), async (req, res) => {
  const reception = await updateGoodsReception(req.params.id, req.body ?? {})
  await logAudit(req.auth!.userId, 'goodsReception.update', 'GoodsReception', reception.id)
  res.json({ ok: true, reception })
})

procurementRouter.delete('/receptions/:id', requireAccess('procurement', 'full'), async (req, res) => {
  await deleteGoodsReception(req.params.id)
  await logAudit(req.auth!.userId, 'goodsReception.delete', 'GoodsReception', req.params.id)
  res.json({ ok: true })
})
