import { Router } from 'express'
import { requireAccess, requireAuth } from '../middleware/auth.middleware'
import {
  countDistinctEndoscopyPatients,
  createEndoscopyProcedure,
  deleteEndoscopyProcedure,
  listEndoscopyProcedures,
  updateEndoscopyProcedure
} from '../services/endoscopy.service'
import { logAudit } from '../services/audit.service'

export const endoscopyRouter = Router()

endoscopyRouter.use(requireAuth)
endoscopyRouter.use(requireAccess('endoscopy', 'read'))

endoscopyRouter.get('/', async (_req, res) => {
  const procedures = await listEndoscopyProcedures()
  res.json({ ok: true, procedures })
})

endoscopyRouter.get('/patients-followed', async (_req, res) => {
  const count = await countDistinctEndoscopyPatients()
  res.json({ ok: true, count })
})

endoscopyRouter.post('/', requireAccess('endoscopy', 'write'), async (req, res) => {
  const { procedureType } = req.body ?? {}
  if (typeof procedureType !== 'string' || !procedureType.trim()) {
    res.status(400).json({ ok: false, error: "Type d'acte requis." })
    return
  }

  const procedure = await createEndoscopyProcedure(req.body)
  await logAudit(req.auth!.userId, 'endoscopy_procedure.create', 'EndoscopyProcedure', procedure.id)
  res.status(201).json({ ok: true, procedure })
})

endoscopyRouter.patch('/:id', requireAccess('endoscopy', 'write'), async (req, res) => {
  const procedure = await updateEndoscopyProcedure(req.params.id, req.body ?? {})
  await logAudit(req.auth!.userId, 'endoscopy_procedure.update', 'EndoscopyProcedure', procedure.id)
  res.json({ ok: true, procedure })
})

endoscopyRouter.delete('/:id', requireAccess('endoscopy', 'full'), async (req, res) => {
  await deleteEndoscopyProcedure(req.params.id)
  await logAudit(req.auth!.userId, 'endoscopy_procedure.delete', 'EndoscopyProcedure', req.params.id)
  res.json({ ok: true })
})
