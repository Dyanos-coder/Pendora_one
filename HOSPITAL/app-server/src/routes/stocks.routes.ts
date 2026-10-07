import { Router } from 'express'
import { requireAccess, requireAuth } from '../middleware/auth.middleware'
import { createDepotItem, deleteDepotItem, exportDepotItems, listDepotItems, listDepots, updateDepotItem } from '../services/stocks.service'
import {
  createStockMovement,
  deleteStockMovement,
  listStockMovements,
  updateStockMovement
} from '../services/stock-movements.service'
import { createStockTransfer, deleteStockTransfer, listStockTransfers, updateStockTransfer } from '../services/stock-transfers.service'
import {
  createInventoryCount,
  deleteInventoryCount,
  listInventoryCounts,
  updateInventoryCount
} from '../services/inventory-counts.service'
import { createStockLoss, deleteStockLoss, listStockLosses, updateStockLoss } from '../services/stock-losses.service'
import { getStockAnalysis } from '../services/stocks-analysis.service'
import { logAudit } from '../services/audit.service'

export const stocksRouter = Router()

stocksRouter.use(requireAuth)
stocksRouter.use(requireAccess('stocks', 'read'))

// Doit rester avant toute route GET /:id du même routeur (aucune ici, mais gardé en tête par
// précaution, item 10).
stocksRouter.get('/export', async (_req, res) => {
  const document = await exportDepotItems()
  res.json({ ok: true, document })
})

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

// --- Mouvements (item 16) ---------------------------------------------------------------------------

stocksRouter.get('/movements', async (_req, res) => {
  const movements = await listStockMovements()
  res.json({ ok: true, movements })
})

stocksRouter.post('/movements', requireAccess('stocks', 'write'), async (req, res) => {
  const { itemId, type, quantity, performedBy } = req.body ?? {}
  if (
    typeof itemId !== 'string' ||
    !itemId.trim() ||
    (type !== 'ENTREE' && type !== 'SORTIE') ||
    typeof quantity !== 'number' ||
    typeof performedBy !== 'string' ||
    !performedBy.trim()
  ) {
    res.status(400).json({ ok: false, error: 'Champs invalides.' })
    return
  }

  const movement = await createStockMovement(req.body)
  await logAudit(req.auth!.userId, 'stockMovement.create', 'StockMovement', movement.id)
  res.status(201).json({ ok: true, movement })
})

stocksRouter.patch('/movements/:id', requireAccess('stocks', 'write'), async (req, res) => {
  const movement = await updateStockMovement(req.params.id, req.body ?? {})
  await logAudit(req.auth!.userId, 'stockMovement.update', 'StockMovement', movement.id)
  res.json({ ok: true, movement })
})

stocksRouter.delete('/movements/:id', requireAccess('stocks', 'full'), async (req, res) => {
  await deleteStockMovement(req.params.id)
  await logAudit(req.auth!.userId, 'stockMovement.delete', 'StockMovement', req.params.id)
  res.json({ ok: true })
})

// --- Transferts (item 16) ---------------------------------------------------------------------------

stocksRouter.get('/transfers', async (_req, res) => {
  const transfers = await listStockTransfers()
  res.json({ ok: true, transfers })
})

stocksRouter.post('/transfers', requireAccess('stocks', 'write'), async (req, res) => {
  const { fromItemId, toDepotId, quantity, performedBy } = req.body ?? {}
  if (
    typeof fromItemId !== 'string' ||
    !fromItemId.trim() ||
    typeof toDepotId !== 'string' ||
    !toDepotId.trim() ||
    typeof quantity !== 'number' ||
    typeof performedBy !== 'string' ||
    !performedBy.trim()
  ) {
    res.status(400).json({ ok: false, error: 'Champs invalides.' })
    return
  }

  const transfer = await createStockTransfer(req.body)
  await logAudit(req.auth!.userId, 'stockTransfer.create', 'StockTransfer', transfer.id)
  res.status(201).json({ ok: true, transfer })
})

