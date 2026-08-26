import { Router } from 'express'
import { login } from '../services/auth.service'

export const authRouter = Router()

authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body ?? {}

  if (typeof email !== 'string' || typeof password !== 'string') {
    res.status(400).json({ ok: false, error: 'email et password requis.' })
    return
  }

  const result = await login(email, password)
  res.status(result.ok ? 200 : 401).json(result)
})
