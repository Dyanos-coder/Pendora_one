import { Router } from 'express'
import { requireAccess, requireAuth } from '../middleware/auth.middleware'
import { getPrismaClient } from '../db/client'
import { changeOwnPassword, createUser, listUsers, resetUserPassword, updateUser } from '../services/users.service'
import { logAudit } from '../services/audit.service'
import type { Role } from '../types'

export const usersRouter = Router()

const VALID_ROLES: Role[] = ['DIRIGEANT', 'MEDECIN', 'INFIRMIER', 'TECHNICIEN', 'PHARMACIEN', 'ADMINISTRATIF']

usersRouter.use(requireAuth)

// Changement de son propre mot de passe — ouvert à tous les rôles authentifiés, volontairement
// posé avant la porte RBAC ci-dessous (la matrice `users` ne concerne que la gestion des comptes
// d'autrui, réservée au DIRIGEANT).
usersRouter.post('/me/change-password', async (req, res) => {
  const { currentPassword, newPassword } = req.body ?? {}
  if (typeof currentPassword !== 'string' || typeof newPassword !== 'string' || newPassword.length < 8) {
    res.status(400).json({ ok: false, error: 'Le nouveau mot de passe doit contenir au moins 8 caractères.' })
    return
  }

  const result = await changeOwnPassword(req.auth!.userId, currentPassword, newPassword)
  if (!result.ok) {
    res.status(400).json(result)
    return
  }
  await logAudit(req.auth!.userId, 'user.changeOwnPassword', 'User', req.auth!.userId)
  res.json({ ok: true })
})

usersRouter.use(requireAccess('users', 'read'))

usersRouter.get('/', async (_req, res) => {
  const users = await listUsers()
  res.json({ ok: true, users })
})

usersRouter.post('/', requireAccess('users', 'write'), async (req, res) => {
  const { email, password, name, role, employeeId } = req.body ?? {}
  if (
    typeof email !== 'string' ||
    !email.trim() ||
    typeof password !== 'string' ||
    password.length < 8 ||
    typeof name !== 'string' ||
    !name.trim() ||
    typeof role !== 'string' ||
    !VALID_ROLES.includes(role as Role) ||
    (employeeId !== undefined && typeof employeeId !== 'string')
  ) {
    res.status(400).json({ ok: false, error: 'Champs invalides (mot de passe : 8 caractères minimum).' })
    return
  }

  const prisma = getPrismaClient()
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    res.status(400).json({ ok: false, error: 'Cet email est déjà utilisé.' })
    return
  }

  if (employeeId) {
    const employee = await prisma.employee.findUnique({ where: { id: employeeId } })
    if (!employee) {
      res.status(400).json({ ok: false, error: 'Fiche employé introuvable.' })
      return
    }
    if (employee.userId) {
      res.status(400).json({ ok: false, error: 'Cette fiche employé est déjà rattachée à un autre compte.' })
      return
    }
  }

  const user = await createUser({ email, password, name, role: role as Role, employeeId })
  await logAudit(req.auth!.userId, 'user.create', 'User', user.id)
  res.status(201).json({ ok: true, user })
})

usersRouter.patch('/:id', requireAccess('users', 'write'), async (req, res) => {
  const { name, email, role, isActive } = req.body ?? {}
  if (role !== undefined && !VALID_ROLES.includes(role as Role)) {
    res.status(400).json({ ok: false, error: 'Rôle invalide.' })
    return
  }
  if (name !== undefined && (typeof name !== 'string' || !name.trim())) {
    res.status(400).json({ ok: false, error: 'Nom invalide.' })
    return
  }
  if (email !== undefined && (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
    res.status(400).json({ ok: false, error: 'Email invalide.' })
    return
  }
  if (isActive !== undefined && typeof isActive !== 'boolean') {
    res.status(400).json({ ok: false, error: 'Champ isActive invalide.' })
    return
  }
  if (req.params.id === req.auth!.userId && isActive === false) {
    res.status(400).json({ ok: false, error: 'Vous ne pouvez pas suspendre votre propre compte.' })
    return
  }

  if (email !== undefined) {
    const prisma = getPrismaClient()
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing && existing.id !== req.params.id) {
      res.status(400).json({ ok: false, error: 'Cet email est déjà utilisé.' })
      return
    }
  }

  const user = await updateUser(req.params.id, { name, email, role, isActive })
  await logAudit(req.auth!.userId, 'user.update', 'User', user.id)
  res.json({ ok: true, user })
})

usersRouter.post('/:id/reset-password', requireAccess('users', 'write'), async (req, res) => {
  const { newPassword } = req.body ?? {}
  if (typeof newPassword !== 'string' || newPassword.length < 8) {
    res.status(400).json({ ok: false, error: 'Le nouveau mot de passe doit contenir au moins 8 caractères.' })
    return
  }

  await resetUserPassword(req.params.id, newPassword)
  await logAudit(req.auth!.userId, 'user.resetPassword', 'User', req.params.id)
  res.json({ ok: true })
})
