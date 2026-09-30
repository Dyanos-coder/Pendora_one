import { Router } from 'express'
import { requireAccess, requireAuth } from '../middleware/auth.middleware'
import { listEmployees, listUnlinkedEmployees } from '../services/employees.service'

export const employeesRouter = Router()

employeesRouter.use(requireAuth)
employeesRouter.use(requireAccess('employees', 'read'))

employeesRouter.get('/', async (_req, res) => {
  const employees = await listEmployees()
  res.json({ ok: true, employees })
})

// Alimente le sélecteur de rattachement compte↔employé à la création d'un utilisateur (Settings).
employeesRouter.get('/unlinked', async (_req, res) => {
  const employees = await listUnlinkedEmployees()
  res.json({ ok: true, employees })
})
