import { Router } from 'express'
import { requireAuth, requireDirigeant } from '../middleware/auth.middleware'
import { listUserActivity } from '../services/audit.service'
import { CannotSuspendSelfError, listUsers, setUserActive } from '../services/users.service'

export const usersRouter = Router()

usersRouter.use(requireAuth)
usersRouter.use(requireDirigeant)

usersRouter.get('/', async (_req, res) => {
  const users = await listUsers()
  res.json({ ok: true, users })
})

usersRouter.patch('/:id', async (req, res) => {
  const { isActive } = req.body ?? {}

  if (typeof isActive !== 'boolean') {
    res.status(400).json({ ok: false, error: 'Champ isActive invalide.' })
    return
  }

  try {
    const user = await setUserActive(req.params.id, isActive, req.auth!.userId)
    res.json({ ok: true, user })
  } catch (err) {
    if (err instanceof CannotSuspendSelfError) {
      res.status(400).json({ ok: false, error: err.message })
      return
    }
    throw err
  }
})

usersRouter.get('/:id/activity', async (req, res) => {
  const page = Number(req.query['page'] ?? 1)
  const result = await listUserActivity(req.params.id, page)
  res.json({ ok: true, ...result })
})
