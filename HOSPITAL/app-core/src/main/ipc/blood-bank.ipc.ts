import { ipcMain } from 'electron'
import {
  create,
  exportExcel,
  list,
  remove,
  update,
  listDonationsList,
  addDonation,
  updateDonationEntry,
  removeDonation,
  listRequests,
  addRequest,
  updateRequest,
  removeRequest,
  listTransfusionsList,
  addTransfusion,
  updateTransfusionEntry,
  removeTransfusion,
  listAnalyses,
  addAnalysis,
  updateAnalysis,
  removeAnalysis
} from '../services/blood-bank.service'
import type {
  CreateBloodPouchInput,
  UpdateBloodPouchInput,
  CreateDonationInput,
  UpdateDonationInput,
  CreateTransfusionRequestInput,
  UpdateTransfusionRequestInput,
  CreateTransfusionInput,
  UpdateTransfusionInput,
  CreateBloodAnalysisInput,
  UpdateBloodAnalysisInput
} from '../../shared/blood-bank-types'

export function registerBloodBankIpcHandlers(): void {
  ipcMain.handle('bloodBank:list', () => list())

  ipcMain.handle('bloodBank:create', (_event, input: CreateBloodPouchInput) => create(input))

  ipcMain.handle('bloodBank:update', (_event, id: string, input: UpdateBloodPouchInput) => update(id, input))

  ipcMain.handle('bloodBank:delete', (_event, id: string) => remove(id))

  ipcMain.handle('bloodBank:exportExcel', () => exportExcel())

  ipcMain.handle('bloodBank:donations:list', () => listDonationsList())
  ipcMain.handle('bloodBank:donations:create', (_event, input: CreateDonationInput) => addDonation(input))
  ipcMain.handle('bloodBank:donations:update', (_event, id: string, input: UpdateDonationInput) => updateDonationEntry(id, input))
  ipcMain.handle('bloodBank:donations:delete', (_event, id: string) => removeDonation(id))

  ipcMain.handle('bloodBank:requests:list', () => listRequests())
  ipcMain.handle('bloodBank:requests:create', (_event, input: CreateTransfusionRequestInput) => addRequest(input))
  ipcMain.handle('bloodBank:requests:update', (_event, id: string, input: UpdateTransfusionRequestInput) => updateRequest(id, input))
  ipcMain.handle('bloodBank:requests:delete', (_event, id: string) => removeRequest(id))

  ipcMain.handle('bloodBank:transfusions:list', () => listTransfusionsList())
  ipcMain.handle('bloodBank:transfusions:create', (_event, input: CreateTransfusionInput) => addTransfusion(input))
  ipcMain.handle('bloodBank:transfusions:update', (_event, id: string, input: UpdateTransfusionInput) => updateTransfusionEntry(id, input))
  ipcMain.handle('bloodBank:transfusions:delete', (_event, id: string) => removeTransfusion(id))

  ipcMain.handle('bloodBank:analyses:list', () => listAnalyses())
  ipcMain.handle('bloodBank:analyses:create', (_event, input: CreateBloodAnalysisInput) => addAnalysis(input))
  ipcMain.handle('bloodBank:analyses:update', (_event, id: string, input: UpdateBloodAnalysisInput) => updateAnalysis(id, input))
  ipcMain.handle('bloodBank:analyses:delete', (_event, id: string) => removeAnalysis(id))
}
