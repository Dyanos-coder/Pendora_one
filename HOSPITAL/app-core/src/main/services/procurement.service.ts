import { getCurrentToken } from './session.store'
import {
  createProcurementRequest,
  deleteProcurementRequest,
  listProcurementRequests,
  listSuppliers,
  updateProcurementRequest
} from './remote-api.client'
import type { CreateProcurementRequestInput, UpdateProcurementRequestInput } from '../../shared/procurement-types'

function requireToken(): string {
  const token = getCurrentToken()
  if (!token) {
    throw new Error('Non authentifié.')
  }
  return token
}

export function list() {
  return listProcurementRequests(requireToken())
}

export function suppliers() {
  return listSuppliers(requireToken())
}

export function create(input: CreateProcurementRequestInput) {
  return createProcurementRequest(requireToken(), input)
}

export function update(id: string, input: UpdateProcurementRequestInput) {
  return updateProcurementRequest(requireToken(), id, input)
}

export function remove(id: string) {
  return deleteProcurementRequest(requireToken(), id)
}
