import { Router } from 'express'
import { requireAccess, requireAuth } from '../middleware/auth.middleware'
import { createConsultation, deleteConsultation, listConsultations, updateConsultation } from '../services/consultations.service'
import { logAudit } from '../services/audit.service'

export const consultationsRouter = Router()

consultationsRouter.use(requireAuth)
consultationsRouter.use(requireAccess('consultations', 'read'))

consultationsRouter.get('/', async (_req, res) => {
  const consultations = await listConsultations()
  res.json({ ok: true, consultations })
})

consultationsRouter.post('/', requireAccess('consultations', 'write'), async (req, res) => {
  const { date } = req.body ?? {}
  if (typeof date !== 'string' || Number.isNaN(Date.parse(date))) {
    res.status(400).json({ ok: false, error: 'Date invalide.' })
    return
  }

  const consultation = await createConsultation(req.body)
  await logAudit(req.auth!.userId, 'consultation.create', 'Consultation', consultation.id)
  res.status(201).json({ ok: true, consultation })
})

consultationsRouter.patch('/:id', requireAccess('consultations', 'write'), async (req, res) => {
  const consultation = await updateConsultation(req.params.id, req.body ?? {})
  await logAudit(req.auth!.userId, 'consultation.update', 'Consultation', consultation.id)
  res.json({ ok: true, consultation })
})

consultationsRouter.delete('/:id', requireAccess('consultations', 'full'), async (req, res) => {
  await deleteConsultation(req.params.id)
  await logAudit(req.auth!.userId, 'consultation.delete', 'Consultation', req.params.id)
  res.json({ ok: true })
})
