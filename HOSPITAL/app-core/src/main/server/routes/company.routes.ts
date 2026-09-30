import { Router } from 'express'
import multer from 'multer'
import { requireAccess, requireAuth } from '../middleware/auth.middleware'
import { getCompany, getCompanyLogo, LOGO_MIME_TYPES, setCompanyLogo, updateCompany } from '../services/company.service'
import { logAudit } from '../services/audit.service'

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } })

export const companyRouter = Router()
companyRouter.use(requireAuth)
companyRouter.use(requireAccess('settings', 'read'))

companyRouter.get('/', async (_req, res) => {
  const company = await getCompany()
  res.json({ ok: true, company })
})

companyRouter.patch('/', requireAccess('settings', 'write'), async (req, res) => {
  const { name, sector, address, phone, contactEmail, timezone, enabledModules, latitude, longitude, aiApiKey, registrationNumber, receiptFooter } =
    req.body ?? {}
  const nullableStringFields: [string, unknown][] = [
    ['sector', sector],
    ['address', address],
    ['phone', phone],
    ['contactEmail', contactEmail],
    ['timezone', timezone],
    ['aiApiKey', aiApiKey],
    ['registrationNumber', registrationNumber],
    ['receiptFooter', receiptFooter]
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

// --- Logo (PNG/JPEG/WebP, 2 Mo max) -------------------------------------------------------------

companyRouter.get('/logo', async (_req, res) => {
  res.json({ ok: true, logo: await getCompanyLogo() })
})

companyRouter.post('/logo', requireAccess('settings', 'write'), upload.single('file'), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ ok: false, error: 'Aucun fichier reçu.' })
    return
  }
  if (!LOGO_MIME_TYPES.includes(req.file.mimetype)) {
    res.status(400).json({ ok: false, error: 'Format non pris en charge (PNG, JPEG ou WebP).' })
    return
  }
  const company = await setCompanyLogo({ mimeType: req.file.mimetype, content: req.file.buffer })
  await logAudit(req.auth!.userId, 'company.logo.update', 'Company', company.id)
  res.json({ ok: true, company })
})

companyRouter.delete('/logo', requireAccess('settings', 'write'), async (req, res) => {
  const company = await setCompanyLogo(null)
  await logAudit(req.auth!.userId, 'company.logo.delete', 'Company', company.id)
  res.json({ ok: true, company })
})
