import { getCurrentToken } from './session.store'
import {
  bedOccupancy,
  createHospitalization,
  deleteHospitalization,
  listBeds,
  listHospitalizations,
  updateHospitalization
} from './remote-api.client'
import type { CreateHospitalizationInput, UpdateHospitalizationInput } from '../../shared/hospitalization-types'

function requireToken(): string {
  const token = getCurrentToken()
  if (!token) {
    throw new Error('Non authentifié.')
  }
  return token
}

export function list() {
  return listHospitalizations(requireToken())
}

export function create(input: CreateHospitalizationInput) {
  return createHospitalization(requireToken(), input)
}

export function update(id: string, input: UpdateHospitalizationInput) {
  return updateHospitalization(requireToken(), id, input)
}

export function remove(id: string) {
  return deleteHospitalization(requireToken(), id)
}

export function beds() {
  return listBeds(requireToken())
}

export function occupancy() {
  return bedOccupancy(requireToken())
}
