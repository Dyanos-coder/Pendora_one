import { randomUUID } from 'crypto'
import { getPrismaClient } from '../db/client'
import { nextCode, nextDailyNumber } from './counter.service'
import { createPatient } from './patients.service'
import { getCompanyLogo } from './company.service'
import { buildXlsxDocument } from './xlsx-export'
import type { CashRegister, CashSession, Receipt, ReceiptLine, User } from '../generated/prisma/client'
import type { AuthTokenPayload } from '../types'
import {
  EXAM_SERVICE,
  PAYMENT_MODE_LABEL,
  PAYMENT_MODES,
  type ApiCashRegister,
  type ApiCashSession,
  type ApiExamType,
  type ApiPendingExam,
  type ApiReceipt,
  type ApiReceiptPrintData,
  type ApiTariffItem,
  type CashRegisterInput,
  type CloseSessionInput,
  type CreateReceiptInput,
  type PaymentAmounts,
  type QuickPatientInput,
  type ReceiptFilters,
  type TariffItemInput
} from '../../../shared/cashier-types'

// Module Caisse (Plan-Module-Caisse.md). Nombre de caisses illimité ; chaque encaissement produit
// un reçu numéroté (R-AAAA-000123), un n° de passage par service et par jour, et une recette en
// Comptabilité (FinanceTransaction) — la caisse ne fait qu'encaisser, la Comptabilité reçoit tout.

/** Erreur métier (règle non respectée) : renvoyée en 400 avec son message par cashier.routes.ts. */
export class CashierError extends Error {}

const EXAM_LOOKBACK_DAYS = 60

function startOfDay(date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function isSameDay(a: Date, b: Date): boolean {
  return startOfDay(a).getTime() === startOfDay(b).getTime()
}

function emptyAmounts(): PaymentAmounts {
  return { ESPECES: 0, MOBILE_MONEY: 0, CARTE: 0, PRISE_EN_CHARGE: 0 }
}

function sumAmounts(amounts: PaymentAmounts): number {
  return PAYMENT_MODES.reduce((total, mode) => total + (amounts[mode] ?? 0), 0)
}

// --- Caisses ------------------------------------------------------------------------------------

type RegisterWithRelations = CashRegister & {
  cashiers: { userId: string; user: Pick<User, 'name'> }[]
  sessions: (CashSession & { cashier: Pick<User, 'name'> })[]
}

export async function listRegisters(): Promise<ApiCashRegister[]> {
  const prisma = getPrismaClient()
  const registers = (await prisma.cashRegister.findMany({
    orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    include: {
      cashiers: { include: { user: { select: { name: true } } } },
      sessions: { where: { closedAt: null }, include: { cashier: { select: { name: true } } }, take: 1 }
    }
  })) as RegisterWithRelations[]

  const today = await prisma.receipt.groupBy({
    by: ['registerId'],
    where: { issuedAt: { gte: startOfDay() }, status: 'PAYE' },
    _sum: { amount: true },
    _count: { _all: true }
  })
  const todayByRegister = new Map(today.map((row) => [row.registerId, row]))

  return registers.map((r) => {
    const open = r.sessions[0]
    const stats = todayByRegister.get(r.id)
    return {
      id: r.id,
      name: r.name,
      location: r.location,
      receiptFormat: r.receiptFormat,
      isActive: r.isActive,
      cashierIds: r.cashiers.map((c) => c.userId),
      cashierNames: r.cashiers.map((c) => c.user.name),
      openSession: open
        ? {
            id: open.id,
            cashierId: open.cashierId,
            cashierName: open.cashier.name,
            openedAt: open.openedAt.toISOString(),
            openingFloat: open.openingFloat
          }
        : null,
      todayTotal: stats?._sum.amount ?? 0,
      todayCount: stats?._count._all ?? 0
    }
  })
}

export async function saveRegister(id: string | null, input: CashRegisterInput): Promise<void> {
  const prisma = getPrismaClient()
  const name = input.name?.trim()
  if (!name) throw new CashierError('Le nom de la caisse est obligatoire.')

  await prisma.$transaction(async (tx) => {
    const data = {
      name,
      location: input.location === undefined ? undefined : input.location?.trim() || null,
      receiptFormat: input.receiptFormat,
      isActive: input.isActive
    }
    const register = id
      ? await tx.cashRegister.update({ where: { id }, data })
      : await tx.cashRegister.create({ data: { id: randomUUID(), ...data } })
    if (input.cashierIds) {
      await tx.cashRegisterCashier.deleteMany({ where: { registerId: register.id } })
      if (input.cashierIds.length > 0) {
        await tx.cashRegisterCashier.createMany({
          data: [...new Set(input.cashierIds)].map((userId) => ({ registerId: register.id, userId }))
        })
      }
    }
  })
}

export async function listEligibleCashiers() {
  const prisma = getPrismaClient()
  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, name: true, role: true },
    orderBy: { name: 'asc' }
  })
  return users
}

