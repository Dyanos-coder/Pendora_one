// Types partagés entre main, preload et renderer pour le module Finance.

export type InvoiceStatus = 'PAYE' | 'EN_ATTENTE' | 'EN_RETARD'

export interface Invoice {
  id: string
  reference: string
  description: string
  partyName: string
  amount: number
  status: InvoiceStatus
  issuedAt: string
  createdAt: string
}

export interface InvoiceListResult {
  items: Invoice[]
  total: number
  page: number
  pageSize: number
}

export interface FinanceSummary {
  chiffreAffaires: number
  facturesImpayees: { count: number; total: number }
  tresorerie: number
}

export interface InvoicePhotoInput {
  data: ArrayBuffer
  mimeType: string
}

export interface CreateInvoiceInput {
  reference: string
  description: string
  partyName: string
  amount: number
  status: InvoiceStatus
  photo?: InvoicePhotoInput
}

/** Renvoyé par finance:media et company:getLogo — l'image ou le PDF, prêt à devenir un Blob côté renderer. */
export interface MediaResult {
  mimeType: string
  data: ArrayBuffer
}

export type FinanceApiResult<T> = { ok: true; data: T } | { ok: false; error: string }
