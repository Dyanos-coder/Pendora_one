import { ipcMain } from 'electron'
import { departmentComparison, download, generate, list } from '../services/reports.service'
import type { ApiReportCategory } from '../../shared/reports-types'

export function registerReportsIpcHandlers(): void {
  ipcMain.handle('reports:list', () => list())

  ipcMain.handle('reports:departmentComparison', () => departmentComparison())

  ipcMain.handle('reports:generate', (_event, category: ApiReportCategory) => generate(category))

  ipcMain.handle('reports:download', (_event, id: string) => download(id))
}
