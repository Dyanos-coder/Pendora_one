import rateLimit from 'express-rate-limit'

// Limite stricte sur la connexion — cible le brute-force sur /auth/login. Compte les tentatives
// échouées ET réussies par IP (le comportement par défaut) pour rester simple ; 10 tentatives en
// 15 min laisse largement la place à une faute de frappe sans ouvrir la porte à un brute-force.
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'Trop de tentatives de connexion. Réessayez dans quelques minutes.' }
})
