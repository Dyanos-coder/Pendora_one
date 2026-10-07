import { Router } from 'express'
import multer from 'multer'
import { requireAccess, requireAuth } from '../middleware/auth.middleware'
import {
  createImagingRequest,
  deleteImagingRequest,
  exportImagingRequests,
  getImagingResultFile,
  listImagingRequests,
  updateImagingRequest,
  uploadImagingResultFile
} from '../services/imaging.service'
import { logAudit } from '../services/audit.service'

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } })

export const imagingRouter = Router()

imagingRouter.use(requireAuth)
imagingRouter.use(requireAccess('imaging', 'read'))

// Doit rester avant toute route GET /:id du même routeur.
imagingRouter.get('/export', async (_req, res) => {
  const document = await exportImagingRequests()
  res.json({ ok: true, document })
})

imagingRouter.get('/', async (_req, res) => {
  const requests = await listImagingRequests()
  res.json({ ok: true, requests })
})

imagingRouter.post('/', requireAccess('imaging', 'write'), async (req, res) => {
  const { examType } = req.body ?? {}
  if (typeof examType !== 'string' || !examType.trim()) {
    res.status(400).json({ ok: false, error: "Type d'examen requis." })
    return
  }

  const request = await createImagingRequest(req.body)
  await logAudit(req.auth!.userId, 'imaging_request.create', 'ImagingRequest', request.id)
  res.status(201).json({ ok: true, request })
})

imagingRouter.patch('/:id', requireAccess('imaging', 'write'), async (req, res) => {
  const request = await updateImagingRequest(req.params.id, req.body ?? {})
  await logAudit(req.auth!.userId, 'imaging_request.update', 'ImagingRequest', request.id)
  res.json({ ok: true, request })
})

imagingRouter.delete('/:id', requireAccess('imaging', 'full'), async (req, res) => {
  await deleteImagingRequest(req.params.id)
  await logAudit(req.auth!.userId, 'imaging_request.delete', 'ImagingRequest', req.params.id)
  res.json({ ok: true })
})

// --- Fichier de résultat (item 9 PETITES MODIFS) ------------------------------------------------

imagingRouter.get('/:id/file', async (req, res) => {
  const file = await getImagingResultFile(req.params.id)
  if (!file) {
    res.status(404).json({ ok: false, error: 'Aucun fichier pour cet examen.' })
    return
  }
  res.json({ ok: true, document: file })
})

imagingRouter.post('/:id/file', requireAccess('imaging', 'write'), upload.single('file'), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ ok: false, error: 'Aucun fichier reçu.' })
    return
  }

  const request = await uploadImagingResultFile(req.params.id, {
    fileName: req.file.originalname,
    mimeType: req.file.mimetype,
    content: req.file.buffer
  })
  await logAudit(req.auth!.userId, 'imaging_request.uploadFile', 'ImagingRequest', req.params.id)
  res.json({ ok: true, request })
})
