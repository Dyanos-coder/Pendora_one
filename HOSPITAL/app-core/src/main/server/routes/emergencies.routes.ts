import { Router } from 'express'
import { requireAccess, requireAuth } from '../middleware/auth.middleware'
import {
  createEmergencyVisit,
  deleteEmergencyVisit,
  exportEmergencyVisits,
  listEmergencyVisits,
  updateEmergencyVisit
} from '../services/emergencies.service'
import { logAudit } from '../services/audit.service'

export const emergenciesRouter = Router()

emergenciesRouter.use(requireAuth)
emergenciesRouter.use(requireAccess('emergencies', 'read'))

// Doit rester avant toute route GET /:id du même routeur (aucune ici, mais gardé en tête par
// précaution, item 10).
emergenciesRouter.get('/export', async (_req, res) => {
  const document = await exportEmergencyVisits()
  res.json({ ok: true, document })
})

emergenciesRouter.get('/', async (_req, res) => {
  const visits = await listEmergencyVisits()
  res.json({ ok: true, visits })
})

emergenciesRouter.post('/', requireAccess('emergencies', 'write'), async (req, res) => {
  const { severity } = req.body ?? {}
  if (!['CRITIQUE', 'ELEVE', 'MOYEN', 'FAIBLE'].includes(severity)) {
    res.status(400).json({ ok: false, error: 'Niveau de gravité invalide.' })
    return
  }

  const visit = await createEmergencyVisit(req.body)
  await logAudit(req.auth!.userId, 'emergency.create', 'EmergencyVisit', visit.id)
  res.status(201).json({ ok: true, visit })
})

emergenciesRouter.patch('/:id', requireAccess('emergencies', 'write'), async (req, res) => {
  const visit = await updateEmergencyVisit(req.params.id, req.body ?? {})
  await logAudit(req.auth!.userId, 'emergency.update', 'EmergencyVisit', visit.id)
  res.json({ ok: true, visit })
})

emergenciesRouter.delete('/:id', requireAccess('emergencies', 'full'), async (req, res) => {
  await deleteEmergencyVisit(req.params.id)
  await logAudit(req.auth!.userId, 'emergency.delete', 'EmergencyVisit', req.params.id)
  res.json({ ok: true })
})
