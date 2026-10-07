import { Router } from 'express'
import { requireAccess, requireAuth } from '../middleware/auth.middleware'
import { createBloodPouch, deleteBloodPouch, exportBloodPouches, listBloodPouches, updateBloodPouch } from '../services/blood-bank.service'
import { createDonation, deleteDonation, listDonations, updateDonation } from '../services/blood-bank-donations.service'
import {
  createTransfusionRequest,
  deleteTransfusionRequest,
  listTransfusionRequests,
  updateTransfusionRequest
} from '../services/blood-bank-transfusion-requests.service'
import { createTransfusion, deleteTransfusion, listTransfusions, updateTransfusion } from '../services/blood-bank-transfusions.service'
import {
  createBloodAnalysis,
  deleteBloodAnalysis,
  listBloodAnalyses,
  updateBloodAnalysis
} from '../services/blood-bank-analyses.service'
import { logAudit } from '../services/audit.service'

export const bloodBankRouter = Router()

bloodBankRouter.use(requireAuth)
bloodBankRouter.use(requireAccess('blood-bank', 'read'))

// Doit rester avant toute route GET /:id du même routeur.
bloodBankRouter.get('/export', async (_req, res) => {
  const document = await exportBloodPouches()
  res.json({ ok: true, document })
})

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

// --- Dons (item 15) --------------------------------------------------------------------------------

bloodBankRouter.get('/donations', async (_req, res) => {
  const donations = await listDonations()
  res.json({ ok: true, donations })
})

bloodBankRouter.post('/donations', requireAccess('blood-bank', 'write'), async (req, res) => {
  const { donorName, bloodGroup } = req.body ?? {}
  if (typeof donorName !== 'string' || !donorName.trim() || typeof bloodGroup !== 'string' || !bloodGroup.trim()) {
    res.status(400).json({ ok: false, error: 'Nom du donneur et groupe sanguin requis.' })
    return
  }

  const donation = await createDonation(req.body)
  await logAudit(req.auth!.userId, 'bloodDonation.create', 'BloodDonation', donation.id)
  res.status(201).json({ ok: true, donation })
})

bloodBankRouter.patch('/donations/:id', requireAccess('blood-bank', 'write'), async (req, res) => {
  const donation = await updateDonation(req.params.id, req.body ?? {})
  await logAudit(req.auth!.userId, 'bloodDonation.update', 'BloodDonation', donation.id)
  res.json({ ok: true, donation })
})

bloodBankRouter.delete('/donations/:id', requireAccess('blood-bank', 'full'), async (req, res) => {
  await deleteDonation(req.params.id)
  await logAudit(req.auth!.userId, 'bloodDonation.delete', 'BloodDonation', req.params.id)
  res.json({ ok: true })
})

// --- Demandes transfusionnelles (item 15) ----------------------------------------------------------

bloodBankRouter.get('/transfusion-requests', async (_req, res) => {
  const requests = await listTransfusionRequests()
  res.json({ ok: true, requests })
})

bloodBankRouter.post('/transfusion-requests', requireAccess('blood-bank', 'write'), async (req, res) => {
  const { patientId, bloodGroup, component, quantityUnits, requestedBy } = req.body ?? {}
  if (
    typeof patientId !== 'string' ||
    !patientId.trim() ||
    typeof bloodGroup !== 'string' ||
    !bloodGroup.trim() ||
    typeof component !== 'string' ||
    !component.trim() ||
    typeof quantityUnits !== 'number' ||
    typeof requestedBy !== 'string' ||
    !requestedBy.trim()
  ) {
    res.status(400).json({ ok: false, error: 'Champs invalides.' })
    return
  }

  const request = await createTransfusionRequest(req.body)
  await logAudit(req.auth!.userId, 'transfusionRequest.create', 'TransfusionRequest', request.id)
  res.status(201).json({ ok: true, request })
})

