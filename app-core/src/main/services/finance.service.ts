import { getCurrentToken } from './session.store'
import {
  createInvoice,
  getFinanceSummary as remoteGetFinanceSummary,
  getInvoiceMedia,
  listInvoices
} from './remote-api.client'
import type { CreateInvoiceInput } from '../../shared/finance-types'

function requireToken(): string {
  const token = getCurrentToken()
  if (!token) {
    throw new Error('Non authentifié.')
  }
  return token
}

export function listFinanceTransactions(page = 1) {
  return listInvoices(requireToken(), page)
}

export function createFinanceTransaction(input: CreateInvoiceInput) {
  return createInvoice(requireToken(), input)
}

export function getFinanceInvoiceMedia(id: string) {
  return getInvoiceMedia(requireToken(), id)
}

export function getFinanceSummary() {
  return remoteGetFinanceSummary(requireToken())
}