// --- Sessions (ouverture / clôture) -----------------------------------------------------------

export async function openSession(auth: AuthTokenPayload, registerId: string, openingFloat: number): Promise<string> {
  const prisma = getPrismaClient()
  const register = await prisma.cashRegister.findUnique({ where: { id: registerId }, include: { cashiers: true } })
  if (!register) throw new CashierError('Caisse introuvable.')
  if (!register.isActive) throw new CashierError('Cette caisse est désactivée.')
  if (auth.role !== 'DIRIGEANT' && !register.cashiers.some((c) => c.userId === auth.userId)) {
    throw new CashierError("Vous n'êtes pas autorisé(e) à ouvrir cette caisse.")
  }
  if (!Number.isInteger(openingFloat) || openingFloat < 0) throw new CashierError('Fond de caisse invalide.')

  const alreadyOpen = await prisma.cashSession.findFirst({ where: { registerId, closedAt: null } })
  if (alreadyOpen) throw new CashierError('Cette caisse est déjà ouverte.')
  const ownOpen = await prisma.cashSession.findFirst({
    where: { cashierId: auth.userId, closedAt: null },
    include: { register: { select: { name: true } } }
  })
  if (ownOpen) throw new CashierError(`Vous avez déjà une caisse ouverte (${ownOpen.register.name}). Clôturez-la d'abord.`)

  const session = await prisma.cashSession.create({
    data: { id: randomUUID(), registerId, cashierId: auth.userId, openingFloat }
  })
  return session.id
}

async function computeExpected(sessionId: string, openingFloat: number) {
  const prisma = getPrismaClient()
  // Argent effectivement reçu pendant la session : reçus payés + reçus remboursés plus tard (le
  // remboursement est une sortie distincte en Comptabilité). Les reçus annulés ne comptent pas.
  const rows = await prisma.receipt.groupBy({
    by: ['paymentMode'],
    where: { sessionId, status: { in: ['PAYE', 'REMBOURSE'] } },
    _sum: { amount: true }
  })
  const expected = emptyAmounts()
  expected.ESPECES = openingFloat
  for (const row of rows) expected[row.paymentMode] += row._sum.amount ?? 0
  return expected
}

async function toSession(
  session: CashSession & { register: Pick<CashRegister, 'name'>; cashier: Pick<User, 'name'> }
): Promise<ApiCashSession> {
  const prisma = getPrismaClient()
  const [counts, expected] = await Promise.all([
    prisma.receipt.groupBy({ by: ['status'], where: { sessionId: session.id }, _sum: { amount: true }, _count: { _all: true } }),
    session.expectedAmounts
      ? Promise.resolve(session.expectedAmounts as unknown as PaymentAmounts)
      : computeExpected(session.id, session.openingFloat)
  ])
  const paid = counts.filter((c) => c.status !== 'ANNULE')
  return {
    id: session.id,
    registerId: session.registerId,
    registerName: session.register.name,
    cashierId: session.cashierId,
    cashierName: session.cashier.name,
    openedAt: session.openedAt.toISOString(),
    openingFloat: session.openingFloat,
    closedAt: session.closedAt?.toISOString() ?? null,
    expectedAmounts: expected,
    countedAmounts: (session.countedAmounts as unknown as PaymentAmounts | null) ?? null,
    difference: session.difference,
    closingNote: session.closingNote,
    receiptCount: paid.reduce((n, c) => n + c._count._all, 0),
    cancelledCount: counts.find((c) => c.status === 'ANNULE')?._count._all ?? 0,
    total: paid.reduce((n, c) => n + (c._sum.amount ?? 0), 0)
  }
}

