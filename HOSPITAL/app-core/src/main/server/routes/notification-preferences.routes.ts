import { Router } from 'express'
import { requireAccess, requireAuth } from '../middleware/auth.middleware'
import { listNotificationPreferences, updateNotificationPreference } from '../services/notification-preferences.service'
import { logAudit } from '../services/audit.service'

export const notificationPreferencesRouter = Router()
notificationPreferencesRouter.use(requireAuth)
notificationPreferencesRouter.use(requireAccess('settings', 'read'))

notificationPreferencesRouter.get('/', async (_req, res) => {
  const preferences = await listNotificationPreferences()
  res.json({ ok: true, preferences })
})

notificationPreferencesRouter.patch('/:id', requireAccess('settings', 'write'), async (req, res) => {
  const { email } = req.body ?? {}
  if (email !== undefined && typeof email !== 'boolean') {
    res.status(400).json({ ok: false, error: 'Champs invalides.' })
    return
  }
  const preference = await updateNotificationPreference(req.params.id, { email })
  await logAudit(req.auth!.userId, 'notificationPreference.update', 'NotificationPreference', preference.id)
  res.json({ ok: true, preference })
})
