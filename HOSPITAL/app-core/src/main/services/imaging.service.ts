import { getCurrentToken } from './session.store'
import { createImagingRequest, deleteImagingRequest, listImagingRequests, updateImagingRequest } from './remote-api.client'
import type { CreateImagingRequestInput, UpdateImagingRequestInput } from '../../shared/imaging-types'

function requireToken(): string {
  const token = getCurrentToken()
  if (!token) {
    throw new Error('Non authentifié.')
  }
  return token
}

export function list() {
  return listImagingRequests(requireToken())
}

export function create(input: CreateImagingRequestInput) {
  return createImagingRequest(requireToken(), input)
}

export function update(id: string, input: UpdateImagingRequestInput) {
  return updateImagingRequest(requireToken(), id, input)
}

export function remove(id: string) {
  return deleteImagingRequest(requireToken(), id)
}
