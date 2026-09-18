import { getCurrentToken } from './session.store'
import { createHrEmployee, deleteHrEmployee, listHrEmployees, updateHrEmployee } from './remote-api.client'
import type { CreateHrEmployeeInput, UpdateHrEmployeeInput } from '../../shared/hr-types'

function requireToken(): string {
  const token = getCurrentToken()
  if (!token) {
    throw new Error('Non authentifié.')
  }
  return token
}

export function list() {
  return listHrEmployees(requireToken())
}

export function create(input: CreateHrEmployeeInput) {
  return createHrEmployee(requireToken(), input)
}

export function update(id: string, input: UpdateHrEmployeeInput) {
  return updateHrEmployee(requireToken(), id, input)
}

export function remove(id: string) {
  return deleteHrEmployee(requireToken(), id)
}
