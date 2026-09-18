import { getCurrentToken } from './session.store'
import { createDepotItem, deleteDepotItem, listDepotItems, listDepots, updateDepotItem } from './remote-api.client'
import type { CreateDepotItemInput, UpdateDepotItemInput } from '../../shared/stocks-types'

function requireToken(): string {
  const token = getCurrentToken()
  if (!token) {
    throw new Error('Non authentifié.')
  }
  return token
}

export function depots() {
  return listDepots(requireToken())
}

export function items() {
  return listDepotItems(requireToken())
}

export function create(input: CreateDepotItemInput) {
  return createDepotItem(requireToken(), input)
}

export function update(id: string, input: UpdateDepotItemInput) {
  return updateDepotItem(requireToken(), id, input)
}

export function remove(id: string) {
  return deleteDepotItem(requireToken(), id)
}
