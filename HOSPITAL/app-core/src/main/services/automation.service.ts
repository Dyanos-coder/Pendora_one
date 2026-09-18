import { getCurrentToken } from './session.store'
import { listAutomationLogs, listAutomationRules, toggleAutomationRule } from './remote-api.client'

function requireToken(): string {
  const token = getCurrentToken()
  if (!token) {
    throw new Error('Non authentifié.')
  }
  return token
}

export function rules() {
  return listAutomationRules(requireToken())
}

export function logs() {
  return listAutomationLogs(requireToken())
}

export function toggle(id: string, active: boolean) {
  return toggleAutomationRule(requireToken(), id, active)
}
