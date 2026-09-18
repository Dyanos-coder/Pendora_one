// Types partagés entre main, preload et renderer pour le module Stocks.

export interface StockItem {
  id: string
  name: string
  sku: string
  category: string
  quantity: number
  threshold: number
  unitPrice: number
  createdAt: string
}

export interface StocksSummary {
  totalItems: number
  totalValue: number
  criticalCount: number
}

export interface CreateStockItemInput {
  name: string
  sku: string
  category: string
  quantity: number
  threshold: number
  unitPrice: number
}

export type StocksApiResult<T> = { ok: true; data: T } | { ok: false; error: string }
