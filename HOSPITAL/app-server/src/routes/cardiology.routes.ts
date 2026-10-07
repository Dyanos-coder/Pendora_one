import { Router } from 'express'
import multer from 'multer'
import { requireAccess, requireAuth } from '../middleware/auth.middleware'
import {
  countDistinctCardioPatients,
  createCardioExam,
  deleteCardioExam,
  exportCardioExams,
  getCardioExamResultFile,
  listCardioExams,
  updateCardioExam,
  uploadCardioExamResultFile
} from '../services/cardiology.service'
import { logAudit } from '../services/audit.service'

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } })

export const cardiologyRouter = Router()

cardiologyRouter.use(requireAuth)
cardiologyRouter.use(requireAccess('cardiology', 'read'))

// Doit rester avant toute route GET /:id du même routeur (aucune ici, mais gardé en tête par
// précaution, item 10).
cardiologyRouter.get('/export', async (_req, res) => {
  const document = await exportCardioExams()
  res.json({ ok: true, document })
})

cardiologyRouter.get('/', async (_req, res) => {
  const exams = await listCardioExams()
  res.json({ ok: true, exams })
})

cardiologyRouter.get('/patients-followed', async (_req, res) => {
  const count = await countDistinctCardioPatients()
  res.json({ ok: true, count })
})

cardiologyRouter.post('/', requireAccess('cardiology', 'write'), async (req, res) => {
  const { examType } = req.body ?? {}
  if (typeof examType !== 'string' || !examType.trim()) {
    res.status(400).json({ ok: false, error: "Type d'examen requis." })
    return
  }

  const exam = await createCardioExam(req.body)
  await logAudit(req.auth!.userId, 'cardio_exam.create', 'CardioExam', exam.id)
  res.status(201).json({ ok: true, exam })
})

cardiologyRouter.patch('/:id', requireAccess('cardiology', 'write'), async (req, res) => {
  const exam = await updateCardioExam(req.params.id, req.body ?? {})
  await logAudit(req.auth!.userId, 'cardio_exam.update', 'CardioExam', exam.id)
  res.json({ ok: true, exam })
})

cardiologyRouter.delete('/:id', requireAccess('cardiology', 'full'), async (req, res) => {
  await deleteCardioExam(req.params.id)
  await logAudit(req.auth!.userId, 'cardio_exam.delete', 'CardioExam', req.params.id)
  res.json({ ok: true })
})

// --- Fichier de résultat (item 10 PETITES MODIFS) -----------------------------------------------

cardiologyRouter.get('/:id/file', async (req, res) => {
  const file = await getCardioExamResultFile(req.params.id)
  if (!file) {
    res.status(404).json({ ok: false, error: 'Aucun fichier pour cet examen.' })
    return
  }
  res.json({ ok: true, document: file })
})

cardiologyRouter.post('/:id/file', requireAccess('cardiology', 'write'), upload.single('file'), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ ok: false, error: 'Aucun fichier reçu.' })
    return
  }

  const exam = await uploadCardioExamResultFile(req.params.id, {
    fileName: req.file.originalname,
    mimeType: req.file.mimetype,
    content: req.file.buffer
  })
  await logAudit(req.auth!.userId, 'cardio_exam.uploadFile', 'CardioExam', req.params.id)
  res.json({ ok: true, exam })
})
