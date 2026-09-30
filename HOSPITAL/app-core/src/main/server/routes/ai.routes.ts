import { Router } from 'express'
import { requireAccess, requireAuth } from '../middleware/auth.middleware'
import {
  askInConversation,
  createConversation,
  getConversationMessages,
  listConversations,
  renameConversation
} from '../services/ai-conversation.service'
import { logAudit } from '../services/audit.service'
import { listCalculatedAlerts } from '../services/ai-predictions.service'

export const aiRouter = Router()

aiRouter.use(requireAuth)
aiRouter.use(requireAccess('ai', 'read'))

aiRouter.get('/alerts', async (_req, res) => {
  const alerts = await listCalculatedAlerts()
  res.json({ ok: true, alerts })
})

aiRouter.get('/conversations', async (_req, res) => {
  const conversations = await listConversations()
  res.json({ ok: true, conversations })
})

aiRouter.post('/conversations', requireAccess('ai', 'write'), async (req, res) => {
  const title = typeof req.body?.title === 'string' ? req.body.title : undefined
  const conversation = await createConversation(title)
  res.status(201).json({ ok: true, conversation })
})

aiRouter.patch('/conversations/:id', requireAccess('ai', 'write'), async (req, res) => {
  const { title } = req.body ?? {}
  if (typeof title !== 'string' || !title.trim()) {
    res.status(400).json({ ok: false, error: 'Titre requis.' })
    return
  }
  const conversation = await renameConversation(req.params.id, title)
  res.json({ ok: true, conversation })
})

aiRouter.get('/conversations/:id/messages', async (req, res) => {
  const messages = await getConversationMessages(req.params.id)
  res.json({ ok: true, messages })
})

aiRouter.post('/conversations/:id/messages', requireAccess('ai', 'write'), async (req, res) => {
  const { question } = req.body ?? {}

  if (typeof question !== 'string' || !question.trim()) {
    res.status(400).json({ ok: false, error: 'Question requise.' })
    return
  }

  const answer = await askInConversation(req.params.id, question.trim())
  await logAudit(req.auth!.userId, 'ai.question.ask', 'AiConversation', req.params.id)
  res.json({ ok: true, answer })
})
