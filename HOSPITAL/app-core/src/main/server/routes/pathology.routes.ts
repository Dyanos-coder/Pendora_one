import { Router } from 'express'
import multer from 'multer'
import { requireAccess, requireAuth } from '../middleware/auth.middleware'
import {
  countDistinctPathologyPatients,
  createPathologyRequest,
  deletePathologyRequest,
  exportPathologyRequests,
  getPathologyResultFile,
  listPathologyRequests,
  updatePathologyRequest,
  uploadPathologyResultFile
} from '../services/pathology.service'
import { logAudit } from '../services/audit.service'

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } })

export const pathologyRouter = Router()

pathologyRouter.use(requireAuth)
pathologyRouter.use(requireAccess('pathology', 'read'))

// Doit rester avant toute route GET /:id du même routeur (aucune ici, mais gardé en tête par
// précaution, item 10).
pathologyRouter.get('/export', async (_req, res) => {
  const document = await exportPathologyRequests()
  res.json({ ok: true, document })
})

pathologyRouter.get('/', async (_req, res) => {
  const requests = await listPathologyRequests()
  res.json({ ok: true, requests })
})

pathologyRouter.get('/patients-followed', async (_req, res) => {
  const count = await countDistinctPathologyPatients()
  res.json({ ok: true, count })
})

pathologyRouter.post('/', requireAccess('pathology', 'write'), async (req, res) => {
  const { sampleType } = req.body ?? {}
  if (typeof sampleType !== 'string' || !sampleType.trim()) {
    res.status(400).json({ ok: false, error: 'Type de prélèvement requis.' })
    return
  }

  const request = await createPathologyRequest(req.body)
  await logAudit(req.auth!.userId, 'pathology_request.create', 'PathologyRequest', request.id)
  res.status(201).json({ ok: true, request })
})

pathologyRouter.patch('/:id', requireAccess('pathology', 'write'), async (req, res) => {
  const request = await updatePathologyRequest(req.params.id, req.body ?? {})
  await logAudit(req.auth!.userId, 'pathology_request.update', 'PathologyRequest', request.id)
  res.json({ ok: true, request })
})

pathologyRouter.delete('/:id', requireAccess('pathology', 'full'), async (req, res) => {
  await deletePathologyRequest(req.params.id)
  await logAudit(req.auth!.userId, 'pathology_request.delete', 'PathologyRequest', req.params.id)
  res.json({ ok: true })
})

// --- Fichier de résultat ------------------------------------------------------------------------

pathologyRouter.get('/:id/file', async (req, res) => {
  const file = await getPathologyResultFile(req.params.id)
  if (!file) {
    res.status(404).json({ ok: false, error: 'Aucun fichier pour cette demande.' })
    return
  }
  res.json({ ok: true, document: file })
})

pathologyRouter.post('/:id/file', requireAccess('pathology', 'write'), upload.single('file'), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ ok: false, error: 'Aucun fichier reçu.' })
    return
  }

  const request = await uploadPathologyResultFile(req.params.id, {
    fileName: req.file.originalname,
    mimeType: req.file.mimetype,
    content: req.file.buffer
  })
  await logAudit(req.auth!.userId, 'pathology_request.uploadFile', 'PathologyRequest', req.params.id)
  res.json({ ok: true, request })
})
