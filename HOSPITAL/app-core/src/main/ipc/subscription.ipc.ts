import { ipcMain } from 'electron'
import {
  checkPendingPayment,
  dismissPendingPayment,
  getCatalog,
  getPendingPayment,
  getQuote,
  getSubscriptionInfo,
  listPayments,
  refreshSubscription,
  startCheckout
} from '../services/subscription.service'
import type { CheckoutInput, SubscriptionResult } from '../../shared/subscription-types'

async function wrap<T>(fn: () => Promise<T>): Promise<SubscriptionResult<T>> {
  try {
    return { ok: true, data: await fn() }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export function registerSubscriptionIpcHandlers(): void {
  ipcMain.handle('subscription:getInfo', () => getSubscriptionInfo())
  ipcMain.handle('subscription:refresh', () => refreshSubscription())
  ipcMain.handle('subscription:catalog', () => wrap(getCatalog))
  ipcMain.handle('subscription:quote', (_e, items: string[], months: number) => wrap(() => getQuote(items, months)))
  ipcMain.handle('subscription:payments', () => wrap(listPayments))
  ipcMain.handle('subscription:checkout', (_e, input: CheckoutInput) => wrap(() => startCheckout(input)))
  ipcMain.handle('subscription:getPending', () => getPendingPayment())
  ipcMain.handle('subscription:checkPending', () => wrap(checkPendingPayment))
  ipcMain.handle('subscription:dismissPending', () => dismissPendingPayment())
}