const SESSION_INCLUDE = { register: { select: { name: true } }, cashier: { select: { name: true } } } as const

export async function getSession(id: string): Promise<ApiCashSession> {
  const prisma = getPrismaClient()
  const session = await prisma.cashSession.findUnique({ where: { id }, include: SESSION_INCLUDE })
  if (!session) throw new CashierError('Session introuvable.')
  return toSession(session)
}

export async function closeSession(auth: AuthTokenPayload, id: string, input: CloseSessionInput): Promise<ApiCashSession> {
  const prisma = getPrismaClient()
  const session = await prisma.cashSession.findUnique({ where: { id } })
  if (!session) throw new CashierError('Session introuvable.')
  if (session.closedAt) throw new CashierError('Cette caisse est déjà clôturée.')
  if (auth.role !== 'DIRIGEANT' && session.cashierId !== auth.userId) {
    throw new CashierError('Seul le caissier de la session (ou le dirigeant) peut clôturer cette caisse.')
  }

  const counted = emptyAmounts()
  for (const mode of PAYMENT_MODES) {
    const value = Number(input.countedAmounts?.[mode] ?? 0)
    if (!Number.isInteger(value) || value < 0) throw new CashierError('Montants comptés invalides.')
    counted[mode] = value
  }
  const expected = await computeExpected(id, session.openingFloat)

  const closed = await prisma.cashSession.update({
    where: { id },
    data: {
      closedAt: new Date(),
      expectedAmounts: expected,
      countedAmounts: counted,
      difference: sumAmounts(counted) - sumAmounts(expected),
      closingNote: input.note?.trim() || null
    },
    include: SESSION_INCLUDE
  })
  return toSession(closed)
}

export async function listSessions(filters: ReceiptFilters): Promise<ApiCashSession[]> {
  const prisma = getPrismaClient()
  const sessions = await prisma.cashSession.findMany({
    where: {
      registerId: filters.registerId || undefined,
      openedAt: {
        gte: filters.from ? new Date(filters.from) : undefined,
        lte: filters.to ? new Date(filters.to) : undefined
      }
    },
    include: SESSION_INCLUDE,
    orderBy: { openedAt: 'desc' },
    take: 200
  })
  return Promise.all(sessions.map(toSession))
}

// --- Catalogue de tarifs ----------------------------------------------------------------------

function toTariff(t: {
  id: string
  label: string
  service: string
  price: number
  color: string | null
  sortOrder: number
  isActive: boolean
}): ApiTariffItem {
  return { id: t.id, label: t.label, service: t.service, price: t.price, color: t.color, sortOrder: t.sortOrder, isActive: t.isActive }
}

export async function listTariffs(): Promise<ApiTariffItem[]> {
  const prisma = getPrismaClient()
  const items = await prisma.tariffItem.findMany({ orderBy: [{ service: 'asc' }, { sortOrder: 'asc' }, { label: 'asc' }] })
  return items.map(toTariff)
}

export async function saveTariff(id: string | null, input: TariffItemInput): Promise<ApiTariffItem> {
  const prisma = getPrismaClient()
  const label = input.label?.trim()
  const service = input.service?.trim()
  if (!label || !service) throw new CashierError('Libellé et service sont obligatoires.')
  if (!Number.isInteger(input.price) || input.price < 0) throw new CashierError('Prix invalide.')
  const data = {
    label,
    service,
    price: input.price,
    color: input.color === undefined ? undefined : input.color || null,
    sortOrder: input.sortOrder,
    isActive: input.isActive
  }
  const item = id
    ? await prisma.tariffItem.update({ where: { id }, data })
    : await prisma.tariffItem.create({ data: { id: randomUUID(), ...data } })
  return toTariff(item)
}

