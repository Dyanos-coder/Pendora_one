import { Router } from 'express'
import { requireAccess, requireAuth } from '../middleware/auth.middleware'
import { createRisk, deleteRisk, listRisks, updateRisk } from '../services/risk.service'
import { logAudit } from '../services/audit.service'

export const riskRouter = Router()

riskRouter.use(requireAuth)
riskRouter.use(requireAccess('risks', 'read'))

riskRouter.get('/', async (_req, res) => {
  const risks = await listRisks()
  res.json({ ok: true, risks })
})

riskRouter.post('/', requireAccess('risks', 'write'), async (req, res) => {
  const { title, category, probability, impact, owner } = req.body ?? {}
  if (
    typeof title !== 'string' ||
    !title.trim() ||
    typeof category !== 'string' ||
    !category.trim() ||
    typeof probability !== 'number' ||
    typeof impact !== 'number' ||
    typeof owner !== 'string' ||
    !owner.trim()
  ) {
    res.status(400).json({ ok: false, error: 'Champs invalides.' })
    return
  }

  const risk = await createRisk(req.body)
  await logAudit(req.auth!.userId, 'risk.create', 'Risk', risk.id)
  res.status(201).json({ ok: true, risk })
})

riskRouter.patch('/:id', requireAccess('risks', 'write'), async (req, res) => {
  const risk = await updateRisk(req.params.id, req.body ?? {})
  await logAudit(req.auth!.userId, 'risk.update', 'Risk', risk.id)
  res.json({ ok: true, risk })
})

riskRouter.delete('/:id', requireAccess('risks', 'full'), async (req, res) => {
  await deleteRisk(req.params.id)
  await logAudit(req.auth!.userId, 'risk.delete', 'Risk', req.params.id)
  res.json({ ok: true })
})
