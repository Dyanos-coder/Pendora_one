import { Router } from 'express'
import { requireAccess, requireAuth } from '../middleware/auth.middleware'
import { createHrEmployee, deleteHrEmployee, listHrEmployees, updateHrEmployee } from '../services/hr.service'
import { logAudit } from '../services/audit.service'

export const hrRouter = Router()

hrRouter.use(requireAuth)
hrRouter.use(requireAccess('hr', 'read'))

hrRouter.get('/', async (_req, res) => {
  const employees = await listHrEmployees()
  res.json({ ok: true, employees })
})

hrRouter.post('/', requireAccess('hr', 'write'), async (req, res) => {
  const { firstName, lastName, role } = req.body ?? {}
  if (typeof firstName !== 'string' || !firstName.trim() || typeof lastName !== 'string' || !lastName.trim()) {
    res.status(400).json({ ok: false, error: 'Prénom et nom sont requis.' })
    return
  }
  if (typeof role !== 'string' || !role.trim()) {
    res.status(400).json({ ok: false, error: 'Rôle requis.' })
    return
  }

  const employee = await createHrEmployee(req.body)
  await logAudit(req.auth!.userId, 'employee.create', 'Employee', employee.id)
  res.status(201).json({ ok: true, employee })
})

hrRouter.patch('/:id', requireAccess('hr', 'write'), async (req, res) => {
  const employee = await updateHrEmployee(req.params.id, req.body ?? {})
  await logAudit(req.auth!.userId, 'employee.update', 'Employee', employee.id)
  res.json({ ok: true, employee })
})

hrRouter.delete('/:id', requireAccess('hr', 'full'), async (req, res) => {
  await deleteHrEmployee(req.params.id)
  await logAudit(req.auth!.userId, 'employee.delete', 'Employee', req.params.id)
  res.json({ ok: true })
})
