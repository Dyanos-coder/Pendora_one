import { Router } from 'express'
import { requireAccess, requireAuth } from '../middleware/auth.middleware'
import {
  createFinanceTransaction,
  deleteFinanceTransaction,
  exportFinanceTransactions,
  listFinanceTransactions,
  updateFinanceTransaction
} from '../services/finance.service'
import {
  createSupplierInvoice,
  deleteSupplierInvoice,
  listSupplierInvoices,
  updateSupplierInvoice
} from '../services/finance-supplier-invoices.service'
import {
  createPaymentReceived,
  deletePaymentReceived,
  listPaymentsReceived,
  updatePaymentReceived
} from '../services/finance-payments.service'
import {
  createServiceExpense,
  deleteServiceExpense,
  listServiceExpenses,
  updateServiceExpense
} from '../services/finance-service-expenses.service'
import { createBudget, deleteBudget, listBudgets, updateBudget } from '../services/finance-budgets.service'
import {
  createBankAccount,
  deleteBankAccount,
  listBankAccounts,
  updateBankAccount
} from '../services/finance-bank-accounts.service'
import { logAudit } from '../services/audit.service'

export const financeRouter = Router()

financeRouter.use(requireAuth)
financeRouter.use(requireAccess('finance', 'read'))

// Doit rester avant toute route GET /:id du même routeur.
financeRouter.get('/export', async (_req, res) => {
  const document = await exportFinanceTransactions()
  res.json({ ok: true, document })
})

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

// --- Factures fournisseurs (item 14) -------------------------------------------------------------

financeRouter.get('/supplier-invoices', async (_req, res) => {
  const invoices = await listSupplierInvoices()
  res.json({ ok: true, invoices })
})

financeRouter.post('/supplier-invoices', requireAccess('finance', 'write'), async (req, res) => {
  const { amount } = req.body ?? {}
  if (typeof amount !== 'number') {
    res.status(400).json({ ok: false, error: 'Montant requis.' })
    return
  }

  const invoice = await createSupplierInvoice(req.body)
  await logAudit(req.auth!.userId, 'supplierInvoice.create', 'SupplierInvoice', invoice.id)
  res.status(201).json({ ok: true, invoice })
})

financeRouter.patch('/supplier-invoices/:id', requireAccess('finance', 'write'), async (req, res) => {
  const invoice = await updateSupplierInvoice(req.params.id, req.body ?? {})
  await logAudit(req.auth!.userId, 'supplierInvoice.update', 'SupplierInvoice', invoice.id)
  res.json({ ok: true, invoice })
})

financeRouter.delete('/supplier-invoices/:id', requireAccess('finance', 'full'), async (req, res) => {
  await deleteSupplierInvoice(req.params.id)
  await logAudit(req.auth!.userId, 'supplierInvoice.delete', 'SupplierInvoice', req.params.id)
  res.json({ ok: true })
})

// --- Paiements reçus (item 14) -------------------------------------------------------------------

financeRouter.get('/payments', async (_req, res) => {
  const payments = await listPaymentsReceived()
  res.json({ ok: true, payments })
})

financeRouter.post('/payments', requireAccess('finance', 'write'), async (req, res) => {
  const { payer, category, amount, paymentMode } = req.body ?? {}
  if (
    typeof payer !== 'string' ||
    !payer.trim() ||
    typeof category !== 'string' ||
    !category.trim() ||
    typeof amount !== 'number' ||
    typeof paymentMode !== 'string' ||
    !paymentMode.trim()
  ) {
    res.status(400).json({ ok: false, error: 'Champs invalides.' })
    return
  }

  const payment = await createPaymentReceived(req.body)
  await logAudit(req.auth!.userId, 'paymentReceived.create', 'PaymentReceived', payment.id)
  res.status(201).json({ ok: true, payment })
})

financeRouter.patch('/payments/:id', requireAccess('finance', 'write'), async (req, res) => {
  const payment = await updatePaymentReceived(req.params.id, req.body ?? {})
  await logAudit(req.auth!.userId, 'paymentReceived.update', 'PaymentReceived', payment.id)
  res.json({ ok: true, payment })
})

financeRouter.delete('/payments/:id', requireAccess('finance', 'full'), async (req, res) => {
  await deletePaymentReceived(req.params.id)
  await logAudit(req.auth!.userId, 'paymentReceived.delete', 'PaymentReceived', req.params.id)
  res.json({ ok: true })
})