// --- Patient (création rapide) et examens prescrits -------------------------------------------

export async function quickCreatePatient(input: QuickPatientInput) {
  if (!input.firstName?.trim() || !input.lastName?.trim() || !input.birthDate) {
    throw new CashierError('Prénom, nom et date de naissance sont obligatoires.')
  }
  return createPatient({
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    gender: input.gender,
    birthDate: input.birthDate,
    phone: input.phone?.trim() || undefined
  })
}

interface ExamCandidate {
  examType: ApiExamType
  examId: string
  label: string
  requestedAt: Date
}

async function listPatientExams(patientId: string): Promise<ExamCandidate[]> {
  const prisma = getPrismaClient()
  const since = new Date(Date.now() - EXAM_LOOKBACK_DAYS * 24 * 60 * 60 * 1000)
  const where = { patientId, deletedAt: null, requestedAt: { gte: since } }
  const [lab, imaging, cardio, pathology, endoscopy] = await Promise.all([
    prisma.labRequest.findMany({ where: { ...where, status: { not: 'ANNULEE' } } }),
    prisma.imagingRequest.findMany({ where: { ...where, status: { not: 'ANNULE' } } }),
    prisma.cardioExam.findMany({ where: { ...where, status: { not: 'ANNULE' } } }),
    prisma.pathologyRequest.findMany({ where: { ...where, status: { not: 'ANNULEE' } } }),
    prisma.endoscopyProcedure.findMany({ where: { ...where, status: { not: 'ANNULE' } } })
  ])
  return [
    ...lab.map((e) => ({ examType: 'LAB' as const, examId: e.id, label: e.analysisType, requestedAt: e.requestedAt })),
    ...imaging.map((e) => ({ examType: 'IMAGING' as const, examId: e.id, label: e.examType, requestedAt: e.requestedAt })),
    ...cardio.map((e) => ({ examType: 'CARDIO' as const, examId: e.id, label: e.examType, requestedAt: e.requestedAt })),
    ...pathology.map((e) => ({ examType: 'PATHOLOGY' as const, examId: e.id, label: e.sampleType, requestedAt: e.requestedAt })),
    ...endoscopy.map((e) => ({ examType: 'ENDOSCOPY' as const, examId: e.id, label: e.procedureType, requestedAt: e.requestedAt }))
  ]
}

function normalize(text: string): string {
  return text.trim().toLocaleLowerCase('fr-FR')
}

export async function listPendingExams(patientId: string): Promise<ApiPendingExam[]> {
  const prisma = getPrismaClient()
  const [exams, tariffs] = await Promise.all([
    listPatientExams(patientId),
    prisma.tariffItem.findMany({ where: { isActive: true } })
  ])
  const paidLines = await prisma.receiptLine.findMany({
    where: { examId: { in: exams.map((e) => e.examId) }, receipt: { status: 'PAYE' } },
    select: { examId: true }
  })
  const paid = new Set(paidLines.map((l) => l.examId))

  return exams
    .filter((e) => !paid.has(e.examId))
    .sort((a, b) => b.requestedAt.getTime() - a.requestedAt.getTime())
    .map((e) => {
      const service = EXAM_SERVICE[e.examType]
      const tariff = tariffs.find((t) => normalize(t.service) === normalize(service) && normalize(t.label) === normalize(e.label))
      return {
        examType: e.examType,
        examId: e.examId,
        label: e.label,
        service,
        requestedAt: e.requestedAt.toISOString(),
        tariffItemId: tariff?.id ?? null,
        price: tariff?.price ?? null
      }
    })
}

// --- Reçus ------------------------------------------------------------------------------------

type ReceiptWithRelations = Receipt & {
  lines: ReceiptLine[]
  register: Pick<CashRegister, 'name'>
  cashier: Pick<User, 'name'>
}

const RECEIPT_INCLUDE = {
  lines: true,
  register: { select: { name: true } },
  cashier: { select: { name: true } }
} as const

