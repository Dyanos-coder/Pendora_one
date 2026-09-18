import { Router } from 'express'
import { requireAccess, requireAuth } from '../middleware/auth.middleware'
import {
  createPatient,
  createPatientPrescription,
  createPatientVitals,
  deletePatient,
  generatePatientSummaryPdf,
  getPatientById,
  getPatientDossier,
  listPatients,
  updatePatient,
  updatePatientPrescription
} from '../services/patients.service'
import { logAudit } from '../services/audit.service'

export const patientsRouter = Router()

patientsRouter.use(requireAuth)
patientsRouter.use(requireAccess('patients', 'read'))

patientsRouter.get('/', async (_req, res) => {
  const patients = await listPatients()
  res.json({ ok: true, patients })
})

patientsRouter.get('/:id', async (req, res) => {
  const patient = await getPatientById(req.params.id)
  if (!patient) {
    res.status(404).json({ ok: false, error: 'Patient introuvable.' })
    return
  }
  res.json({ ok: true, patient })
})

// Vue agrégée du dossier patient (item 8) : consultations, RDV à venir, vitaux, ordonnances,
// résultats et chronologie en un seul aller-retour plutôt que 6 appels séparés à l'ouverture du
// dossier. Documents reste hors de cette réponse — mocké côté renderer en attendant l'item 11.
patientsRouter.get('/:id/dossier', async (req, res) => {
  const patient = await getPatientById(req.params.id)
  if (!patient) {
    res.status(404).json({ ok: false, error: 'Patient introuvable.' })
    return
  }
  const dossier = await getPatientDossier(req.params.id)
  res.json({ ok: true, dossier })
})

// Premier flow "Imprimer" réel de l'appli (item 9) — génère un vrai PDF via pdfkit plutôt que
// d'être un bouton décoratif comme les ~15 autres boutons "Imprimer" du reste de l'app (§6).
patientsRouter.get('/:id/print', async (req, res) => {
  const document = await generatePatientSummaryPdf(req.params.id)
  if (!document) {
    res.status(404).json({ ok: false, error: 'Patient introuvable.' })
    return
  }
  res.json({ ok: true, document })
})

patientsRouter.post('/:id/vitals', requireAccess('patients', 'write'), async (req, res) => {
  const { bloodPressure, temperature, heartRate, weight, oxygenSaturation } = req.body ?? {}
  if (!bloodPressure && !temperature && !heartRate && !weight && !oxygenSaturation) {
    res.status(400).json({ ok: false, error: 'Au moins une constante doit être renseignée.' })
    return
  }

  const vitals = await createPatientVitals(req.params.id, req.body ?? {})
  await logAudit(req.auth!.userId, 'patient.vitals.create', 'Patient', req.params.id)
  res.status(201).json({ ok: true, vitals })
})

patientsRouter.post('/:id/prescriptions', requireAccess('patients', 'write'), async (req, res) => {
  const { name, dosage } = req.body ?? {}
  if (typeof name !== 'string' || !name.trim() || typeof dosage !== 'string' || !dosage.trim()) {
    res.status(400).json({ ok: false, error: 'Nom et posologie requis.' })
    return
  }

  const prescription = await createPatientPrescription(req.params.id, req.body ?? {})
  await logAudit(req.auth!.userId, 'patient.prescription.create', 'Patient', req.params.id)
  res.status(201).json({ ok: true, prescription })
})

patientsRouter.patch('/:id/prescriptions/:prescriptionId', requireAccess('patients', 'write'), async (req, res) => {
  const { active } = req.body ?? {}
  if (active !== undefined && typeof active !== 'boolean') {
    res.status(400).json({ ok: false, error: 'Champ actif invalide.' })
    return
  }

  const prescription = await updatePatientPrescription(req.params.prescriptionId, { active })
  await logAudit(req.auth!.userId, 'patient.prescription.update', 'Patient', req.params.prescriptionId)
  res.json({ ok: true, prescription })
})

patientsRouter.post('/', requireAccess('patients', 'write'), async (req, res) => {
  const { firstName, lastName, gender, birthDate } = req.body ?? {}
  if (typeof firstName !== 'string' || !firstName.trim() || typeof lastName !== 'string' || !lastName.trim()) {
    res.status(400).json({ ok: false, error: 'Prénom et nom requis.' })
    return
  }
  if (gender !== 'M' && gender !== 'F') {
    res.status(400).json({ ok: false, error: 'Genre invalide.' })
    return
  }
  if (typeof birthDate !== 'string' || Number.isNaN(Date.parse(birthDate))) {
    res.status(400).json({ ok: false, error: 'Date de naissance invalide.' })
    return
  }

  const patient = await createPatient(req.body)
  await logAudit(req.auth!.userId, 'patient.create', 'Patient', patient.id)
  res.status(201).json({ ok: true, patient })
})

patientsRouter.patch('/:id', requireAccess('patients', 'write'), async (req, res) => {
  const { gender, birthDate } = req.body ?? {}
  if (gender !== undefined && gender !== 'M' && gender !== 'F') {
    res.status(400).json({ ok: false, error: 'Genre invalide.' })
    return
  }
  if (birthDate !== undefined && (typeof birthDate !== 'string' || Number.isNaN(Date.parse(birthDate)))) {
    res.status(400).json({ ok: false, error: 'Date de naissance invalide.' })
    return
  }

  const patient = await updatePatient(req.params.id, req.body ?? {})
  await logAudit(req.auth!.userId, 'patient.update', 'Patient', patient.id)
  res.json({ ok: true, patient })
})

patientsRouter.delete('/:id', requireAccess('patients', 'full'), async (req, res) => {
  await deletePatient(req.params.id)
  await logAudit(req.auth!.userId, 'patient.delete', 'Patient', req.params.id)
  res.json({ ok: true })
})
