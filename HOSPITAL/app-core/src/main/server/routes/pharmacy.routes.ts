import { Router } from 'express'
import { requireAccess, requireAuth } from '../middleware/auth.middleware'
import { createMedication, deleteMedication, listMedications, updateMedication } from '../services/pharmacy.service'
import { logAudit } from '../services/audit.service'

export const pharmacyRouter = Router()

pharmacyRouter.use(requireAuth)
pharmacyRouter.use(requireAccess('pharmacy', 'read'))

pharmacyRouter.get('/', async (_req, res) => {
  const medications = await listMedications()
  res.json({ ok: true, medications })
})

pharmacyRouter.post('/', requireAccess('pharmacy', 'write'), async (req, res) => {
  const { name, category, location, available, minThreshold } = req.body ?? {}
  if (typeof name !== 'string' || !name.trim()) {
    res.status(400).json({ ok: false, error: 'Nom du médicament requis.' })
    return
  }
  if (typeof category !== 'string' || typeof location !== 'string' || typeof available !== 'number' || typeof minThreshold !== 'number') {
    res.status(400).json({ ok: false, error: 'Champs invalides.' })
    return
  }

  const medication = await createMedication(req.body)
  await logAudit(req.auth!.userId, 'medication.create', 'Medication', medication.id)
  res.status(201).json({ ok: true, medication })
})

pharmacyRouter.patch('/:id', requireAccess('pharmacy', 'write'), async (req, res) => {
  const medication = await updateMedication(req.params.id, req.body ?? {})
  await logAudit(req.auth!.userId, 'medication.update', 'Medication', medication.id)
  res.json({ ok: true, medication })
})

pharmacyRouter.delete('/:id', requireAccess('pharmacy', 'full'), async (req, res) => {
  await deleteMedication(req.params.id)
  await logAudit(req.auth!.userId, 'medication.delete', 'Medication', req.params.id)
  res.json({ ok: true })
})
