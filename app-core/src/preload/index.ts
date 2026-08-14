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
