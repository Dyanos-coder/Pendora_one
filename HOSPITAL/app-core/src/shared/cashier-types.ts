// Module Caisse (Plan-Module-Caisse.md) — types partagés main / preload / renderer.

export type ApiReceiptFormat = 'TICKET_80MM' | 'A6'
export type ApiReceiptStatus = 'PAYE' | 'ANNULE' | 'REMBOURSE'
export type ApiPaymentMode = 'ESPECES' | 'MOBILE_MONEY' | 'CARTE' | 'PRISE_EN_CHARGE'
/** Examen prescrit encaissable depuis la caisse. */
export type ApiExamType = 'LAB' | 'IMAGING' | 'CARDIO' | 'PATHOLOGY' | 'ENDOSCOPY'

export const PAYMENT_MODE_LABEL: Record<ApiPaymentMode, string> = {
  ESPECES: 'Espèces',
  MOBILE_MONEY: 'Mobile Money',
  CARTE: 'Carte bancaire',
  PRISE_EN_CHARGE: 'Prise en charge'
}

export const PAYMENT_MODES: ApiPaymentMode[] = ['ESPECES', 'MOBILE_MONEY', 'CARTE', 'PRISE_EN_CHARGE']

/** Service de rattachement de chaque type d'examen (tuiles, n° de passage, reçu). */
export const EXAM_SERVICE: Record<ApiExamType, string> = {
  LAB: 'Laboratoire',
  IMAGING: 'Imagerie',
  CARDIO: 'Cardiologie',
  PATHOLOGY: 'Anatomopathologie',
  ENDOSCOPY: 'Endoscopie'
}

export interface ApiCashSessionSummary {
  id: string
  cashierId: string
  cashierName: string
  openedAt: string
  openingFloat: number
}

export interface ApiCashRegister {
  id: string
  name: string
  location: string | null
  receiptFormat: ApiReceiptFormat
  isActive: boolean
  cashierIds: string[]
  cashierNames: string[]
  /** Session en cours, `null` si la caisse est fermée. */
  openSession: ApiCashSessionSummary | null
  /** Encaissé aujourd'hui (reçus payés), toutes sessions confondues. */
  todayTotal: number
  todayCount: number
}

export interface CashRegisterInput {
  name: string
  location?: string | null
  receiptFormat?: ApiReceiptFormat
  isActive?: boolean
  cashierIds?: string[]
}

export interface ApiEligibleCashier {
  id: string
  name: string
  role: string
}

export interface ApiTariffItem {
  id: string
  label: string
  service: string
  price: number
  color: string | null
  sortOrder: number
  isActive: boolean
}

export interface TariffItemInput {
  label: string
  service: string
  price: number
  color?: string | null
  sortOrder?: number
  isActive?: boolean
}

export interface ApiPendingExam {
  examType: ApiExamType
  examId: string
  /** Libellé de la demande (type d'analyse, d'examen…). */
  label: string
  service: string
  requestedAt: string
  /** Élément du catalogue correspondant (même service, même libellé) — `null` si aucun tarif
   * n'est défini : l'examen n'est alors pas encaissable tant qu'il n'est pas ajouté au catalogue. */
  tariffItemId: string | null
  price: number | null
}

export interface ApiReceiptLine {
  id: string
  label: string
  unitPrice: number
  quantity: number
  tariffItemId: string | null
  examType: ApiExamType | null
  examId: string | null
}

export interface ApiReceipt {
  id: string
  number: string
  registerId: string
  registerName: string
  sessionId: string
  cashierId: string
  cashierName: string
  patientId: string | null
  patientName: string
  patientCode: string | null
  service: string
  amount: number
  paymentMode: ApiPaymentMode
  paymentReference: string | null
  queueNumber: number | null
  status: ApiReceiptStatus
  issuedAt: string
  cancelledAt: string | null
  cancelledByName: string | null
  cancelReason: string | null
  refundedAt: string | null
  refundedByName: string | null
  refundReason: string | null
  lines: ApiReceiptLine[]
}

export type ReceiptLineInput = { tariffItemId: string } | { examType: ApiExamType; examId: string }

export interface CreateReceiptInput {
  sessionId: string
  patientId: string
  lines: ReceiptLineInput[]
  paymentMode: ApiPaymentMode
  /** N° de transaction Mobile Money, n° de prise en charge… */
  paymentReference?: string | null
}

export interface QuickPatientInput {
  firstName: string
  lastName: string
  gender: 'M' | 'F'
  birthDate: string
  phone?: string | null
}

export type PaymentAmounts = Record<ApiPaymentMode, number>

export interface ApiCashSession {
  id: string
  registerId: string
  registerName: string
  cashierId: string
  cashierName: string
  openedAt: string
  openingFloat: number
  closedAt: string | null
  /** Attendu par mode : fond de caisse (espèces) + reçus payés de la session. */
  expectedAmounts: PaymentAmounts
  countedAmounts: PaymentAmounts | null
  difference: number | null
  closingNote: string | null
  receiptCount: number
  cancelledCount: number
  total: number
}

export interface CloseSessionInput {
  countedAmounts: PaymentAmounts
  note?: string | null
}

export interface ReceiptFilters {
  from?: string
  to?: string
  registerId?: string
  sessionId?: string
}

/** Données nécessaires à l'impression d'un reçu : reçu + établissement + format. */
export interface ApiReceiptPrintData {
  receipt: ApiReceipt
  format: ApiReceiptFormat
  company: {
    name: string
    address: string | null
    phone: string | null
    registrationNumber: string | null
    receiptFooter: string | null
    logo: { mimeType: string; contentBase64: string } | null
  }
}
