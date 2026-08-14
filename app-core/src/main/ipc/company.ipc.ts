import { ipcMain } from 'electron'
import { getLogo, uploadLogo } from '../services/company.service'
import type { LogoUploadInput } from '../../shared/company-types'

export function registerCompanyIpcHandlers(): void {
  ipcMain.handle('company:getLogo', () => {
    return getLogo()
  })

  ipcMain.handle('company:uploadLogo', (_event, input: LogoUploadInput) => {
    return uploadLogo(input)
  })
}
