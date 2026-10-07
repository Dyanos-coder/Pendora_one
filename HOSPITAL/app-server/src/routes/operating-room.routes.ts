import { Router } from 'express'
import { requireAccess, requireAuth } from '../middleware/auth.middleware'
import { createSurgery, deleteSurgery, exportSurgeries, listSurgeries, updateSurgery } from '../services/surgeries.service'
import { listOperatingRooms } from '../services/operating-rooms.service'
import { logAudit } from '../services/audit.service'

export const operatingRoomRouter = Router()

operatingRoomRouter.use(requireAuth)
operatingRoomRouter.use(requireAccess('operating-room', 'read'))

// Doit rester avant toute route GET /:id du même routeur.
operatingRoomRouter.get('/export', async (_req, res) => {
  const document = await exportSurgeries()
  res.json({ ok: true, document })
})

operatingRoomRouter.get('/', async (_req, res) => {
  const surgeries = await listSurgeries()
  res.json({ ok: true, surgeries })
})

operatingRoomRouter.get('/rooms', async (_req, res) => {
  const rooms = await listOperatingRooms()
  res.json({ ok: true, rooms })
})

operatingRoomRouter.post('/', requireAccess('operating-room', 'write'), async (req, res) => {
  const { scheduledAt, procedure } = req.body ?? {}
  if (typeof scheduledAt !== 'string' || Number.isNaN(Date.parse(scheduledAt))) {
    res.status(400).json({ ok: false, error: 'Date planifiée invalide.' })
    return
  }
  if (typeof procedure !== 'string' || !procedure.trim()) {
    res.status(400).json({ ok: false, error: 'Intervention requise.' })
    return
  }

  const surgery = await createSurgery(req.body)
  await logAudit(req.auth!.userId, 'surgery.create', 'Surgery', surgery.id)
  res.status(201).json({ ok: true, surgery })
})

operatingRoomRouter.patch('/:id', requireAccess('operating-room', 'write'), async (req, res) => {
  const surgery = await updateSurgery(req.params.id, req.body ?? {})
  await logAudit(req.auth!.userId, 'surgery.update', 'Surgery', surgery.id)
  res.json({ ok: true, surgery })
})

operatingRoomRouter.delete('/:id', requireAccess('operating-room', 'full'), async (req, res) => {
  await deleteSurgery(req.params.id)
  await logAudit(req.auth!.userId, 'surgery.delete', 'Surgery', req.params.id)
  res.json({ ok: true })
})
