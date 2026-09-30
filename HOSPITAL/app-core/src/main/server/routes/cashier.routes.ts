import { Router, type NextFunction, type Request, type Response } from 'express'
import { requireAccess, requireAnyAccess, requireAuth } from '../middleware/auth.middleware'
import { logAudit } from '../services/audit.service'
import {
  CashierError,
  cancelReceipt,
  closeSession,
  createReceipt,
  exportReceipts,
  getReceipt,
  getReceiptPrintData,
  getSession,
  listEligibleCashiers,
  listPendingExams,
  listReceipts,
  listRegisters,
  listSessions,
  listTariffs,
  openSession,
  quickCreatePatient,
  refundReceipt,
  saveRegister,
  saveTariff
} from '../services/cashier.service'
import type { ReceiptFilters } from '../../../shared/cashier-types'

// Module Caisse (Plan-Module-Caisse.md). Droits (src/shared/permissions.ts, domaine `cashier`) :
// lecture = consulter caisses/journaux, écriture = encaisser (CAISSIER), full = administrer les
// caisses, le catalogue et rembourser (DIRIGEANT). Les journaux sont aussi lisibles depuis la
// Comptabilité (domaine `finance`).

export const cashierRouter = Router()

cashierRouter.use(requireAuth)

const readJournals = requireAnyAccess([
  ['cashier', 'read'],
  ['finance', 'read']
])

/** Traduit une règle métier non respectée (CashierError) en 400 avec son message. */
function handle(fn: (req: Request, res: Response) => Promise<void>) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await fn(req, res)
    } catch (error) {
      if (error instanceof CashierError) {
        res.status(400).json({ ok: false, error: error.message })
        return
      }
      next(error)
    }
  }
}

function filtersFrom(req: Request): ReceiptFilters {
  const q = req.query
  const str = (v: unknown): string | undefined => (typeof v === 'string' && v ? v : undefined)
  return { from: str(q.from), to: str(q.to), registerId: str(q.registerId), sessionId: str(q.sessionId) }
}

// --- Journaux (Caisse + Comptabilité) ---------------------------------------------------------

cashierRouter.get('/receipts/export', readJournals, handle(async (req, res) => {
  res.json({ ok: true, document: await exportReceipts(filtersFrom(req)) })
}))

cashierRouter.get('/receipts', readJournals, handle(async (req, res) => {
  res.json({ ok: true, receipts: await listReceipts(filtersFrom(req)) })
}))

cashierRouter.get('/sessions', readJournals, handle(async (req, res) => {
  res.json({ ok: true, sessions: await listSessions(filtersFrom(req)) })
}))

// --- Lecture propre à la caisse ---------------------------------------------------------------

cashierRouter.use(requireAccess('cashier', 'read'))

cashierRouter.get('/registers', handle(async (_req, res) => {
  res.json({ ok: true, registers: await listRegisters() })
}))

cashierRouter.get('/tariffs', handle(async (_req, res) => {
  res.json({ ok: true, tariffs: await listTariffs() })
}))

cashierRouter.get('/sessions/:id', handle(async (req, res) => {
  res.json({ ok: true, session: await getSession(req.params.id) })
}))

cashierRouter.get('/receipts/:id', handle(async (req, res) => {
  res.json({ ok: true, receipt: await getReceipt(req.params.id) })
}))

cashierRouter.get('/receipts/:id/print-data', handle(async (req, res) => {
  res.json({ ok: true, data: await getReceiptPrintData(req.params.id) })
}))

cashierRouter.get('/patients/:id/pending-exams', handle(async (req, res) => {
  res.json({ ok: true, exams: await listPendingExams(req.params.id) })
}))

// --- Encaissement (caissier) ------------------------------------------------------------------

cashierRouter.post('/registers/:id/open', requireAccess('cashier', 'write'), handle(async (req, res) => {
  const sessionId = await openSession(req.auth!, req.params.id, Number(req.body?.openingFloat ?? 0))
  await logAudit(req.auth!.userId, 'cash_session.open', 'CashSession', sessionId)
  res.status(201).json({ ok: true, session: await getSession(sessionId) })
}))

cashierRouter.post('/sessions/:id/close', requireAccess('cashier', 'write'), handle(async (req, res) => {
  const session = await closeSession(req.auth!, req.params.id, req.body ?? {})
  await logAudit(req.auth!.userId, 'cash_session.close', 'CashSession', session.id)
  res.json({ ok: true, session })
}))

cashierRouter.post('/patients', requireAccess('cashier', 'write'), handle(async (req, res) => {
  const patient = await quickCreatePatient(req.body ?? {})
  await logAudit(req.auth!.userId, 'patient.create', 'Patient', patient.id)
  res.status(201).json({ ok: true, patient })
}))

cashierRouter.post('/receipts', requireAccess('cashier', 'write'), handle(async (req, res) => {
  const receipt = await createReceipt(req.auth!, req.body ?? {})
  await logAudit(req.auth!.userId, 'receipt.create', 'Receipt', receipt.id)
  res.status(201).json({ ok: true, receipt })
}))

cashierRouter.post('/receipts/:id/cancel', requireAccess('cashier', 'write'), handle(async (req, res) => {
  const receipt = await cancelReceipt(req.auth!, req.params.id, String(req.body?.reason ?? ''))
  await logAudit(req.auth!.userId, 'receipt.cancel', 'Receipt', receipt.id)
  res.json({ ok: true, receipt })
}))

// --- Administration (dirigeant) ---------------------------------------------------------------

cashierRouter.post('/receipts/:id/refund', requireAccess('cashier', 'full'), handle(async (req, res) => {
  const receipt = await refundReceipt(req.auth!, req.params.id, String(req.body?.reason ?? ''))
  await logAudit(req.auth!.userId, 'receipt.refund', 'Receipt', receipt.id)
  res.json({ ok: true, receipt })
}))

cashierRouter.get('/eligible-cashiers', requireAccess('cashier', 'full'), handle(async (_req, res) => {
  res.json({ ok: true, users: await listEligibleCashiers() })
}))

cashierRouter.post('/registers', requireAccess('cashier', 'full'), handle(async (req, res) => {
  await saveRegister(null, req.body ?? {})
  await logAudit(req.auth!.userId, 'cash_register.create', 'CashRegister', String(req.body?.name ?? ''))
  res.status(201).json({ ok: true, registers: await listRegisters() })
}))

cashierRouter.patch('/registers/:id', requireAccess('cashier', 'full'), handle(async (req, res) => {
  await saveRegister(req.params.id, req.body ?? {})
  await logAudit(req.auth!.userId, 'cash_register.update', 'CashRegister', req.params.id)
  res.json({ ok: true, registers: await listRegisters() })
}))

cashierRouter.post('/tariffs', requireAccess('cashier', 'full'), handle(async (req, res) => {
  const tariff = await saveTariff(null, req.body ?? {})
  await logAudit(req.auth!.userId, 'tariff.create', 'TariffItem', tariff.id)
  res.status(201).json({ ok: true, tariff })
}))

cashierRouter.patch('/tariffs/:id', requireAccess('cashier', 'full'), handle(async (req, res) => {
  const tariff = await saveTariff(req.params.id, req.body ?? {})
  await logAudit(req.auth!.userId, 'tariff.update', 'TariffItem', tariff.id)
  res.json({ ok: true, tariff })
}))
