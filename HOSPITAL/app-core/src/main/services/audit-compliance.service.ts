import { getCurrentToken } from './session.store'
import { createAudit, deleteAudit, listAuditFindings, listAudits, listComplianceFrameworks, updateAudit } from './remote-api.client'
import type { CreateAuditInput, UpdateAuditInput } from '../../shared/audit-compliance-types'

function requireToken(): string {
  const token = getCurrentToken()
  if (!token) {
    throw new Error('Non authentifié.')
  }
  return token
}

export function audits() {
  return listAudits(requireToken())
}

export function createNewAudit(input: CreateAuditInput) {
  return createAudit(requireToken(), input)
}

export function updateExistingAudit(id: string, input: UpdateAuditInput) {
  return updateAudit(requireToken(), id, input)
}

export function deleteExistingAudit(id: string) {
  return deleteAudit(requireToken(), id)
}

export function findings() {
  return listAuditFindings(requireToken())
}

export function frameworks() {
  return listComplianceFrameworks(requireToken())
}
