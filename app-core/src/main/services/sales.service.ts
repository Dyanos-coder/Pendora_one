import { getCurrentToken } from './session.store'
import { createSale, getSalesSummary, listSales } from './remote-api.client'
import type { CreateSaleInput } from '../../shared/sales-types'

function requireToken(): string {
  const token = getCurrentToken()
  if (!token) {
    throw new Error('Non authentifié.')
  }
  return token
}

export function listSalesTransactions(page = 1) {
  return listSales(requireToken(), page)
}

export function createSalesTransaction(input: CreateSaleInput) {
  return createSale(requireToken(), input)
}

export function getSalesTransactionsSummary() {
  return getSalesSummary(requireToken())
}
