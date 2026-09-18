import { Router } from 'express'
import { requireAccess, requireAuth } from '../middleware/auth.middleware'
import {
  createFinanceTransaction,
  deleteFinanceTransaction,
  listFinanceTransactions,
  updateFinanceTransaction
} from '../services/finance.service'
import { logAudit } from '../services/audit.service'

export const financeRouter = Router()

financeRouter.use(requireAuth)
financeRouter.use(requireAccess('finance', 'read'))

financeRouter.get('/', async (_req, res) => {
  const transactions = await listFinanceTransactions()
  res.json({ ok: true, transactions })
})

financeRouter.post('/', requireAccess('finance', 'write'), async (req, res) => {
  const { type, party, category, amount, paymentMode } = req.body ?? {}
  if (type !== 'RECETTE' && type !== 'DEPENSE') {
    res.status(400).json({ ok: false, error: "Type d'opération invalide." })
    return
  }
  if (
    typeof party !== 'string' ||
    !party.trim() ||
    typeof category !== 'string' ||
    !category.trim() ||
    typeof amount !== 'number' ||
    typeof paymentMode !== 'string' ||
    !paymentMode.trim()
  ) {
    res.status(400).json({ ok: false, error: 'Champs invalides.' })
    return
  }

  const transaction = await createFinanceTransaction(req.body)
  await logAudit(req.auth!.userId, 'financeTransaction.create', 'FinanceTransaction', transaction.id)
  res.status(201).json({ ok: true, transaction })
})

financeRouter.patch('/:id', requireAccess('finance', 'write'), async (req, res) => {
  const transaction = await updateFinanceTransaction(req.params.id, req.body ?? {})
  await logAudit(req.auth!.userId, 'financeTransaction.update', 'FinanceTransaction', transaction.id)
  res.json({ ok: true, transaction })
})

financeRouter.delete('/:id', requireAccess('finance', 'full'), async (req, res) => {
  await deleteFinanceTransaction(req.params.id)
  await logAudit(req.auth!.userId, 'financeTransaction.delete', 'FinanceTransaction', req.params.id)
  res.json({ ok: true })
})
