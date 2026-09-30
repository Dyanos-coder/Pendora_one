import { Router } from 'express'
import { requireAccess, requireAuth } from '../middleware/auth.middleware'
import {
  createAudit,
  deleteAudit,
  listAuditFindings,
  listAudits,
  listComplianceFrameworks,
  updateAudit
} from '../services/audit.compliance.service'
import { logAudit } from '../services/audit.service'

const AUDIT_TYPES = ['INTERNE', 'EXTERNE']

export const auditComplianceRouter = Router()

auditComplianceRouter.use(requireAuth)
auditComplianceRouter.use(requireAccess('audit-compliance', 'read'))

auditComplianceRouter.get('/', async (_req, res) => {
  const audits = await listAudits()
  res.json({ ok: true, audits })
})

auditComplianceRouter.post('/', requireAccess('audit-compliance', 'write'), async (req, res) => {
  const { title, type, service, scheduledAt } = req.body ?? {}
  if (
    typeof title !== 'string' ||
    !title.trim() ||
    typeof type !== 'string' ||
    !AUDIT_TYPES.includes(type) ||
    typeof service !== 'string' ||
    !service.trim() ||
    typeof scheduledAt !== 'string'
  ) {
    res.status(400).json({ ok: false, error: 'Champs invalides.' })
    return
  }

  const audit = await createAudit(req.body)
  await logAudit(req.auth!.userId, 'audit.create', 'Audit', audit.id)
  res.status(201).json({ ok: true, audit })
})

auditComplianceRouter.patch('/:id', requireAccess('audit-compliance', 'write'), async (req, res) => {
  const audit = await updateAudit(req.params.id, req.body ?? {})
  await logAudit(req.auth!.userId, 'audit.update', 'Audit', audit.id)
  res.json({ ok: true, audit })
})

auditComplianceRouter.delete('/:id', requireAccess('audit-compliance', 'full'), async (req, res) => {
  await deleteAudit(req.params.id)
  await logAudit(req.auth!.userId, 'audit.delete', 'Audit', req.params.id)
  res.json({ ok: true })
})

auditComplianceRouter.get('/findings', async (_req, res) => {
  const findings = await listAuditFindings()
  res.json({ ok: true, findings })
})

auditComplianceRouter.get('/frameworks', async (_req, res) => {
  const frameworks = await listComplianceFrameworks()
  res.json({ ok: true, frameworks })
})
