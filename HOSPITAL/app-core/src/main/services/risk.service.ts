import { getCurrentToken } from './session.store'
import { createRisk, deleteRisk, listRisks, updateRisk } from './remote-api.client'
import type { CreateRiskInput, UpdateRiskInput } from '../../shared/risk-types'

function requireToken(): string {
  const token = getCurrentToken()
  if (!token) {
    throw new Error('Non authentifié.')
  }
  return token
}

export function list() {
  return listRisks(requireToken())
}

export function create(input: CreateRiskInput) {
  return createRisk(requireToken(), input)
}

export function update(id: string, input: UpdateRiskInput) {
  return updateRisk(requireToken(), id, input)
}

export function remove(id: string) {
  return deleteRisk(requireToken(), id)
}
