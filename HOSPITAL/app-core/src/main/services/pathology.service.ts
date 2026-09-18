import { getCurrentToken } from './session.store'
import {
  createPathologyRequest,
  deletePathologyRequest,
  listPathologyRequests,
  pathologyPatientsFollowed,
  updatePathologyRequest
} from './remote-api.client'
import type { CreatePathologyRequestInput, UpdatePathologyRequestInput } from '../../shared/pathology-types'

function requireToken(): string {
  const token = getCurrentToken()
  if (!token) {
    throw new Error('Non authentifié.')
  }
  return token
}

export function list() {
  return listPathologyRequests(requireToken())
}

export function create(input: CreatePathologyRequestInput) {
  return createPathologyRequest(requireToken(), input)
}

export function update(id: string, input: UpdatePathologyRequestInput) {
  return updatePathologyRequest(requireToken(), id, input)
}

export function remove(id: string) {
  return deletePathologyRequest(requireToken(), id)
}

export function patientsFollowed() {
  return pathologyPatientsFollowed(requireToken())
}
