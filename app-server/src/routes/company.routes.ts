import { Router } from 'express'
import { requireAuth } from '../middleware/auth.middleware'
import { upload } from '../upload'
import { getCompanyLogo, updateCompanyLogo } from '../services/company.service'
import { logAudit } from '../services/audit.service'

export const companyRouter = Router()

companyRouter.use(requireAuth)

companyRouter.get('/logo', async (_req, res) => {
  const logo = await getCompanyLogo()
  if (!logo) {
    res.status(404).json({ ok: false, error: 'Aucun logo configuré.' })
    return
  }
  res.setHeader('Content-Type', logo.mimeType)
  res.send(logo.data)
})

companyRouter.post('/logo', upload.single('logo'), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ ok: false, error: 'Fichier logo requis.' })
    return
  }
  await updateCompanyLogo(req.file.buffer, req.file.mimetype)
  await logAudit(req.auth!.userId, 'company.logo.update', 'Company')
  res.json({ ok: true })
})
