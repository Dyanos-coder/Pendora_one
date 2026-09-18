import { Router } from 'express'
import { requireAuth } from '../middleware/auth.middleware'
import { createSale, getSalesSummary, InsufficientStockError, listSales } from '../services/sales.service'
import { logAudit } from '../services/audit.service'

export const salesRouter = Router()

salesRouter.use(requireAuth)

salesRouter.get('/transactions', async (req, res) => {
  const page = Number(req.query['page'] ?? 1)
  const result = await listSales(page)
  res.json({ ok: true, ...result })
})

salesRouter.post('/transactions', async (req, res) => {
  const { clientName, stockItemId, quantity, amount, status } = req.body ?? {}

  if (
    typeof clientName !== 'string' ||
    typeof stockItemId !== 'string' ||
    typeof quantity !== 'number' ||
    quantity <= 0 ||
    typeof amount !== 'number' ||
    !['PAYE', 'EN_ATTENTE'].includes(status)
  ) {
    res.status(400).json({ ok: false, error: 'Champs invalides.' })
    return
  }

  try {
    const sale = await createSale({ clientName, stockItemId, quantity, amount, status })
    await logAudit(req.auth!.userId, 'sales.sale.create', 'Sale', sale.id)
    res.status(201).json({ ok: true, sale })
  } catch (err) {
    if (err instanceof InsufficientStockError) {
      res.status(409).json({ ok: false, error: err.message })
      return
    }
    throw err
  }
})

salesRouter.get('/summary', async (_req, res) => {
  const summary = await getSalesSummary()
  res.json({ ok: true, ...summary })
})
