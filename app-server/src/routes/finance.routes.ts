import { Router } from 'express'
import { requireAuth } from '../middleware/auth.middleware'
import { upload } from '../upload'
import { createInvoice, getFinanceSummary, getInvoiceWithPhoto, listInvoices } from '../services/finance.service'
import { getCompany } from '../services/company.service'
import { streamInvoicePdf } from '../pdf/invoice-pdf'
import { logAudit } from '../services/audit.service'

export const financeRouter = Router()

financeRouter.use(requireAuth)

financeRouter.get('/transactions', async (req, res) => {
  const page = Number(req.query['page'] ?? 1)
  const result = await listInvoices(page)
  res.json({ ok: true, ...result })
})

financeRouter.post('/transactions', upload.single('photo'), async (req, res) => {
  const { reference, description, partyName, status } = req.body ?? {}
  const amount = Number(req.body?.amount)

  if (
    typeof reference !== 'string' ||
    typeof description !== 'string' ||
    typeof partyName !== 'string' ||
    Number.isNaN(amount) ||
    !['PAYE', 'EN_ATTENTE', 'EN_RETARD'].includes(status)
  ) {
    res.status(400).json({ ok: false, error: 'Champs invalides.' })
    return
  }

  const invoice = await createInvoice({
    reference,
    description,
    partyName,
    amount,
    status,
    photo: req.file ? { data: req.file.buffer, mimeType: req.file.mimetype } : undefined
  })
  await logAudit(req.auth!.userId, 'finance.invoice.create', 'Invoice', invoice.id)
  res.status(201).json({ ok: true, invoice })
})

// Renvoie la photo jointe si elle existe, sinon génère un PDF de secours (logo + détails).
financeRouter.get('/transactions/:id/media', async (req, res) => {
  const invoice = await getInvoiceWithPhoto(req.params.id)
  if (!invoice) {
    res.status(404).json({ ok: false, error: 'Facture introuvable.' })
    return
  }

  if (invoice.photo && invoice.photoMimeType) {
    res.setHeader('Content-Type', invoice.photoMimeType)
    res.send(Buffer.from(invoice.photo))
    return
  }

  const company = await getCompany()
  streamInvoicePdf(
    res,
    {
      reference: invoice.reference,
      description: invoice.description,
      partyName: invoice.partyName,
      amount: invoice.amount,
      status: invoice.status,
      issuedAt: invoice.issuedAt
    },
    {
      name: company?.name ?? 'Entreprise',
      logo: company?.logo ? Buffer.from(company.logo) : null
    }
  )
})

financeRouter.get('/summary', async (_req, res) => {
  const summary = await getFinanceSummary()
  res.json({ ok: true, ...summary })
})