bloodBankRouter.patch('/transfusion-requests/:id', requireAccess('blood-bank', 'write'), async (req, res) => {
  const request = await updateTransfusionRequest(req.params.id, req.body ?? {})
  await logAudit(req.auth!.userId, 'transfusionRequest.update', 'TransfusionRequest', request.id)
  res.json({ ok: true, request })
})

bloodBankRouter.delete('/transfusion-requests/:id', requireAccess('blood-bank', 'full'), async (req, res) => {
  await deleteTransfusionRequest(req.params.id)
  await logAudit(req.auth!.userId, 'transfusionRequest.delete', 'TransfusionRequest', req.params.id)
  res.json({ ok: true })
})

// --- Transfusions (item 15) -------------------------------------------------------------------------

bloodBankRouter.get('/transfusions', async (_req, res) => {
  const transfusions = await listTransfusions()
  res.json({ ok: true, transfusions })
})

bloodBankRouter.post('/transfusions', requireAccess('blood-bank', 'write'), async (req, res) => {
  const { patientId, pouchId, administeredBy } = req.body ?? {}
  if (
    typeof patientId !== 'string' ||
    !patientId.trim() ||
    typeof pouchId !== 'string' ||
    !pouchId.trim() ||
    typeof administeredBy !== 'string' ||
    !administeredBy.trim()
  ) {
    res.status(400).json({ ok: false, error: 'Champs invalides.' })
    return
  }

  const transfusion = await createTransfusion(req.body)
  await logAudit(req.auth!.userId, 'transfusion.create', 'Transfusion', transfusion.id)
  res.status(201).json({ ok: true, transfusion })
})

bloodBankRouter.patch('/transfusions/:id', requireAccess('blood-bank', 'write'), async (req, res) => {
  const transfusion = await updateTransfusion(req.params.id, req.body ?? {})
  await logAudit(req.auth!.userId, 'transfusion.update', 'Transfusion', transfusion.id)
  res.json({ ok: true, transfusion })
})

bloodBankRouter.delete('/transfusions/:id', requireAccess('blood-bank', 'full'), async (req, res) => {
  await deleteTransfusion(req.params.id)
  await logAudit(req.auth!.userId, 'transfusion.delete', 'Transfusion', req.params.id)
  res.json({ ok: true })
})

// --- Analyses (item 15) --------------------------------------------------------------------------

bloodBankRouter.get('/analyses', async (_req, res) => {
  const analyses = await listBloodAnalyses()
  res.json({ ok: true, analyses })
})

bloodBankRouter.post('/analyses', requireAccess('blood-bank', 'write'), async (req, res) => {
  const { pouchId, testType, performedBy } = req.body ?? {}
  if (
    typeof pouchId !== 'string' ||
    !pouchId.trim() ||
    typeof testType !== 'string' ||
    !testType.trim() ||
    typeof performedBy !== 'string' ||
    !performedBy.trim()
  ) {
    res.status(400).json({ ok: false, error: 'Champs invalides.' })
    return
  }

  const analysis = await createBloodAnalysis(req.body)
  await logAudit(req.auth!.userId, 'bloodAnalysis.create', 'BloodAnalysis', analysis.id)
  res.status(201).json({ ok: true, analysis })
})

bloodBankRouter.patch('/analyses/:id', requireAccess('blood-bank', 'write'), async (req, res) => {
  const analysis = await updateBloodAnalysis(req.params.id, req.body ?? {})
  await logAudit(req.auth!.userId, 'bloodAnalysis.update', 'BloodAnalysis', analysis.id)
  res.json({ ok: true, analysis })
})

bloodBankRouter.delete('/analyses/:id', requireAccess('blood-bank', 'full'), async (req, res) => {
  await deleteBloodAnalysis(req.params.id)
  await logAudit(req.auth!.userId, 'bloodAnalysis.delete', 'BloodAnalysis', req.params.id)
  res.json({ ok: true })
})
