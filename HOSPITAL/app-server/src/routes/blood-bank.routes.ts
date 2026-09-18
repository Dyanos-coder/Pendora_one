import { Router } from 'express'
import { requireAccess, requireAuth } from '../middleware/auth.middleware'
import { createBloodPouch, deleteBloodPouch, listBloodPouches, updateBloodPouch } from '../services/blood-bank.service'
import { logAudit } from '../services/audit.service'

export const bloodBankRouter = Router()

bloodBankRouter.use(requireAuth)
bloodBankRouter.use(requireAccess('blood-bank', 'read'))

bloodBankRouter.get('/', async (_req, res) => {
  const pouches = await listBloodPouches()
  res.json({ ok: true, pouches })
})

bloodBankRouter.post('/', requireAccess('blood-bank', 'write'), async (req, res) => {
  const { bloodGroup, component, collectionDate, expiryDate, donorName } = req.body ?? {}
  if (typeof bloodGroup !== 'string' || !bloodGroup.trim() || typeof component !== 'string' || !component.trim()) {
    res.status(400).json({ ok: false, error: 'Groupe sanguin et composant requis.' })
    return
  }
  if (typeof collectionDate !== 'string' || typeof expiryDate !== 'string' || typeof donorName !== 'string' || !donorName.trim()) {
    res.status(400).json({ ok: false, error: 'Champs invalides.' })
    return
  }

  const pouch = await createBloodPouch(req.body)
  await logAudit(req.auth!.userId, 'bloodPouch.create', 'BloodPouch', pouch.id)
  res.status(201).json({ ok: true, pouch })
})

bloodBankRouter.patch('/:id', requireAccess('blood-bank', 'write'), async (req, res) => {
  const pouch = await updateBloodPouch(req.params.id, req.body ?? {})
  await logAudit(req.auth!.userId, 'bloodPouch.update', 'BloodPouch', pouch.id)
  res.json({ ok: true, pouch })
})

bloodBankRouter.delete('/:id', requireAccess('blood-bank', 'full'), async (req, res) => {
  await deleteBloodPouch(req.params.id)
  await logAudit(req.auth!.userId, 'bloodPouch.delete', 'BloodPouch', req.params.id)
  res.json({ ok: true })
})
