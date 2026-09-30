import { Router } from 'express'
import multer from 'multer'
import { requireAccess, requireAuth } from '../middleware/auth.middleware'
import {
  createLabRequest,
  deleteLabRequest,
  exportLabRequests,
  getLabResultFile,
  listLabRequests,
  updateLabRequest,
  uploadLabResultFile
} from '../services/laboratory.service'
import { logAudit } from '../services/audit.service'

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } })

export const laboratoryRouter = Router()

laboratoryRouter.use(requireAuth)
laboratoryRouter.use(requireAccess('laboratory', 'read'))

// Doit rester avant toute route `GET /:id` du même routeur (aucune ici, mais gardé en tête par
// précaution — voir la même remarque dans les autres domaines exportés, item 10).
laboratoryRouter.get('/export', async (_req, res) => {
  const document = await exportLabRequests()
  res.json({ ok: true, document })
})

laboratoryRouter.get('/', async (_req, res) => {
  const requests = await listLabRequests()
  res.json({ ok: true, requests })
})

laboratoryRouter.post('/', requireAccess('laboratory', 'write'), async (req, res) => {
  const { analysisType } = req.body ?? {}
  if (typeof analysisType !== 'string' || !analysisType.trim()) {
    res.status(400).json({ ok: false, error: "Type d'analyse requis." })
    return
  }

  const request = await createLabRequest(req.body)
  await logAudit(req.auth!.userId, 'lab_request.create', 'LabRequest', request.id)
  res.status(201).json({ ok: true, request })
})

laboratoryRouter.patch('/:id', requireAccess('laboratory', 'write'), async (req, res) => {
  const request = await updateLabRequest(req.params.id, req.body ?? {})
  await logAudit(req.auth!.userId, 'lab_request.update', 'LabRequest', request.id)
  res.json({ ok: true, request })
})

laboratoryRouter.delete('/:id', requireAccess('laboratory', 'full'), async (req, res) => {
  await deleteLabRequest(req.params.id)
  await logAudit(req.auth!.userId, 'lab_request.delete', 'LabRequest', req.params.id)
  res.json({ ok: true })
})

// --- Fichier de résultat ------------------------------------------------------------------------

laboratoryRouter.get('/:id/file', async (req, res) => {
  const file = await getLabResultFile(req.params.id)
  if (!file) {
    res.status(404).json({ ok: false, error: 'Aucun fichier pour cette demande.' })
    return
  }
  res.json({ ok: true, document: file })
})

laboratoryRouter.post('/:id/file', requireAccess('laboratory', 'write'), upload.single('file'), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ ok: false, error: 'Aucun fichier reçu.' })
    return
  }

  const request = await uploadLabResultFile(req.params.id, {
    fileName: req.file.originalname,
    mimeType: req.file.mimetype,
    content: req.file.buffer
  })
  await logAudit(req.auth!.userId, 'lab_request.uploadFile', 'LabRequest', req.params.id)
  res.json({ ok: true, request })
})
