import { Router } from 'express'
import { requireAccess, requireAuth } from '../middleware/auth.middleware'
import {
  createProtocolDocument,
  deleteProtocolDocument,
  listProtocolDocuments,
  updateProtocolDocument
} from '../services/documents.service'
import { logAudit } from '../services/audit.service'

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
