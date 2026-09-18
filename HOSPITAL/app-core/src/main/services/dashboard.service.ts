import { getCurrentToken } from './session.store'
import { getDashboardSummary } from './remote-api.client'

function requireToken(): string {
  const token = getCurrentToken()
  if (!token) {
    throw new Error('Non authentifié.')
  }
  return token
}

export function summary() {
  return getDashboardSummary(requireToken())
}
