import { Router } from 'express'
import { requireAccess, requireAuth } from '../middleware/auth.middleware'
import {
  countDistinctCardioPatients,
  createCardioExam,
  deleteCardioExam,
  listCardioExams,
  updateCardioExam
} from '../services/cardiology.service'
import { logAudit } from '../services/audit.service'

export const cardiologyRouter = Router()

cardiologyRouter.use(requireAuth)
cardiologyRouter.use(requireAccess('cardiology', 'read'))

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