async function toReceipts(receipts: ReceiptWithRelations[]): Promise<ApiReceipt[]> {
  const prisma = getPrismaClient()
  const userIds = [
    ...new Set(receipts.flatMap((r) => [r.cancelledById, r.refundedById]).filter((id): id is string => Boolean(id)))
  ]
  const users = userIds.length
    ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } })
    : []
  const nameOf = new Map(users.map((u) => [u.id, u.name]))

  return receipts.map((r) => ({
    id: r.id,
    number: r.number,
    registerId: r.registerId,
    registerName: r.register.name,
    sessionId: r.sessionId,
    cashierId: r.cashierId,
    cashierName: r.cashier.name,
    patientId: r.patientId,
    patientName: r.patientName,
    patientCode: r.patientCode,
    service: r.service,
    amount: r.amount,
    paymentMode: r.paymentMode,
    paymentReference: r.paymentReference,
    queueNumber: r.queueNumber,
    status: r.status,
    issuedAt: r.issuedAt.toISOString(),
    cancelledAt: r.cancelledAt?.toISOString() ?? null,
    cancelledByName: r.cancelledById ? (nameOf.get(r.cancelledById) ?? null) : null,
    cancelReason: r.cancelReason,
    refundedAt: r.refundedAt?.toISOString() ?? null,
    refundedByName: r.refundedById ? (nameOf.get(r.refundedById) ?? null) : null,
    refundReason: r.refundReason,
    lines: r.lines.map((l) => ({
      id: l.id,
      label: l.label,
      unitPrice: l.unitPrice,
      quantity: l.quantity,
      tariffItemId: l.tariffItemId,
      examType: (l.examType as ApiExamType | null) ?? null,
      examId: l.examId
    }))
  }))
}

export async function getReceipt(id: string): Promise<ApiReceipt> {
  const prisma = getPrismaClient()
  const receipt = await prisma.receipt.findUnique({ where: { id }, include: RECEIPT_INCLUDE })
  if (!receipt) throw new CashierError('Reçu introuvable.')
  return (await toReceipts([receipt]))[0]
}

export async function listReceipts(filters: ReceiptFilters): Promise<ApiReceipt[]> {
  const prisma = getPrismaClient()
  const receipts = await prisma.receipt.findMany({
    where: {
      registerId: filters.registerId || undefined,
      sessionId: filters.sessionId || undefined,
      issuedAt: {
        gte: filters.from ? new Date(filters.from) : undefined,
        lte: filters.to ? new Date(filters.to) : undefined
      }
    },
    include: RECEIPT_INCLUDE,
    orderBy: { issuedAt: 'desc' },
    take: 1000
  })
  return toReceipts(receipts)
}

