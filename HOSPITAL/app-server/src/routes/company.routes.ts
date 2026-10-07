import { Router } from 'express'
import { requireAccess, requireAuth } from '../middleware/auth.middleware'
import { getCompany, updateCompany } from '../services/company.service'
import { logAudit } from '../services/audit.service'

export const companyRouter = Router()
companyRouter.use(requireAuth)
companyRouter.use(requireAccess('settings', 'read'))

companyRouter.get('/', async (_req, res) => {
  const company = await getCompany()
  res.json({ ok: true, company })
})

companyRouter.patch('/', requireAccess('settings', 'write'), async (req, res) => {
  const { name, sector, address, phone, contactEmail, timezone, enabledModules, latitude, longitude } = req.body ?? {}
  const nullableStringFields: [string, unknown][] = [
    ['sector', sector],
    ['address', address],
    ['phone', phone],
    ['contactEmail', contactEmail],
    ['timezone', timezone]
  ]
  if (name !== undefined && typeof name !== 'string') {
    res.status(400).json({ ok: false, error: 'Nom invalide.' })
    return
  }
  for (const [field, value] of nullableStringFields) {
    if (value !== undefined && value !== null && typeof value !== 'string') {
      res.status(400).json({ ok: false, error: `Champ invalide : ${field}.` })
      return
    }
  }
  if (
    enabledModules !== undefined &&
    enabledModules !== null &&
    (!Array.isArray(enabledModules) || enabledModules.some((m: unknown) => typeof m !== 'string'))
  ) {
    res.status(400).json({ ok: false, error: 'Liste de modules invalide.' })
    return
  }
  for (const [field, value] of [
    ['latitude', latitude],
    ['longitude', longitude]
  ] as [string, unknown][]) {
    if (value !== undefined && value !== null && typeof value !== 'number') {
      res.status(400).json({ ok: false, error: `Champ invalide : ${field}.` })
      return
    }
  }

  const company = await updateCompany(req.body ?? {})
  await logAudit(req.auth!.userId, 'company.update', 'Company', company.id)
  res.json({ ok: true, company })
})
