import type { Session } from '../../shared/auth-types'
import type {
  CreateInvoiceInput,
  FinanceSummary,
  Invoice,
  InvoiceListResult,
  MediaResult
} from '../../shared/finance-types'
import type { LogoUploadInput } from '../../shared/company-types'
import type { AskMemoryResponse, Conversation, ConversationMessage } from '../../shared/memory-types'
import type { CreateSaleInput, Sale, SaleListResult, SalesSummary } from '../../shared/sales-types'
import type { CreateStockItemInput, StockItem, StocksSummary } from '../../shared/stocks-types'
import type { ActivityListResult, ManagedUser } from '../../shared/users-types'

// URL du backend distant (app-server). En dev, pointe sur le serveur lancé en local
// (npm run dev dans app-server) ; en prod, sur l'URL réelle une fois déployé (Render/VPS).
const API_URL = process.env['PANDORA_API_URL'] ?? 'http://localhost:3000'

// Forme brute renvoyée par /auth/login (avec le jeton) — usage interne à ce module et à
// auth.service.ts uniquement. Le renderer ne voit jamais le jeton (voir session.store.ts).
export type RemoteLoginResponse =
  | { ok: true; session: Session; token: string }
  | { ok: false; error: string }

export async function remoteLogin(email: string, password: string): Promise<RemoteLoginResponse> {
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })
    return (await response.json()) as RemoteLoginResponse
  } catch {
    return { ok: false, error: 'Impossible de contacter le serveur. Vérifiez votre connexion.' }
  }
}

interface ApiError {
  ok: false
  error: string
}

async function authorizedFetch<T>(
  path: string,
  token: string,
  init?: RequestInit
): Promise<{ ok: true; data: T } | ApiError> {
  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        ...init?.headers,
        Authorization: `Bearer ${token}`
      }
    })
    const body = await response.json()
    if (!response.ok) {
      return { ok: false, error: body.error ?? 'Erreur serveur.' }
    }
    return { ok: true, data: body as T }
  } catch {
    return { ok: false, error: 'Impossible de contacter le serveur. Vérifiez votre connexion.' }
  }
}

/** Pour les réponses binaires (image/PDF) — pas de JSON à décoder, on lit le Content-Type. */
async function authorizedBinaryFetch(
  path: string,
  token: string
): Promise<{ ok: true; data: MediaResult } | ApiError> {
  try {
    const response = await fetch(`${API_URL}${path}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (!response.ok) {
      const body = await response.json().catch(() => ({}))
      return { ok: false, error: body.error ?? 'Erreur serveur.' }
    }
    const mimeType = response.headers.get('Content-Type')?.split(';')[0] ?? 'application/octet-stream'
    const data = await response.arrayBuffer()
    return { ok: true, data: { mimeType, data } }
  } catch {
    return { ok: false, error: 'Impossible de contacter le serveur. Vérifiez votre connexion.' }
  }
}

export function listInvoices(token: string, page = 1) {
  return authorizedFetch<InvoiceListResult>(`/finance/transactions?page=${page}`, token)
}

export function createInvoice(token: string, input: CreateInvoiceInput) {
  const form = new FormData()
  form.append('reference', input.reference)
  form.append('description', input.description)
  form.append('partyName', input.partyName)
  form.append('amount', String(input.amount))
  form.append('status', input.status)
  if (input.photo) {
    form.append('photo', new Blob([input.photo.data], { type: input.photo.mimeType }), 'photo')
  }

  return authorizedFetch<{ invoice: Invoice }>('/finance/transactions', token, {
    method: 'POST',
    body: form
  })
}

export function getInvoiceMedia(token: string, id: string) {
  return authorizedBinaryFetch(`/finance/transactions/${id}/media`, token)
}

export function getFinanceSummary(token: string) {
  return authorizedFetch<FinanceSummary>('/finance/summary', token)
}

export function getCompanyLogo(token: string) {
  return authorizedBinaryFetch('/company/logo', token)
}

export function uploadCompanyLogo(token: string, input: LogoUploadInput) {
  const form = new FormData()
  form.append('logo', new Blob([input.data], { type: input.mimeType }), 'logo')
  return authorizedFetch<{ ok: true }>('/company/logo', token, {
    method: 'POST',
    body: form
  })
}

export function listConversations(token: string) {
  return authorizedFetch<{ conversations: Conversation[] }>('/memory/conversations', token)
}

export function createConversation(token: string, title?: string) {
  return authorizedFetch<{ conversation: Conversation }>('/memory/conversations', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title })
  })
}

export function renameConversation(token: string, id: string, title: string) {
  return authorizedFetch<{ conversation: Conversation }>(`/memory/conversations/${id}`, token, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title })
  })
}

export function getConversationMessages(token: string, id: string) {
  return authorizedFetch<{ messages: ConversationMessage[] }>(`/memory/conversations/${id}/messages`, token)
}

export function askInConversation(token: string, id: string, question: string) {
  return authorizedFetch<AskMemoryResponse>(`/memory/conversations/${id}/messages`, token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question })
  })
}

export function listSales(token: string, page = 1) {
  return authorizedFetch<SaleListResult>(`/sales/transactions?page=${page}`, token)
}

export function createSale(token: string, input: CreateSaleInput) {
  return authorizedFetch<{ sale: Sale }>('/sales/transactions', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
}

export function getSalesSummary(token: string) {
  return authorizedFetch<SalesSummary>('/sales/summary', token)
}

export function listStockItems(token: string, search?: string) {
  const query = search ? `?search=${encodeURIComponent(search)}` : ''
  return authorizedFetch<{ items: StockItem[] }>(`/stocks/items${query}`, token)
}

export function createStockItem(token: string, input: CreateStockItemInput) {
  return authorizedFetch<{ item: StockItem }>('/stocks/items', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
}

export function getStocksSummary(token: string) {
  return authorizedFetch<StocksSummary>('/stocks/summary', token)
}

export function listUsers(token: string) {
  return authorizedFetch<{ users: ManagedUser[] }>('/users', token)
}

export function setUserActive(token: string, id: string, isActive: boolean) {
  return authorizedFetch<{ user: ManagedUser }>(`/users/${id}`, token, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isActive })
  })
}

export function getUserActivity(token: string, id: string, page = 1) {
  return authorizedFetch<ActivityListResult>(`/users/${id}/activity?page=${page}`, token)
}
