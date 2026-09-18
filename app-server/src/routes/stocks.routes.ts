import { Router } from 'express'
import { requireAuth } from '../middleware/auth.middleware'
import { createStockItem, getStocksSummary, listStockItems } from '../services/stocks.service'
import { logAudit } from '../services/audit.service'

export const stocksRouter = Router()

stocksRouter.use(requireAuth)

stocksRouter.get('/items', async (req, res) => {
  const search = typeof req.query['search'] === 'string' ? req.query['search'] : undefined
  const items = await listStockItems(search)
  res.json({ ok: true, items })
})

stocksRouter.post('/items', async (req, res) => {
  const { name, sku, category, quantity, threshold, unitPrice } = req.body ?? {}

  if (
    typeof name !== 'string' ||
    typeof sku !== 'string' ||
    typeof category !== 'string' ||
    typeof quantity !== 'number' ||
    typeof threshold !== 'number' ||
    typeof unitPrice !== 'number'
  ) {
    res.status(400).json({ ok: false, error: 'Champs invalides.' })
    return
  }

  try {
    const item = await createStockItem({ name, sku, category, quantity, threshold, unitPrice })
    await logAudit(req.auth!.userId, 'stocks.item.create', 'StockItem', item.id)
    res.status(201).json({ ok: true, item })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && err.code === 'P2002') {
      res.status(409).json({ ok: false, error: 'Ce SKU existe déjà.' })
      return
    }
    throw err
  }
})

stocksRouter.get('/summary', async (_req, res) => {
  const summary = await getStocksSummary()
  res.json({ ok: true, ...summary })
})
