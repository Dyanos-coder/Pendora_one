import { getCurrentToken } from './session.store'
import { createFinanceTransaction, deleteFinanceTransaction, listFinanceTransactions, updateFinanceTransaction } from './remote-api.client'
import type { CreateFinanceTransactionInput, UpdateFinanceTransactionInput } from '../../shared/finance-types'

function requireToken(): string {
  const token = getCurrentToken()
  if (!token) {
    throw new Error('Non authentifié.')
  }
  return token
}

export function list() {
  return listFinanceTransactions(requireToken())
}

export function create(input: CreateFinanceTransactionInput) {
  return createFinanceTransaction(requireToken(), input)
}

export function update(id: string, input: UpdateFinanceTransactionInput) {
  return updateFinanceTransaction(requireToken(), id, input)
}

export function remove(id: string) {
  return deleteFinanceTransaction(requireToken(), id)
}
