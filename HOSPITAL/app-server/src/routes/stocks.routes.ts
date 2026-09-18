import { Router } from 'express'
import { requireAccess, requireAuth } from '../middleware/auth.middleware'
import { createDepotItem, deleteDepotItem, listDepotItems, listDepots, updateDepotItem } from '../services/stocks.service'
import { logAudit } from '../services/audit.service'

export const stocksRouter = Router()

stocksRouter.use(requireAuth)
stocksRouter.use(requireAccess('stocks', 'read'))

stocksRouter.get('/depots', async (_req, res) => {
  const depots = await listDepots()
  res.json({ ok: true, depots })
})

stocksRouter.get('/', async (_req, res) => {
  const items = await listDepotItems()
  res.json({ ok: true, items })
})

stocksRouter.post('/', requireAccess('stocks', 'write'), async (req, res) => {
  const { name, category, depotId, available, minThreshold } = req.body ?? {}
  if (typeof name !== 'string' || !name.trim()) {
    res.status(400).json({ ok: false, error: 'Nom de l’article requis.' })
    return
  }
  if (typeof category !== 'string' || typeof depotId !== 'string' || typeof available !== 'number' || typeof minThreshold !== 'number') {
    res.status(400).json({ ok: false, error: 'Champs invalides.' })
    return
  }

  const item = await createDepotItem(req.body)
  await logAudit(req.auth!.userId, 'depot_item.create', 'DepotItem', item.id)
  res.status(201).json({ ok: true, item })
})

stocksRouter.patch('/:id', requireAccess('stocks', 'write'), async (req, res) => {
  const item = await updateDepotItem(req.params.id, req.body ?? {})
  await logAudit(req.auth!.userId, 'depot_item.update', 'DepotItem', item.id)
  res.json({ ok: true, item })
})

stocksRouter.delete('/:id', requireAccess('stocks', 'full'), async (req, res) => {
  await deleteDepotItem(req.params.id)
  await logAudit(req.auth!.userId, 'depot_item.delete', 'DepotItem', req.params.id)
  res.json({ ok: true })
})
