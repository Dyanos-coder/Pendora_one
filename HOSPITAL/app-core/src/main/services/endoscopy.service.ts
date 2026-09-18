import { getCurrentToken } from './session.store'
import {
  createEndoscopyProcedure,
  deleteEndoscopyProcedure,
  endoscopyPatientsFollowed,
  listEndoscopyProcedures,
  updateEndoscopyProcedure
} from './remote-api.client'
import type { CreateEndoscopyProcedureInput, UpdateEndoscopyProcedureInput } from '../../shared/endoscopy-types'

function requireToken(): string {
  const token = getCurrentToken()
  if (!token) {
    throw new Error('Non authentifié.')
  }
  return token
}

export function list() {
  return listEndoscopyProcedures(requireToken())
}

export function create(input: CreateEndoscopyProcedureInput) {
  return createEndoscopyProcedure(requireToken(), input)
}

export function update(id: string, input: UpdateEndoscopyProcedureInput) {
  return updateEndoscopyProcedure(requireToken(), id, input)
}

export function remove(id: string) {
  return deleteEndoscopyProcedure(requireToken(), id)
}

export function patientsFollowed() {
  return endoscopyPatientsFollowed(requireToken())
}
