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
import {
  SIGNATURE_MIME_TYPES,
  SignatureError,
  getUserSignature,
  listSignatureRequests,
  refuseRequest,
  requestSignature,
  requestSignatureForNewDocument,
  setUserSignature,
  signRequest
} from '../services/signature.service'
import type { NextFunction, Request, Response } from 'express'

// Mémoire uniquement (pas de fichier temporaire sur disque) — le contenu part directement en
// BLOB dans la base juste après (voir documents.service.ts::uploadProtocolDocumentFile).
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } })

export const documentsRouter = Router()

documentsRouter.use(requireAuth)
documentsRouter.use(requireAccess('documents', 'read'))

// --- Signature électronique (avant les routes /:id) ------------------------------------------

/** Traduit une règle métier non respectée (SignatureError) en 400 avec son message. */
function handle(fn: (req: Request, res: Response) => Promise<void>) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await fn(req, res)
    } catch (error) {
      if (error instanceof SignatureError) {
        res.status(400).json({ ok: false, error: error.message })
        return
      }
      next(error)
    }
  }
}

const signatureUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } })

documentsRouter.get('/signature/me', handle(async (req, res) => {
  res.json({ ok: true, signature: await getUserSignature(req.auth!.userId) })
}))

// Signature du dirigeant uniquement (c'est lui qui signe).
documentsRouter.post('/signature/me', requireAccess('documents', 'full'), signatureUpload.single('file'), handle(async (req, res) => {
  if (!req.file) {
    res.status(400).json({ ok: false, error: 'Aucun fichier reçu.' })
    return
  }
  if (!SIGNATURE_MIME_TYPES.includes(req.file.mimetype)) {
    res.status(400).json({ ok: false, error: 'Format non pris en charge (PNG ou JPEG).' })
    return
  }
  await setUserSignature(req.auth!.userId, { mimeType: req.file.mimetype, content: req.file.buffer })
  await logAudit(req.auth!.userId, 'signature.upload', 'User', req.auth!.userId)
  res.json({ ok: true, signature: await getUserSignature(req.auth!.userId) })
}))

documentsRouter.delete('/signature/me', requireAccess('documents', 'full'), handle(async (req, res) => {
  await setUserSignature(req.auth!.userId, null)
  await logAudit(req.auth!.userId, 'signature.delete', 'User', req.auth!.userId)
  res.json({ ok: true })
}))

documentsRouter.get('/signature-requests', handle(async (req, res) => {
  res.json({ ok: true, requests: await listSignatureRequests(req.auth!) })
}))

// Demande de signature d'un document existant — ouverte à tous les utilisateurs.
documentsRouter.post('/signature-requests', handle(async (req, res) => {
  const request = await requestSignature(req.auth!, String(req.body?.documentId ?? ''), req.body?.message)
  await logAudit(req.auth!.userId, 'signature_request.create', 'SignatureRequest', request.id)
  res.status(201).json({ ok: true, request })
}))

// Demande de signature d'un nouveau PDF, téléversé avec la demande — ouverte à tous les utilisateurs.
documentsRouter.post('/signature-requests/upload', upload.single('file'), handle(async (req, res) => {
  if (!req.file) {
    res.status(400).json({ ok: false, error: 'Aucun fichier reçu.' })
    return
  }
  const request = await requestSignatureForNewDocument(req.auth!, {
    title: String(req.body?.title ?? ''),
    message: req.body?.message ? String(req.body.message) : null,
    fileName: req.file.originalname,
    mimeType: req.file.mimetype,
    content: req.file.buffer
  })
  await logAudit(req.auth!.userId, 'signature_request.create', 'SignatureRequest', request.id)
  res.status(201).json({ ok: true, request })
}))

documentsRouter.post('/signature-requests/:id/sign', requireAccess('documents', 'full'), handle(async (req, res) => {
  const request = await signRequest(req.auth!, req.params.id)
  await logAudit(req.auth!.userId, 'signature_request.sign', 'SignatureRequest', request.id)
  res.json({ ok: true, request })
}))

documentsRouter.post('/signature-requests/:id/refuse', requireAccess('documents', 'full'), handle(async (req, res) => {
  const request = await refuseRequest(req.auth!, req.params.id, String(req.body?.reason ?? ''))
  await logAudit(req.auth!.userId, 'signature_request.refuse', 'SignatureRequest', request.id)
  res.json({ ok: true, request })
}))

// --- Documents ----------------------------------------------------------------------------------

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
