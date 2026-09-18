import { getCurrentToken } from './session.store'
import { createBloodPouch, deleteBloodPouch, listBloodPouches, updateBloodPouch } from './remote-api.client'
import type { CreateBloodPouchInput, UpdateBloodPouchInput } from '../../shared/blood-bank-types'

function requireToken(): string {
  const token = getCurrentToken()
  if (!token) {
    throw new Error('Non authentifié.')
  }
  return token
}

export function list() {
  return listBloodPouches(requireToken())
}

export function create(input: CreateBloodPouchInput) {
  return createBloodPouch(requireToken(), input)
}

export function update(id: string, input: UpdateBloodPouchInput) {
  return updateBloodPouch(requireToken(), id, input)
}

export function remove(id: string) {
  return deleteBloodPouch(requireToken(), id)
}
