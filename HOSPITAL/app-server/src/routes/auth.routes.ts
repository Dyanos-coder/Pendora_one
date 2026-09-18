import { Router } from 'express'
import { login, logout } from '../services/auth.service'
import { loginLimiter } from '../config/rate-limit'
import { requireAuth } from '../middleware/auth.middleware'

export const authRouter = Router()

authRouter.post('/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body ?? {}

  if (typeof email !== 'string' || typeof password !== 'string') {
    res.status(400).json({ ok: false, error: 'email et password requis.' })
    return
  }

  const result = await login(email, password)
  res.status(result.ok ? 200 : 401).json(result)
})

// Révoque le jeton côté serveur (voir auth.service.ts::logout) — sans cette route, se
// "déconnecter" n'effaçait que le cache local de l'app desktop : le JWT restait valable jusqu'à
// ses 30 jours d'expiration naturelle même après déconnexion.
authRouter.post('/logout', requireAuth, async (req, res) => {
  await logout(req.auth!.userId)
  res.json({ ok: true })
})