export async function createReceipt(auth: AuthTokenPayload, input: CreateReceiptInput): Promise<ApiReceipt> {
  const prisma = getPrismaClient()

  const session = await prisma.cashSession.findUnique({ where: { id: input.sessionId } })
  if (!session || session.closedAt) throw new CashierError("Cette caisse n'est pas ouverte.")
  if (auth.role !== 'DIRIGEANT' && session.cashierId !== auth.userId) {
    throw new CashierError("Cette caisse est ouverte par un autre caissier.")
  }
  if (!PAYMENT_MODES.includes(input.paymentMode)) throw new CashierError('Mode de paiement invalide.')
  if (!input.lines?.length) throw new CashierError('Aucun service sélectionné.')

  const patient = await prisma.patient.findUnique({ where: { id: input.patientId } })
  if (!patient || patient.deletedAt) throw new CashierError('Patient introuvable.')

  // Prix toujours repris du catalogue côté serveur : le caissier ne peut pas les modifier.
  const tariffs = await prisma.tariffItem.findMany({ where: { isActive: true } })
  const pendingExams = input.lines.some((l) => 'examId' in l) ? await listPendingExams(patient.id) : []

  const lines: { label: string; unitPrice: number; service: string; tariffItemId: string | null; examType: string | null; examId: string | null }[] = []
  for (const line of input.lines) {
    if ('tariffItemId' in line) {
      const tariff = tariffs.find((t) => t.id === line.tariffItemId)
      if (!tariff) throw new CashierError('Un élément du catalogue est introuvable ou désactivé.')
      lines.push({ label: tariff.label, unitPrice: tariff.price, service: tariff.service, tariffItemId: tariff.id, examType: null, examId: null })
    } else {
      const exam = pendingExams.find((e) => e.examType === line.examType && e.examId === line.examId)
      if (!exam) throw new CashierError('Examen introuvable ou déjà payé.')
      if (exam.price === null || !exam.tariffItemId) {
        throw new CashierError(`Aucun tarif défini pour « ${exam.label} » (${exam.service}) : ajoutez-le au catalogue.`)
      }
      lines.push({ label: exam.label, unitPrice: exam.price, service: exam.service, tariffItemId: exam.tariffItemId, examType: exam.examType, examId: exam.examId })
    }
  }

  // Un reçu = un service (le patient repasse à la caisse pour chaque nouveau service).
  const services = [...new Set(lines.map((l) => l.service))]
  if (services.length > 1) throw new CashierError('Un reçu ne peut concerner qu’un seul service. Encaissez les services séparément.')
  const service = services[0]
  const amount = lines.reduce((total, l) => total + l.unitPrice, 0)
  const patientName = `${patient.lastName.toLocaleUpperCase('fr-FR')} ${patient.firstName}`

  const number = await nextCode('RECEIPT', 'R', 6)
  const queueNumber = await nextDailyNumber(`QUEUE:${service}`)

  const receiptId = randomUUID()
  await prisma.$transaction(async (tx) => {
    const transaction = await tx.financeTransaction.create({
      data: {
        id: randomUUID(),
        reference: number,
        occurredAt: new Date(),
        type: 'RECETTE',
        party: patientName,
        category: `Caisse — ${service}`,
        amount,
        status: 'PAYE',
        paymentMode: PAYMENT_MODE_LABEL[input.paymentMode]
      }
    })
    await tx.receipt.create({
      data: {
        id: receiptId,
        number,
        registerId: session.registerId,
        sessionId: session.id,
        cashierId: auth.userId,
        patientId: patient.id,
        patientName,
        patientCode: patient.code,
        service,
        amount,
        paymentMode: input.paymentMode,
        paymentReference: input.paymentReference?.trim() || null,
        queueNumber,
        financeTransactionId: transaction.id,
        lines: {
          create: lines.map((l) => ({
            id: randomUUID(),
            label: l.label,
            unitPrice: l.unitPrice,
            tariffItemId: l.tariffItemId,
            examType: l.examType,
            examId: l.examId
          }))
        }
      }
    })
  })

  return getReceipt(receiptId)
}

export async function cancelReceipt(auth: AuthTokenPayload, id: string, reason: string): Promise<ApiReceipt> {
  const prisma = getPrismaClient()
  if (!reason?.trim()) throw new CashierError("Le motif d'annulation est obligatoire.")
  const receipt = await prisma.receipt.findUnique({ where: { id }, include: { session: true } })
  if (!receipt) throw new CashierError('Reçu introuvable.')
  if (receipt.status !== 'PAYE') throw new CashierError('Seul un reçu payé peut être annulé.')

  // Caissier : uniquement un reçu de sa propre session encore ouverte, le jour même. Au-delà,
  // DIRIGEANT uniquement (Plan-Module-Caisse.md §4-F).
  if (auth.role !== 'DIRIGEANT') {
    const ownOpenSession = receipt.session.cashierId === auth.userId && !receipt.session.closedAt
    if (!ownOpenSession || !isSameDay(receipt.issuedAt, new Date())) {
      throw new CashierError('Vous ne pouvez annuler que les reçus du jour de votre caisse ouverte. Adressez-vous au dirigeant.')
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.receipt.update({
      where: { id },
      data: { status: 'ANNULE', cancelledAt: new Date(), cancelledById: auth.userId, cancelReason: reason.trim() }
    })
    if (receipt.financeTransactionId) {
      await tx.financeTransaction.update({ where: { id: receipt.financeTransactionId }, data: { status: 'ANNULE' } })
    }
  })
  return getReceipt(id)
}

