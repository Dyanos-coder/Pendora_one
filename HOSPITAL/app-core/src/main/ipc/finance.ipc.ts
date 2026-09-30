import { ipcMain } from 'electron'
import {
  addBankAccount,
  addBudget,
  addExpense,
  addInvoice,
  addPayment,
  create,
  exportExcel,
  list,
  listBankAccounts,
  listBudgets,
  listExpenses,
  listInvoices,
  listPayments,
  remove,
  removeBankAccount,
  removeBudget,
  removeExpense,
  removeInvoice,
  removePayment,
  update,
  updateBankAccount,
  updateBudget,
  updateExpense,
  updateInvoice,
  updatePayment
} from '../services/finance.service'
import type {
  CreateFinanceTransactionInput,
  UpdateFinanceTransactionInput,
  CreateSupplierInvoiceInput,
  UpdateSupplierInvoiceInput,
  CreatePaymentReceivedInput,
  UpdatePaymentReceivedInput,
  CreateServiceExpenseInput,
  UpdateServiceExpenseInput,
  CreateBudgetInput,
  UpdateBudgetInput,
  CreateBankAccountInput,
  UpdateBankAccountInput
} from '../../shared/finance-types'

export function registerFinanceIpcHandlers(): void {
  ipcMain.handle('finance:list', () => list())

  ipcMain.handle('finance:create', (_event, input: CreateFinanceTransactionInput) => create(input))

  ipcMain.handle('finance:update', (_event, id: string, input: UpdateFinanceTransactionInput) => update(id, input))

  ipcMain.handle('finance:delete', (_event, id: string) => remove(id))

  ipcMain.handle('finance:exportExcel', () => exportExcel())

  ipcMain.handle('finance:invoices:list', () => listInvoices())
  ipcMain.handle('finance:invoices:create', (_event, input: CreateSupplierInvoiceInput) => addInvoice(input))
  ipcMain.handle('finance:invoices:update', (_event, id: string, input: UpdateSupplierInvoiceInput) => updateInvoice(id, input))
  ipcMain.handle('finance:invoices:delete', (_event, id: string) => removeInvoice(id))

  ipcMain.handle('finance:payments:list', () => listPayments())
  ipcMain.handle('finance:payments:create', (_event, input: CreatePaymentReceivedInput) => addPayment(input))
  ipcMain.handle('finance:payments:update', (_event, id: string, input: UpdatePaymentReceivedInput) => updatePayment(id, input))
  ipcMain.handle('finance:payments:delete', (_event, id: string) => removePayment(id))

  ipcMain.handle('finance:expenses:list', () => listExpenses())
  ipcMain.handle('finance:expenses:create', (_event, input: CreateServiceExpenseInput) => addExpense(input))
  ipcMain.handle('finance:expenses:update', (_event, id: string, input: UpdateServiceExpenseInput) => updateExpense(id, input))
  ipcMain.handle('finance:expenses:delete', (_event, id: string) => removeExpense(id))

  ipcMain.handle('finance:budgets:list', () => listBudgets())
  ipcMain.handle('finance:budgets:create', (_event, input: CreateBudgetInput) => addBudget(input))
  ipcMain.handle('finance:budgets:update', (_event, id: string, input: UpdateBudgetInput) => updateBudget(id, input))
  ipcMain.handle('finance:budgets:delete', (_event, id: string) => removeBudget(id))

  ipcMain.handle('finance:bankAccounts:list', () => listBankAccounts())
  ipcMain.handle('finance:bankAccounts:create', (_event, input: CreateBankAccountInput) => addBankAccount(input))
  ipcMain.handle('finance:bankAccounts:update', (_event, id: string, input: UpdateBankAccountInput) => updateBankAccount(id, input))
  ipcMain.handle('finance:bankAccounts:delete', (_event, id: string) => removeBankAccount(id))
}
