import { Router } from 'express'
import { requireAccess, requireAuth } from '../middleware/auth.middleware'
import {
  countDistinctPathologyPatients,
  createPathologyRequest,
  deletePathologyRequest,
  listPathologyRequests,
  updatePathologyRequest
} from '../services/pathology.service'
import { logAudit } from '../services/audit.service'

export const pathologyRouter = Router()

pathologyRouter.use(requireAuth)
pathologyRouter.use(requireAccess('pathology', 'read'))

pathologyRouter.get('/', async (_req, res) => {
  const requests = await listPathologyRequests()
  res.json({ ok: true, requests })
})

pathologyRouter.get('/patients-followed', async (_req, res) => {
  const count = await countDistinctPathologyPatients()
  res.json({ ok: true, count })
})

pathologyRouter.post('/', requireAccess('pathology', 'write'), async (req, res) => {
  const { sampleType } = req.body ?? {}
  if (typeof sampleType !== 'string' || !sampleType.trim()) {
    res.status(400).json({ ok: false, error: 'Type de prélèvement requis.' })
    return
  }

  const request = await createPathologyRequest(req.body)
  await logAudit(req.auth!.userId, 'pathology_request.create', 'PathologyRequest', request.id)
  res.status(201).json({ ok: true, request })
})

pathologyRouter.patch('/:id', requireAccess('pathology', 'write'), async (req, res) => {
  const request = await updatePathologyRequest(req.params.id, req.body ?? {})
  await logAudit(req.auth!.userId, 'pathology_request.update', 'PathologyRequest', request.id)
  res.json({ ok: true, request })
})

pathologyRouter.delete('/:id', requireAccess('pathology', 'full'), async (req, res) => {
  await deletePathologyRequest(req.params.id)
  await logAudit(req.auth!.userId, 'pathology_request.delete', 'PathologyRequest', req.params.id)
  res.json({ ok: true })
})
