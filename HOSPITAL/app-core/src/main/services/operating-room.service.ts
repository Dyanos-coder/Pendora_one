import { getCurrentToken } from './session.store'
import { createSurgery, deleteSurgery, listOperatingRooms, listSurgeries, updateSurgery } from './remote-api.client'
import type { CreateSurgeryInput, UpdateSurgeryInput } from '../../shared/operating-room-types'

function requireToken(): string {
  const token = getCurrentToken()
  if (!token) {
    throw new Error('Non authentifié.')
  }
  return token
}

export function list() {
  return listSurgeries(requireToken())
}

export function create(input: CreateSurgeryInput) {
  return createSurgery(requireToken(), input)
}

export function update(id: string, input: UpdateSurgeryInput) {
  return updateSurgery(requireToken(), id, input)
}

export function remove(id: string) {
  return deleteSurgery(requireToken(), id)
}

export function rooms() {
  return listOperatingRooms(requireToken())
}
