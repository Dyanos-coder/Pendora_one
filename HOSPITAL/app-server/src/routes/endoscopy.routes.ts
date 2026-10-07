import { Router } from 'express'
import multer from 'multer'
import { requireAccess, requireAuth } from '../middleware/auth.middleware'
import {
  countDistinctEndoscopyPatients,
  createEndoscopyProcedure,
  deleteEndoscopyProcedure,
  getEndoscopyResultFile,
  listEndoscopyProcedures,
  updateEndoscopyProcedure,
  uploadEndoscopyResultFile
} from '../services/endoscopy.service'
import { logAudit } from '../services/audit.service'

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } })

export const endoscopyRouter = Router()

endoscopyRouter.use(requireAuth)
endoscopyRouter.use(requireAccess('endoscopy', 'read'))

endoscopyRouter.get('/', async (_req, res) => {
  const procedures = await listEndoscopyProcedures()
  res.json({ ok: true, procedures })
})

endoscopyRouter.get('/patients-followed', async (_req, res) => {
  const count = await countDistinctEndoscopyPatients()
  res.json({ ok: true, count })
})

endoscopyRouter.post('/', requireAccess('endoscopy', 'write'), async (req, res) => {
  const { procedureType } = req.body ?? {}
  if (typeof procedureType !== 'string' || !procedureType.trim()) {
    res.status(400).json({ ok: false, error: "Type d'acte requis." })
    return
  }

  const procedure = await createEndoscopyProcedure(req.body)
  await logAudit(req.auth!.userId, 'endoscopy_procedure.create', 'EndoscopyProcedure', procedure.id)
  res.status(201).json({ ok: true, procedure })
})

endoscopyRouter.patch('/:id', requireAccess('endoscopy', 'write'), async (req, res) => {
  const procedure = await updateEndoscopyProcedure(req.params.id, req.body ?? {})
  await logAudit(req.auth!.userId, 'endoscopy_procedure.update', 'EndoscopyProcedure', procedure.id)
  res.json({ ok: true, procedure })
})

endoscopyRouter.delete('/:id', requireAccess('endoscopy', 'full'), async (req, res) => {
  await deleteEndoscopyProcedure(req.params.id)
  await logAudit(req.auth!.userId, 'endoscopy_procedure.delete', 'EndoscopyProcedure', req.params.id)
  res.json({ ok: true })
})

// --- Fichier de résultat ------------------------------------------------------------------------

endoscopyRouter.get('/:id/file', async (req, res) => {
  const file = await getEndoscopyResultFile(req.params.id)
  if (!file) {
    res.status(404).json({ ok: false, error: 'Aucun fichier pour cet examen.' })
    return
  }
  res.json({ ok: true, document: file })
})

endoscopyRouter.post('/:id/file', requireAccess('endoscopy', 'write'), upload.single('file'), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ ok: false, error: 'Aucun fichier reçu.' })
    return
  }

  const procedure = await uploadEndoscopyResultFile(req.params.id, {
    fileName: req.file.originalname,
    mimeType: req.file.mimetype,
    content: req.file.buffer
  })
  await logAudit(req.auth!.userId, 'endoscopy_procedure.uploadFile', 'EndoscopyProcedure', req.params.id)
  res.json({ ok: true, procedure })
})
