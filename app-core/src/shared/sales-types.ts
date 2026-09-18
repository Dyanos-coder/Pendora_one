// Types partagés entre main, preload et renderer pour le module Ventes.

export type SaleStatus = 'PAYE' | 'EN_ATTENTE'

export interface Sale {
  id: string
  clientName: string
  stockItemId: string
  quantity: number
  items: string
  amount: number
  status: SaleStatus
  issuedAt: string
  createdAt: string
}

export interface SaleListResult {
  items: Sale[]
  total: number
  page: number
  pageSize: number
}

export interface SalesSummary {
  chiffreAffaires7j: number
  ventes7j: number
  panierMoyen: number
  week: { day: string; value: number }[]
}

export interface CreateSaleInput {
  clientName: string
  stockItemId: string
  quantity: number
  amount: number
  status: SaleStatus
}

export type SalesApiResult<T> = { ok: true; data: T } | { ok: false; error: string }
