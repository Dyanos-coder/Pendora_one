import { getCurrentToken } from './session.store'
import { createLabRequest, deleteLabRequest, listLabRequests, updateLabRequest } from './remote-api.client'
import type { CreateLabRequestInput, UpdateLabRequestInput } from '../../shared/laboratory-types'

function requireToken(): string {
  const token = getCurrentToken()
  if (!token) {
    throw new Error('Non authentifié.')
  }
  return token
}

export function list() {
  return listLabRequests(requireToken())
}

export function create(input: CreateLabRequestInput) {
  return createLabRequest(requireToken(), input)
}

export function update(id: string, input: UpdateLabRequestInput) {
  return updateLabRequest(requireToken(), id, input)
}

export function remove(id: string) {
  return deleteLabRequest(requireToken(), id)
}
