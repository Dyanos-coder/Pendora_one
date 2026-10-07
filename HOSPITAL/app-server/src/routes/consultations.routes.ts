import { Router } from 'express'
import multer from 'multer'
import { requireAccess, requireAuth } from '../middleware/auth.middleware'
import {
  createConsultation,
  deleteConsultation,
  exportConsultations,
  getConsultationDocument,
  listConsultations,
  updateConsultation,
  uploadConsultationDocument
} from '../services/consultations.service'
import { logAudit } from '../services/audit.service'

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } })

export const consultationsRouter = Router()

consultationsRouter.use(requireAuth)
consultationsRouter.use(requireAccess('consultations', 'read'))

// Doit rester avant toute route GET /:id du même routeur (aucune ici, mais gardé en tête par
// précaution, item 10).
consultationsRouter.get('/export', async (_req, res) => {
  const document = await exportConsultations()
  res.json({ ok: true, document })
})

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

// --- Document (item 1 PETITES MODIFS) -----------------------------------------------------------

consultationsRouter.get('/:id/document', async (req, res) => {
  const document = await getConsultationDocument(req.params.id)
  if (!document) {
    res.status(404).json({ ok: false, error: 'Aucun document pour cette consultation.' })
    return
  }
  res.json({ ok: true, document })
})

consultationsRouter.post('/:id/document', requireAccess('consultations', 'write'), upload.single('file'), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ ok: false, error: 'Aucun fichier reçu.' })
    return
  }

  const consultation = await uploadConsultationDocument(req.params.id, {
    fileName: req.file.originalname,
    mimeType: req.file.mimetype,
    content: req.file.buffer
  })
  await logAudit(req.auth!.userId, 'consultation.uploadDocument', 'Consultation', req.params.id)
  res.json({ ok: true, consultation })
})
