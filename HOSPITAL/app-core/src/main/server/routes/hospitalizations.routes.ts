import { Router } from 'express'
import { requireAccess, requireAuth } from '../middleware/auth.middleware'
import {
  createHospitalization,
  deleteHospitalization,
  exportHospitalizations,
  listHospitalizations,
  updateHospitalization
} from '../services/hospitalizations.service'
import { bedOccupancySummary, listBeds } from '../services/beds.service'
import { logAudit } from '../services/audit.service'

export const hospitalizationsRouter = Router()

hospitalizationsRouter.use(requireAuth)
hospitalizationsRouter.use(requireAccess('hospitalizations', 'read'))

// Doit rester avant toute route GET /:id du même routeur.
hospitalizationsRouter.get('/export', async (_req, res) => {
  const document = await exportHospitalizations()
  res.json({ ok: true, document })
})

hospitalizationsRouter.get('/', async (_req, res) => {
  const hospitalizations = await listHospitalizations()
  res.json({ ok: true, hospitalizations })
})

hospitalizationsRouter.get('/beds', async (_req, res) => {
  const beds = await listBeds()
  res.json({ ok: true, beds })
})

hospitalizationsRouter.get('/beds/occupancy', async (_req, res) => {
  const occupancy = await bedOccupancySummary()
  res.json({ ok: true, occupancy })
})

hospitalizationsRouter.post('/', requireAccess('hospitalizations', 'write'), async (req, res) => {
  const { admissionDate } = req.body ?? {}
  if (typeof admissionDate !== 'string' || Number.isNaN(Date.parse(admissionDate))) {
    res.status(400).json({ ok: false, error: 'Date d\'admission invalide.' })
    return
  }

  const hospitalization = await createHospitalization(req.body)
  await logAudit(req.auth!.userId, 'hospitalization.create', 'Hospitalization', hospitalization.id)
  res.status(201).json({ ok: true, hospitalization })
})

hospitalizationsRouter.patch('/:id', requireAccess('hospitalizations', 'write'), async (req, res) => {
  const hospitalization = await updateHospitalization(req.params.id, req.body ?? {})
  await logAudit(req.auth!.userId, 'hospitalization.update', 'Hospitalization', hospitalization.id)
  res.json({ ok: true, hospitalization })
})

hospitalizationsRouter.delete('/:id', requireAccess('hospitalizations', 'full'), async (req, res) => {
  await deleteHospitalization(req.params.id)
  await logAudit(req.auth!.userId, 'hospitalization.delete', 'Hospitalization', req.params.id)
  res.json({ ok: true })
})
