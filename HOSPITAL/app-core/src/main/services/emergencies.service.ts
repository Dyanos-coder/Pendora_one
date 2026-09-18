import { getCurrentToken } from './session.store'
import { createEmergencyVisit, deleteEmergencyVisit, listEmergencyVisits, updateEmergencyVisit } from './remote-api.client'
import type { CreateEmergencyVisitInput, UpdateEmergencyVisitInput } from '../../shared/emergency-types'

function requireToken(): string {
  const token = getCurrentToken()
  if (!token) {
    throw new Error('Non authentifié.')
  }
  return token
}

export function list() {
  return listEmergencyVisits(requireToken())
}

export function create(input: CreateEmergencyVisitInput) {
  return createEmergencyVisit(requireToken(), input)
}

export function update(id: string, input: UpdateEmergencyVisitInput) {
  return updateEmergencyVisit(requireToken(), id, input)
}

export function remove(id: string) {
  return deleteEmergencyVisit(requireToken(), id)
}
