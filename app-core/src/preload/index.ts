import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { LoginResult, Session } from '../shared/auth-types'
import type {
  CreateInvoiceInput,
  FinanceApiResult,
  FinanceSummary,
  Invoice,
  InvoiceListResult,
  MediaResult
} from '../shared/finance-types'
import type { LogoUploadInput } from '../shared/company-types'
import type {
  AskMemoryResponse,
  Conversation,
  ConversationMessage,
  MemoryApiResult
} from '../shared/memory-types'
import type { CreateSaleInput, Sale, SaleListResult, SalesApiResult, SalesSummary } from '../shared/sales-types'
import type {
  CreateStockItemInput,
  StockItem,
  StocksApiResult,
  StocksSummary
} from '../shared/stocks-types'
import type { ActivityListResult, ManagedUser, UsersApiResult } from '../shared/users-types'

const api = {
  auth: {
    login: (email: string, password: string): Promise<LoginResult> =>
      ipcRenderer.invoke('auth:login', email, password),
    logout: (): Promise<void> => ipcRenderer.invoke('auth:logout'),
    getSession: (): Promise<Session | null> => ipcRenderer.invoke('auth:getSession')
  },
  finance: {
    list: (page?: number): Promise<FinanceApiResult<InvoiceListResult>> =>
      ipcRenderer.invoke('finance:list', page),
    create: (input: CreateInvoiceInput): Promise<FinanceApiResult<{ invoice: Invoice }>> =>
      ipcRenderer.invoke('finance:create', input),
    getMedia: (id: string): Promise<FinanceApiResult<MediaResult>> => ipcRenderer.invoke('finance:media', id),
    summary: (): Promise<FinanceApiResult<FinanceSummary>> => ipcRenderer.invoke('finance:summary')
  },
  company: {
    getLogo: (): Promise<FinanceApiResult<MediaResult>> => ipcRenderer.invoke('company:getLogo'),
    uploadLogo: (input: LogoUploadInput): Promise<FinanceApiResult<{ ok: true }>> =>
      ipcRenderer.invoke('company:uploadLogo', input)
  },
  memory: {
    listConversations: (): Promise<MemoryApiResult<{ conversations: Conversation[] }>> =>
      ipcRenderer.invoke('memory:listConversations'),
    createConversation: (title?: string): Promise<MemoryApiResult<{ conversation: Conversation }>> =>
      ipcRenderer.invoke('memory:createConversation', title),
    renameConversation: (id: string, title: string): Promise<MemoryApiResult<{ conversation: Conversation }>> =>
      ipcRenderer.invoke('memory:renameConversation', id, title),
    getMessages: (id: string): Promise<MemoryApiResult<{ messages: ConversationMessage[] }>> =>
      ipcRenderer.invoke('memory:getMessages', id),
    ask: (id: string, question: string): Promise<MemoryApiResult<AskMemoryResponse>> =>
      ipcRenderer.invoke('memory:ask', id, question)
  },
  sales: {
    list: (page?: number): Promise<SalesApiResult<SaleListResult>> => ipcRenderer.invoke('sales:list', page),
    create: (input: CreateSaleInput): Promise<SalesApiResult<{ sale: Sale }>> =>
      ipcRenderer.invoke('sales:create', input),
    summary: (): Promise<SalesApiResult<SalesSummary>> => ipcRenderer.invoke('sales:summary')
  },
  stocks: {
    list: (search?: string): Promise<StocksApiResult<{ items: StockItem[] }>> =>
      ipcRenderer.invoke('stocks:list', search),
    create: (input: CreateStockItemInput): Promise<StocksApiResult<{ item: StockItem }>> =>
      ipcRenderer.invoke('stocks:create', input),
    summary: (): Promise<StocksApiResult<StocksSummary>> => ipcRenderer.invoke('stocks:summary')
  },
  users: {
    list: (): Promise<UsersApiResult<{ users: ManagedUser[] }>> => ipcRenderer.invoke('users:list'),
    setActive: (id: string, isActive: boolean): Promise<UsersApiResult<{ user: ManagedUser }>> =>
      ipcRenderer.invoke('users:setActive', id, isActive),
    activity: (id: string, page?: number): Promise<UsersApiResult<ActivityListResult>> =>
      ipcRenderer.invoke('users:activity', id, page)
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}

export type Api = typeof api
