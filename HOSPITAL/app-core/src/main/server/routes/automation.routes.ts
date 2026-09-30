import { Router } from 'express'
import { requireAccess, requireAuth } from '../middleware/auth.middleware'
import { listAutomationLogs, listAutomationRules, toggleAutomationRule } from '../services/automation.service'
import { logAudit } from '../services/audit.service'

export const automationRouter = Router()

automationRouter.use(requireAuth)
automationRouter.use(requireAccess('automation', 'read'))

automationRouter.get('/', async (_req, res) => {
  const rules = await listAutomationRules()
  res.json({ ok: true, rules })
})

automationRouter.get('/logs', async (_req, res) => {
  const logs = await listAutomationLogs()
  res.json({ ok: true, logs })
})

automationRouter.patch('/:id', requireAccess('automation', 'write'), async (req, res) => {
  const { active } = req.body ?? {}
  if (typeof active !== 'boolean') {
    res.status(400).json({ ok: false, error: 'Champ "active" invalide.' })
    return
  }

  const rule = await toggleAutomationRule(req.params.id, active)
  await logAudit(req.auth!.userId, active ? 'automationRule.activate' : 'automationRule.deactivate', 'AutomationRule', rule.id)
  res.json({ ok: true, rule })
})
