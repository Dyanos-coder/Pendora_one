import { Router } from 'express'
import multer from 'multer'
import { requireAccess, requireAuth } from '../middleware/auth.middleware'
import {
  createProtocolDocument,
  deleteProtocolDocument,
  getProtocolDocumentFile,
  listProtocolDocuments,
  updateProtocolDocument,
  uploadProtocolDocumentFile
} from '../services/documents.service'
import { logAudit } from '../services/audit.service'

// Mémoire uniquement (pas de fichier temporaire sur disque) — le contenu part directement en
// BLOB dans la base juste après (voir documents.service.ts::uploadProtocolDocumentFile).
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } })

export const documentsRouter = Router()

documentsRouter.use(requireAuth)
documentsRouter.use(requireAccess('documents', 'read'))

documentsRouter.get('/', async (_req, res) => {
  const documents = await listProtocolDocuments()
  res.json({ ok: true, documents })
})

documentsRouter.post('/', requireAccess('documents', 'write'), async (req, res) => {
  const { title, category, version, owner } = req.body ?? {}
  if (
    typeof title !== 'string' ||
    !title.trim() ||
    typeof category !== 'string' ||
    !category.trim() ||
    typeof version !== 'string' ||
    !version.trim() ||
    typeof owner !== 'string' ||
    !owner.trim()
  ) {
    res.status(400).json({ ok: false, error: 'Champs invalides.' })
    return
  }

  const document = await createProtocolDocument(req.body)
  await logAudit(req.auth!.userId, 'protocolDocument.create', 'ProtocolDocument', document.id)
  res.status(201).json({ ok: true, document })
})

documentsRouter.patch('/:id', requireAccess('documents', 'write'), async (req, res) => {
  const document = await updateProtocolDocument(req.params.id, req.body ?? {})
  await logAudit(req.auth!.userId, 'protocolDocument.update', 'ProtocolDocument', document.id)
  res.json({ ok: true, document })
})

documentsRouter.delete('/:id', requireAccess('documents', 'full'), async (req, res) => {
  await deleteProtocolDocument(req.params.id)
  await logAudit(req.auth!.userId, 'protocolDocument.delete', 'ProtocolDocument', req.params.id)
  res.json({ ok: true })
})

documentsRouter.get('/:id/file', async (req, res) => {
  const document = await getProtocolDocumentFile(req.params.id)
  if (!document) {
    res.status(404).json({ ok: false, error: 'Aucun fichier pour ce document.' })
    return
  }
  res.json({ ok: true, document })
})

documentsRouter.post('/:id/file', requireAccess('documents', 'write'), upload.single('file'), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ ok: false, error: 'Aucun fichier reçu.' })
    return
  }

  const document = await uploadProtocolDocumentFile(req.params.id, {
    fileName: req.file.originalname,
    mimeType: req.file.mimetype,
    content: req.file.buffer
  })
  await logAudit(req.auth!.userId, 'protocolDocument.uploadFile', 'ProtocolDocument', document.id)
  res.json({ ok: true, document })
})