// --- Dépenses par service (item 14) --------------------------------------------------------------

financeRouter.get('/service-expenses', async (_req, res) => {
  const expenses = await listServiceExpenses()
  res.json({ ok: true, expenses })
})

financeRouter.post('/service-expenses', requireAccess('finance', 'write'), async (req, res) => {
  const { service, category, amount } = req.body ?? {}
  if (
    typeof service !== 'string' ||
    !service.trim() ||
    typeof category !== 'string' ||
    !category.trim() ||
    typeof amount !== 'number'
  ) {
    res.status(400).json({ ok: false, error: 'Champs invalides.' })
    return
  }

  const expense = await createServiceExpense(req.body)
  await logAudit(req.auth!.userId, 'serviceExpense.create', 'ServiceExpense', expense.id)
  res.status(201).json({ ok: true, expense })
})

financeRouter.patch('/service-expenses/:id', requireAccess('finance', 'write'), async (req, res) => {
  const expense = await updateServiceExpense(req.params.id, req.body ?? {})
  await logAudit(req.auth!.userId, 'serviceExpense.update', 'ServiceExpense', expense.id)
  res.json({ ok: true, expense })
})

financeRouter.delete('/service-expenses/:id', requireAccess('finance', 'full'), async (req, res) => {
  await deleteServiceExpense(req.params.id)
  await logAudit(req.auth!.userId, 'serviceExpense.delete', 'ServiceExpense', req.params.id)
  res.json({ ok: true })
})

// --- Budgets (item 14) ----------------------------------------------------------------------------

financeRouter.get('/budgets', async (_req, res) => {
  const budgets = await listBudgets()
  res.json({ ok: true, budgets })
})

financeRouter.post('/budgets', requireAccess('finance', 'write'), async (req, res) => {
  const { service, year, allocatedAmount } = req.body ?? {}
  if (typeof service !== 'string' || !service.trim() || typeof year !== 'number' || typeof allocatedAmount !== 'number') {
    res.status(400).json({ ok: false, error: 'Champs invalides.' })
    return
  }

  const budget = await createBudget(req.body)
  await logAudit(req.auth!.userId, 'budget.create', 'Budget', budget.id)
  res.status(201).json({ ok: true, budget })
})

financeRouter.patch('/budgets/:id', requireAccess('finance', 'write'), async (req, res) => {
  const budget = await updateBudget(req.params.id, req.body ?? {})
  await logAudit(req.auth!.userId, 'budget.update', 'Budget', budget.id)
  res.json({ ok: true, budget })
})

financeRouter.delete('/budgets/:id', requireAccess('finance', 'full'), async (req, res) => {
  await deleteBudget(req.params.id)
  await logAudit(req.auth!.userId, 'budget.delete', 'Budget', req.params.id)
  res.json({ ok: true })
})

// --- Comptes bancaires (item 14) -------------------------------------------------------------------

financeRouter.get('/bank-accounts', async (_req, res) => {
  const accounts = await listBankAccounts()
  res.json({ ok: true, accounts })
})

financeRouter.post('/bank-accounts', requireAccess('finance', 'write'), async (req, res) => {
  const { name, bankName, accountNumber } = req.body ?? {}
  if (
    typeof name !== 'string' ||
    !name.trim() ||
    typeof bankName !== 'string' ||
    !bankName.trim() ||
    typeof accountNumber !== 'string' ||
    !accountNumber.trim()
  ) {
    res.status(400).json({ ok: false, error: 'Champs invalides.' })
    return
  }

  const account = await createBankAccount(req.body)
  await logAudit(req.auth!.userId, 'bankAccount.create', 'BankAccount', account.id)
  res.status(201).json({ ok: true, account })
})

financeRouter.patch('/bank-accounts/:id', requireAccess('finance', 'write'), async (req, res) => {
  const account = await updateBankAccount(req.params.id, req.body ?? {})
  await logAudit(req.auth!.userId, 'bankAccount.update', 'BankAccount', account.id)
  res.json({ ok: true, account })
})

financeRouter.delete('/bank-accounts/:id', requireAccess('finance', 'full'), async (req, res) => {
  await deleteBankAccount(req.params.id)
  await logAudit(req.auth!.userId, 'bankAccount.delete', 'BankAccount', req.params.id)
  res.json({ ok: true })
})
