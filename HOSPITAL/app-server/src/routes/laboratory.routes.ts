import { Router } from 'express'
import { requireAccess, requireAuth } from '../middleware/auth.middleware'
import { createLabRequest, deleteLabRequest, listLabRequests, updateLabRequest } from '../services/laboratory.service'
import { logAudit } from '../services/audit.service'

export const laboratoryRouter = Router()

laboratoryRouter.use(requireAuth)
laboratoryRouter.use(requireAccess('laboratory', 'read'))

laboratoryRouter.get('/', async (_req, res) => {
  const requests = await listLabRequests()
  res.json({ ok: true, requests })
})

laboratoryRouter.post('/', requireAccess('laboratory', 'write'), async (req, res) => {
  const { analysisType } = req.body ?? {}
  if (typeof analysisType !== 'string' || !analysisType.trim()) {
    res.status(400).json({ ok: false, error: "Type d'analyse requis." })
    return
  }

  const request = await createLabRequest(req.body)
  await logAudit(req.auth!.userId, 'lab_request.create', 'LabRequest', request.id)
  res.status(201).json({ ok: true, request })
})

laboratoryRouter.patch('/:id', requireAccess('laboratory', 'write'), async (req, res) => {
  const request = await updateLabRequest(req.params.id, req.body ?? {})
  await logAudit(req.auth!.userId, 'lab_request.update', 'LabRequest', request.id)
  res.json({ ok: true, request })
})

laboratoryRouter.delete('/:id', requireAccess('laboratory', 'full'), async (req, res) => {
  await deleteLabRequest(req.params.id)
  await logAudit(req.auth!.userId, 'lab_request.delete', 'LabRequest', req.params.id)
  res.json({ ok: true })
})