/** Remboursement (DIRIGEANT, garde posée par la route) : le reçu reste une recette encaissée, et
 * une sortie « Remboursement caisse » est créée en Comptabilité. */
export async function refundReceipt(auth: AuthTokenPayload, id: string, reason: string): Promise<ApiReceipt> {
  const prisma = getPrismaClient()
  if (!reason?.trim()) throw new CashierError('Le motif du remboursement est obligatoire.')
  const receipt = await prisma.receipt.findUnique({ where: { id } })
  if (!receipt) throw new CashierError('Reçu introuvable.')
  if (receipt.status !== 'PAYE') throw new CashierError('Seul un reçu payé peut être remboursé.')

  await prisma.$transaction(async (tx) => {
    const refund = await tx.financeTransaction.create({
      data: {
        id: randomUUID(),
        reference: `${receipt.number}-REMB`,
        occurredAt: new Date(),
        type: 'DEPENSE',
        party: receipt.patientName,
        category: `Remboursement caisse — ${receipt.service}`,
        amount: receipt.amount,
        status: 'PAYE',
        paymentMode: PAYMENT_MODE_LABEL[receipt.paymentMode]
      }
    })
    await tx.receipt.update({
      where: { id },
      data: {
        status: 'REMBOURSE',
        refundedAt: new Date(),
        refundedById: auth.userId,
        refundReason: reason.trim(),
        refundTransactionId: refund.id
      }
    })
  })
  return getReceipt(id)
}

// --- Impression et export -------------------------------------------------------------------

export async function getReceiptPrintData(id: string): Promise<ApiReceiptPrintData> {
  const prisma = getPrismaClient()
  const [receipt, company, logo] = await Promise.all([getReceipt(id), prisma.company.findFirst(), getCompanyLogo()])
  const register = await prisma.cashRegister.findUnique({ where: { id: receipt.registerId }, select: { receiptFormat: true } })
  return {
    receipt,
    format: register?.receiptFormat ?? 'TICKET_80MM',
    company: {
      name: company?.name ?? '',
      address: company?.address ?? null,
      phone: company?.phone ?? null,
      registrationNumber: company?.registrationNumber ?? null,
      receiptFooter: company?.receiptFooter ?? null,
      logo
    }
  }
}

const STATUS_LABEL = { PAYE: 'Payé', ANNULE: 'Annulé', REMBOURSE: 'Remboursé' } as const

export async function exportReceipts(filters: ReceiptFilters) {
  const receipts = await listReceipts(filters)
  return buildXlsxDocument(
    'Caisses',
    'Journal des caisses',
    [
      { header: 'N° reçu', key: 'number', width: 16 },
      { header: 'Date', key: 'issuedAt', width: 18 },
      { header: 'Caisse', key: 'registerName', width: 16 },
      { header: 'Caissier', key: 'cashierName', width: 20 },
      { header: 'Patient', key: 'patientName', width: 24 },
      { header: 'Service', key: 'service', width: 20 },
      { header: 'Montant (FCFA)', key: 'amount', width: 14 },
      { header: 'Mode', key: 'paymentMode', width: 16 },
      { header: 'N° passage', key: 'queueNumber', width: 10 },
      { header: 'Statut', key: 'status', width: 12 },
      { header: 'Motif', key: 'reason', width: 30 }
    ],
    receipts.map((r) => ({
      number: r.number,
      issuedAt: new Date(r.issuedAt).toLocaleString('fr-FR'),
      registerName: r.registerName,
      cashierName: r.cashierName,
      patientName: r.patientName,
      service: r.service,
      amount: r.amount,
      paymentMode: PAYMENT_MODE_LABEL[r.paymentMode],
      queueNumber: r.queueNumber ?? '',
      status: STATUS_LABEL[r.status],
      reason: r.cancelReason ?? r.refundReason ?? ''
    }))
  )
}
