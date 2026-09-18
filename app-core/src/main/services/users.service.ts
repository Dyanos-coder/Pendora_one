import { getCurrentToken } from './session.store'
import { getUserActivity, listUsers, setUserActive } from './remote-api.client'

function requireToken(): string {
  const token = getCurrentToken()
  if (!token) {
    throw new Error('Non authentifié.')
  }
  return token
}

export function listManagedUsers() {
  return listUsers(requireToken())
}

export function setManagedUserActive(id: string, isActive: boolean) {
  return setUserActive(requireToken(), id, isActive)
}

export function getManagedUserActivity(id: string, page = 1) {
  return getUserActivity(requireToken(), id, page)
}
