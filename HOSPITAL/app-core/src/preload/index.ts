import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { LoginResult, Session } from '../shared/auth-types'

const api = {
  auth: {
    login: (email: string, password: string): Promise<LoginResult> =>
      ipcRenderer.invoke('auth:login', email, password),
    logout: (): Promise<void> => ipcRenderer.invoke('auth:logout'),
    getSession: (): Promise<Session | null> => ipcRenderer.invoke('auth:getSession')
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
