import { Router } from 'express'
import multer from 'multer'
import { requireAccess, requireAuth } from '../middleware/auth.middleware'
import {
  createPatient,
  createPatientPrescription,
  createPatientVitals,
  deletePatient,
  generatePatientSummaryPdf,
  getPatientById,
  getPatientDossier,
  getVitalsFile,
  listPatients,
  updatePatient,
  updatePatientPrescription,
  uploadVitalsFile
} from '../services/patients.service'
import {
  createPatientDocument,
  deletePatientDocument,
  getPatientDocumentFile,
  listPatientDocuments,
  uploadPatientDocumentFile
} from '../services/patient-documents.service'
import { logAudit } from '../services/audit.service'

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } })

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
  const { source } = req.body ?? {}
  if (source !== 'ANALYSE' && source !== 'RDV' && source !== 'CONSULTATION') {
    res.status(400).json({ ok: false, error: 'Contexte de prise invalide.' })
    return
  }

  const result = await createPatientVitals(req.params.id, req.body ?? {})
  await logAudit(req.auth!.userId, 'patient.vitals.create', 'Patient', req.params.id)
  res.status(201).json({ ok: true, vitalsId: result.id, vitals: result.rows })
})

patientsRouter.get('/:id/vitals/:vitalsId/file', async (req, res) => {
  const document = await getVitalsFile(req.params.vitalsId)
  if (!document) {
    res.status(404).json({ ok: false, error: 'Aucun fichier pour cette prise de constantes.' })
    return
  }
  res.json({ ok: true, document })
})

patientsRouter.post(
  '/:id/vitals/:vitalsId/file',
  requireAccess('patients', 'write'),
  upload.single('file'),
  async (req, res) => {
    if (!req.file) {
      res.status(400).json({ ok: false, error: 'Aucun fichier reçu.' })
      return
    }

    const result = await uploadVitalsFile(req.params.vitalsId, {
      fileName: req.file.originalname,
      mimeType: req.file.mimetype,
      content: req.file.buffer
    })
    await logAudit(req.auth!.userId, 'patient.vitals.uploadFile', 'Patient', req.params.id)
    res.json({ ok: true, vitalsId: result.id, vitals: result.rows })
  }
)

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

// --- Documents patient (item 11, même mécanisme BLOB que les documents employé) ---------------

patientsRouter.get('/:id/documents', async (req, res) => {
  const documents = await listPatientDocuments(req.params.id)
  res.json({ ok: true, documents })
})

patientsRouter.post('/:id/documents', requireAccess('patients', 'write'), async (req, res) => {
  const { title } = req.body ?? {}
  if (typeof title !== 'string' || !title.trim()) {
    res.status(400).json({ ok: false, error: 'Titre requis.' })
    return
  }

  const document = await createPatientDocument({ patientId: req.params.id, title, category: req.body?.category })
  await logAudit(req.auth!.userId, 'patient.document.create', 'Patient', req.params.id)
  res.status(201).json({ ok: true, document })
})

patientsRouter.delete('/:id/documents/:documentId', requireAccess('patients', 'write'), async (req, res) => {
  await deletePatientDocument(req.params.documentId)
  await logAudit(req.auth!.userId, 'patient.document.delete', 'Patient', req.params.id)
  res.json({ ok: true })
})

patientsRouter.get('/:id/documents/:documentId/file', async (req, res) => {
  const document = await getPatientDocumentFile(req.params.documentId)
  if (!document) {
    res.status(404).json({ ok: false, error: 'Aucun fichier pour ce document.' })
    return
  }
  res.json({ ok: true, document })
})

patientsRouter.post('/:id/documents/:documentId/file', requireAccess('patients', 'write'), upload.single('file'), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ ok: false, error: 'Aucun fichier reçu.' })
    return
  }

  const document = await uploadPatientDocumentFile(req.params.documentId, {
    fileName: req.file.originalname,
    mimeType: req.file.mimetype,
    content: req.file.buffer
  })
  await logAudit(req.auth!.userId, 'patient.document.uploadFile', 'Patient', req.params.id)
  res.json({ ok: true, document })
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
