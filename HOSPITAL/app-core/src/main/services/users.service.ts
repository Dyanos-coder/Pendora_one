import { getCurrentToken } from './session.store'
import { changeOwnPassword, createUser, listUsers, resetUserPassword, updateUser } from './remote-api.client'
import type { CreateUserInput, UpdateUserInput } from '../../shared/user-types'

function requireToken(): string {
  const token = getCurrentToken()
  if (!token) {
    throw new Error('Non authentifié.')
  }
  return token
}

export function list() {
  return listUsers(requireToken())
}

export function create(input: CreateUserInput) {
  return createUser(requireToken(), input)
}

export function update(id: string, input: UpdateUserInput) {
  return updateUser(requireToken(), id, input)
}

export function resetPassword(id: string, newPassword: string) {
  return resetUserPassword(requireToken(), id, newPassword)
}

export function changePassword(currentPassword: string, newPassword: string) {
  return changeOwnPassword(requireToken(), currentPassword, newPassword)
}
