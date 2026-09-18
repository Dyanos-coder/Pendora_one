import { getCurrentToken } from './session.store'
import { createStockItem, getStocksSummary, listStockItems } from './remote-api.client'
import type { CreateStockItemInput } from '../../shared/stocks-types'

function requireToken(): string {
  const token = getCurrentToken()
  if (!token) {
    throw new Error('Non authentifié.')
  }
  return token
}

export function listStocksItems(search?: string) {
  return listStockItems(requireToken(), search)
}

export function createStocksItem(input: CreateStockItemInput) {
  return createStockItem(requireToken(), input)
}

export function getStocksItemsSummary() {
  return getStocksSummary(requireToken())
}
