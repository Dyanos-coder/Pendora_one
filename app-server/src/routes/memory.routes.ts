import { Router } from 'express'
import { requireAuth } from '../middleware/auth.middleware'
import {
  askInConversation,
  createConversation,
  getConversationMessages,
  listConversations,
  renameConversation
} from '../services/memory-conversation.service'
import { logAudit } from '../services/audit.service'

export const memoryRouter = Router()

memoryRouter.use(requireAuth)

memoryRouter.get('/conversations', async (_req, res) => {
  const conversations = await listConversations()
  res.json({ ok: true, conversations })
})

memoryRouter.post('/conversations', async (req, res) => {
  const title = typeof req.body?.title === 'string' ? req.body.title : undefined
  const conversation = await createConversation(title)
  res.status(201).json({ ok: true, conversation })
})

memoryRouter.patch('/conversations/:id', async (req, res) => {
  const { title } = req.body ?? {}
  if (typeof title !== 'string' || !title.trim()) {
    res.status(400).json({ ok: false, error: 'Titre requis.' })
    return
  }
  const conversation = await renameConversation(req.params.id, title)
  res.json({ ok: true, conversation })
})

memoryRouter.get('/conversations/:id/messages', async (req, res) => {
  const messages = await getConversationMessages(req.params.id)
  res.json({ ok: true, messages })
})

memoryRouter.post('/conversations/:id/messages', async (req, res) => {
  const { question } = req.body ?? {}

  if (typeof question !== 'string' || !question.trim()) {
    res.status(400).json({ ok: false, error: 'Question requise.' })
    return
  }

  const answer = await askInConversation(req.params.id, question.trim())
  await logAudit(req.auth!.userId, 'memory.question.ask', 'MemoryConversation', req.params.id)
  res.json({ ok: true, answer })
})
