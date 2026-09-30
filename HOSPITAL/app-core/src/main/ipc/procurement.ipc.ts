import { ipcMain } from 'electron'
import {
  addOrder,
  addReception,
  create,
  exportExcel,
  list,
  listOrders,
  listReceptions,
  remove,
  removeOrder,
  removeReception,
  suppliers,
  update,
  updateOrder,
  updateReception
} from '../services/procurement.service'
import type {
  CreateGoodsReceptionInput,
  CreateProcurementRequestInput,
  CreatePurchaseOrderInput,
  UpdateGoodsReceptionInput,
  UpdateProcurementRequestInput,
  UpdatePurchaseOrderInput
} from '../../shared/procurement-types'

export function registerProcurementIpcHandlers(): void {
  ipcMain.handle('procurement:list', () => list())

  ipcMain.handle('procurement:suppliers', () => suppliers())

  ipcMain.handle('procurement:create', (_event, input: CreateProcurementRequestInput) => create(input))

  ipcMain.handle('procurement:update', (_event, id: string, input: UpdateProcurementRequestInput) => update(id, input))

  ipcMain.handle('procurement:delete', (_event, id: string) => remove(id))

  ipcMain.handle('procurement:exportExcel', () => exportExcel())

  ipcMain.handle('procurement:orders:list', () => listOrders())
  ipcMain.handle('procurement:orders:create', (_event, input: CreatePurchaseOrderInput) => addOrder(input))
  ipcMain.handle('procurement:orders:update', (_event, id: string, input: UpdatePurchaseOrderInput) => updateOrder(id, input))
  ipcMain.handle('procurement:orders:delete', (_event, id: string) => removeOrder(id))

  ipcMain.handle('procurement:receptions:list', () => listReceptions())
  ipcMain.handle('procurement:receptions:create', (_event, input: CreateGoodsReceptionInput) => addReception(input))
  ipcMain.handle('procurement:receptions:update', (_event, id: string, input: UpdateGoodsReceptionInput) => updateReception(id, input))
  ipcMain.handle('procurement:receptions:delete', (_event, id: string) => removeReception(id))
}
