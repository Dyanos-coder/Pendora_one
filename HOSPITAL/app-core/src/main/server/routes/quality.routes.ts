import { Router } from 'express'
import { requireAccess, requireAuth } from '../middleware/auth.middleware'
import {
  createQualityAction,
  createQualityCertification,
  createQualityIndicator,
  deleteQualityAction,
  deleteQualityCertification,
  deleteQualityIndicator,
  listQualityActions,
  listQualityCertifications,
  listQualityIndicators,
  updateQualityAction,
  updateQualityCertification,
  updateQualityIndicator
} from '../services/quality.service'
import { logAudit } from '../services/audit.service'

export const qualityRouter = Router()

qualityRouter.use(requireAuth)
qualityRouter.use(requireAccess('quality', 'read'))

qualityRouter.get('/', async (_req, res) => {
  const indicators = await listQualityIndicators()
  res.json({ ok: true, indicators })
})

qualityRouter.post('/', requireAccess('quality', 'write'), async (req, res) => {
  const { name, category, currentValue, target } = req.body ?? {}
  if (
    typeof name !== 'string' ||
    !name.trim() ||
    typeof category !== 'string' ||
    !category.trim() ||
    typeof currentValue !== 'string' ||
    typeof target !== 'string'
  ) {
    res.status(400).json({ ok: false, error: 'Champs invalides.' })
    return
  }

  const indicator = await createQualityIndicator(req.body)
  await logAudit(req.auth!.userId, 'qualityIndicator.create', 'QualityIndicator', indicator.id)
  res.status(201).json({ ok: true, indicator })
})

qualityRouter.patch('/:id', requireAccess('quality', 'write'), async (req, res) => {
  const indicator = await updateQualityIndicator(req.params.id, req.body ?? {})
  await logAudit(req.auth!.userId, 'qualityIndicator.update', 'QualityIndicator', indicator.id)
  res.json({ ok: true, indicator })
})

qualityRouter.delete('/:id', requireAccess('quality', 'full'), async (req, res) => {
  await deleteQualityIndicator(req.params.id)
  await logAudit(req.auth!.userId, 'qualityIndicator.delete', 'QualityIndicator', req.params.id)
  res.json({ ok: true })
})

qualityRouter.get('/certifications', async (_req, res) => {
  const certifications = await listQualityCertifications()
  res.json({ ok: true, certifications })
})

qualityRouter.post('/certifications', requireAccess('quality', 'write'), async (req, res) => {
  const { name, issuer, expiryDate } = req.body ?? {}
  if (typeof name !== 'string' || !name.trim() || typeof issuer !== 'string' || !issuer.trim() || typeof expiryDate !== 'string') {
    res.status(400).json({ ok: false, error: 'Champs invalides.' })
    return
  }

  const certification = await createQualityCertification(req.body)
  await logAudit(req.auth!.userId, 'qualityCertification.create', 'QualityCertification', certification.id)
  res.status(201).json({ ok: true, certification })
})

qualityRouter.patch('/certifications/:id', requireAccess('quality', 'write'), async (req, res) => {
  const certification = await updateQualityCertification(req.params.id, req.body ?? {})
  await logAudit(req.auth!.userId, 'qualityCertification.update', 'QualityCertification', certification.id)
  res.json({ ok: true, certification })
})

qualityRouter.delete('/certifications/:id', requireAccess('quality', 'full'), async (req, res) => {
  await deleteQualityCertification(req.params.id)
  await logAudit(req.auth!.userId, 'qualityCertification.delete', 'QualityCertification', req.params.id)
  res.json({ ok: true })
})

qualityRouter.get('/actions', async (_req, res) => {
  const actions = await listQualityActions()
  res.json({ ok: true, actions })
})

qualityRouter.post('/actions', requireAccess('quality', 'write'), async (req, res) => {
  const { label, owner, progress } = req.body ?? {}
  if (typeof label !== 'string' || !label.trim() || typeof owner !== 'string' || !owner.trim() || typeof progress !== 'number') {
    res.status(400).json({ ok: false, error: 'Champs invalides.' })
    return
  }

  const action = await createQualityAction(req.body)
  await logAudit(req.auth!.userId, 'qualityAction.create', 'QualityAction', action.id)
  res.status(201).json({ ok: true, action })
})

qualityRouter.patch('/actions/:id', requireAccess('quality', 'write'), async (req, res) => {
  const action = await updateQualityAction(req.params.id, req.body ?? {})
  await logAudit(req.auth!.userId, 'qualityAction.update', 'QualityAction', action.id)
  res.json({ ok: true, action })
})

qualityRouter.delete('/actions/:id', requireAccess('quality', 'full'), async (req, res) => {
  await deleteQualityAction(req.params.id)
  await logAudit(req.auth!.userId, 'qualityAction.delete', 'QualityAction', req.params.id)
  res.json({ ok: true })
})