stocksRouter.patch('/transfers/:id', requireAccess('stocks', 'write'), async (req, res) => {
  const transfer = await updateStockTransfer(req.params.id, req.body ?? {})
  await logAudit(req.auth!.userId, 'stockTransfer.update', 'StockTransfer', transfer.id)
  res.json({ ok: true, transfer })
})

stocksRouter.delete('/transfers/:id', requireAccess('stocks', 'full'), async (req, res) => {
  await deleteStockTransfer(req.params.id)
  await logAudit(req.auth!.userId, 'stockTransfer.delete', 'StockTransfer', req.params.id)
  res.json({ ok: true })
})

// --- Inventaires (item 16) --------------------------------------------------------------------------

stocksRouter.get('/inventory-counts', async (_req, res) => {
  const counts = await listInventoryCounts()
  res.json({ ok: true, counts })
})

stocksRouter.post('/inventory-counts', requireAccess('stocks', 'write'), async (req, res) => {
  const { itemId, countedQuantity, conductedBy } = req.body ?? {}
  if (
    typeof itemId !== 'string' ||
    !itemId.trim() ||
    typeof countedQuantity !== 'number' ||
    typeof conductedBy !== 'string' ||
    !conductedBy.trim()
  ) {
    res.status(400).json({ ok: false, error: 'Champs invalides.' })
    return
  }

  const count = await createInventoryCount(req.body)
  await logAudit(req.auth!.userId, 'inventoryCount.create', 'InventoryCount', count.id)
  res.status(201).json({ ok: true, count })
})

stocksRouter.patch('/inventory-counts/:id', requireAccess('stocks', 'write'), async (req, res) => {
  const count = await updateInventoryCount(req.params.id, req.body ?? {})
  await logAudit(req.auth!.userId, 'inventoryCount.update', 'InventoryCount', count.id)
  res.json({ ok: true, count })
})

stocksRouter.delete('/inventory-counts/:id', requireAccess('stocks', 'full'), async (req, res) => {
  await deleteInventoryCount(req.params.id)
  await logAudit(req.auth!.userId, 'inventoryCount.delete', 'InventoryCount', req.params.id)
  res.json({ ok: true })
})

// --- Pertes / Retour (item 16) -----------------------------------------------------------------------

stocksRouter.get('/losses', async (_req, res) => {
  const losses = await listStockLosses()
  res.json({ ok: true, losses })
})

stocksRouter.post('/losses', requireAccess('stocks', 'write'), async (req, res) => {
  const { itemId, type, quantity, reason, reportedBy } = req.body ?? {}
  if (
    typeof itemId !== 'string' ||
    !itemId.trim() ||
    (type !== 'PERTE' && type !== 'RETOUR') ||
    typeof quantity !== 'number' ||
    typeof reason !== 'string' ||
    !reason.trim() ||
    typeof reportedBy !== 'string' ||
    !reportedBy.trim()
  ) {
    res.status(400).json({ ok: false, error: 'Champs invalides.' })
    return
  }

  const loss = await createStockLoss(req.body)
  await logAudit(req.auth!.userId, 'stockLoss.create', 'StockLoss', loss.id)
  res.status(201).json({ ok: true, loss })
})

stocksRouter.patch('/losses/:id', requireAccess('stocks', 'write'), async (req, res) => {
  const loss = await updateStockLoss(req.params.id, req.body ?? {})
  await logAudit(req.auth!.userId, 'stockLoss.update', 'StockLoss', loss.id)
  res.json({ ok: true, loss })
})

stocksRouter.delete('/losses/:id', requireAccess('stocks', 'full'), async (req, res) => {
  await deleteStockLoss(req.params.id)
  await logAudit(req.auth!.userId, 'stockLoss.delete', 'StockLoss', req.params.id)
  res.json({ ok: true })
})

// --- Analyse (item 16, lecture seule) -----------------------------------------------------------------

stocksRouter.get('/analysis', async (_req, res) => {
  const analysis = await getStockAnalysis()
  res.json({ ok: true, analysis })
})
