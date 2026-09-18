import { getCurrentToken } from './session.store'
import { createMedication, deleteMedication, listMedications, updateMedication } from './remote-api.client'
import type { CreateMedicationInput, UpdateMedicationInput } from '../../shared/pharmacy-types'

function requireToken(): string {
  const token = getCurrentToken()
  if (!token) {
    throw new Error('Non authentifié.')
  }
  return token
}

export function list() {
  return listMedications(requireToken())
}

export function create(input: CreateMedicationInput) {
  return createMedication(requireToken(), input)
}

export function update(id: string, input: UpdateMedicationInput) {
  return updateMedication(requireToken(), id, input)
}

export function remove(id: string) {
  return deleteMedication(requireToken(), id)
}
