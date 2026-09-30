import { ipcMain } from 'electron'
import {
  create,
  depots,
  exportExcel,
  items,
  remove,
  update,
  listMovements,
  addMovement,
  updateMovement,
  removeMovement,
  listTransfers,
  addTransfer,
  updateTransfer,
  removeTransfer,
  listInventory,
  addInventoryCount,
  updateInventory,
  removeInventoryCount,
  listLosses,
  addLoss,
  updateLoss,
  removeLoss,
  analysis
} from '../services/stocks.service'
import type {
  CreateDepotItemInput,
  UpdateDepotItemInput,
  CreateStockMovementInput,
  UpdateStockMovementInput,
  CreateStockTransferInput,
  UpdateStockTransferInput,
  CreateInventoryCountInput,
  UpdateInventoryCountInput,
  CreateStockLossInput,
  UpdateStockLossInput
} from '../../shared/stocks-types'

export function registerStocksIpcHandlers(): void {
  ipcMain.handle('stocks:depots', () => depots())

  ipcMain.handle('stocks:items', () => items())

  ipcMain.handle('stocks:create', (_event, input: CreateDepotItemInput) => create(input))

  ipcMain.handle('stocks:update', (_event, id: string, input: UpdateDepotItemInput) => update(id, input))

  ipcMain.handle('stocks:delete', (_event, id: string) => remove(id))

  ipcMain.handle('stocks:exportExcel', () => exportExcel())

  ipcMain.handle('stocks:movements:list', () => listMovements())
  ipcMain.handle('stocks:movements:create', (_event, input: CreateStockMovementInput) => addMovement(input))
  ipcMain.handle('stocks:movements:update', (_event, id: string, input: UpdateStockMovementInput) => updateMovement(id, input))
  ipcMain.handle('stocks:movements:delete', (_event, id: string) => removeMovement(id))

  ipcMain.handle('stocks:transfers:list', () => listTransfers())
  ipcMain.handle('stocks:transfers:create', (_event, input: CreateStockTransferInput) => addTransfer(input))
  ipcMain.handle('stocks:transfers:update', (_event, id: string, input: UpdateStockTransferInput) => updateTransfer(id, input))
  ipcMain.handle('stocks:transfers:delete', (_event, id: string) => removeTransfer(id))

  ipcMain.handle('stocks:inventory:list', () => listInventory())
  ipcMain.handle('stocks:inventory:create', (_event, input: CreateInventoryCountInput) => addInventoryCount(input))
  ipcMain.handle('stocks:inventory:update', (_event, id: string, input: UpdateInventoryCountInput) => updateInventory(id, input))
  ipcMain.handle('stocks:inventory:delete', (_event, id: string) => removeInventoryCount(id))

  ipcMain.handle('stocks:losses:list', () => listLosses())
  ipcMain.handle('stocks:losses:create', (_event, input: CreateStockLossInput) => addLoss(input))
  ipcMain.handle('stocks:losses:update', (_event, id: string, input: UpdateStockLossInput) => updateLoss(id, input))
  ipcMain.handle('stocks:losses:delete', (_event, id: string) => removeLoss(id))

  ipcMain.handle('stocks:analysis', () => analysis())
}
