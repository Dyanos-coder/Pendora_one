import { ipcMain } from 'electron'
import { get, getLogo, listPreferences, removeLogo, update, updatePreference, uploadLogo } from '../services/company.service'
import { getCurrentLocation } from '../services/location.service'
import type { UpdateCompanyInput, UpdateNotificationPreferenceInput } from '../../shared/company-types'

export function registerCompanyIpcHandlers(): void {
  ipcMain.handle('company:get', () => get())

  ipcMain.handle('company:update', (_event, input: UpdateCompanyInput) => update(input))

  ipcMain.handle('company:getLogo', () => getLogo())

  ipcMain.handle('company:uploadLogo', () => uploadLogo())

  ipcMain.handle('company:removeLogo', () => removeLogo())

  ipcMain.handle('company:locate', () => getCurrentLocation())

  ipcMain.handle('notificationPreferences:list', () => listPreferences())

  ipcMain.handle('notificationPreferences:update', (_event, id: string, input: UpdateNotificationPreferenceInput) =>
    updatePreference(id, input)
  )
}
