import { Router } from 'express'
import { requireAccess, requireAuth } from '../middleware/auth.middleware'
import { createImagingRequest, deleteImagingRequest, listImagingRequests, updateImagingRequest } from '../services/imaging.service'
import { logAudit } from '../services/audit.service'

export const imagingRouter = Router()

imagingRouter.use(requireAuth)
imagingRouter.use(requireAccess('imaging', 'read'))

imagingRouter.get('/', async (_req, res) => {
  const requests = await listImagingRequests()
  res.json({ ok: true, requests })
})

imagingRouter.post('/', requireAccess('imaging', 'write'), async (req, res) => {
  const { examType } = req.body ?? {}
  if (typeof examType !== 'string' || !examType.trim()) {
    res.status(400).json({ ok: false, error: "Type d'examen requis." })
    return
  }

  const request = await createImagingRequest(req.body)
  await logAudit(req.auth!.userId, 'imaging_request.create', 'ImagingRequest', request.id)
  res.status(201).json({ ok: true, request })
})

imagingRouter.patch('/:id', requireAccess('imaging', 'write'), async (req, res) => {
  const request = await updateImagingRequest(req.params.id, req.body ?? {})
  await logAudit(req.auth!.userId, 'imaging_request.update', 'ImagingRequest', request.id)
  res.json({ ok: true, request })
})

imagingRouter.delete('/:id', requireAccess('imaging', 'full'), async (req, res) => {
  await deleteImagingRequest(req.params.id)
  await logAudit(req.auth!.userId, 'imaging_request.delete', 'ImagingRequest', req.params.id)
  res.json({ ok: true })
})
