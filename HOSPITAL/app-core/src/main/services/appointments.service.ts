import { getCurrentToken } from './session.store'
import { createAppointment, deleteAppointment, listAppointments, listEmployees, updateAppointment } from './remote-api.client'
import type { CreateAppointmentInput, UpdateAppointmentInput } from '../../shared/appointment-types'

function requireToken(): string {
  const token = getCurrentToken()
  if (!token) {
    throw new Error('Non authentifié.')
  }
  return token
}

export function list() {
  return listAppointments(requireToken())
}

export function create(input: CreateAppointmentInput) {
  return createAppointment(requireToken(), input)
}

export function update(id: string, input: UpdateAppointmentInput) {
  return updateAppointment(requireToken(), id, input)
}

export function remove(id: string) {
  return deleteAppointment(requireToken(), id)
}

export function listDoctors() {
  return listEmployees(requireToken())
}
