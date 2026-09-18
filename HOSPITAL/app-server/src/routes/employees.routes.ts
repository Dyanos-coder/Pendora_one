import { Router } from 'express'
import { requireAccess, requireAuth } from '../middleware/auth.middleware'
import { listEmployees } from '../services/employees.service'

export const employeesRouter = Router()

employeesRouter.use(requireAuth)
employeesRouter.use(requireAccess('employees', 'read'))

employeesRouter.get('/', async (_req, res) => {
  const employees = await listEmployees()
  res.json({ ok: true, employees })
})
