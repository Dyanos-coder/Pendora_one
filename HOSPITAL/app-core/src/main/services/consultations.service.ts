import { getCurrentToken } from './session.store'
import { createConsultation, deleteConsultation, listConsultations, updateConsultation } from './remote-api.client'
import type { CreateConsultationInput, UpdateConsultationInput } from '../../shared/consultation-types'

function requireToken(): string {
  const token = getCurrentToken()
  if (!token) {
    throw new Error('Non authentifié.')
  }
  return token
}

export function list() {
  return listConsultations(requireToken())
}

export function create(input: CreateConsultationInput) {
  return createConsultation(requireToken(), input)
}

export function update(id: string, input: UpdateConsultationInput) {
  return updateConsultation(requireToken(), id, input)
}

export function remove(id: string) {
  return deleteConsultation(requireToken(), id)
}
