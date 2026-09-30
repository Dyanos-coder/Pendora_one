import { randomUUID } from 'crypto'
import { getCurrentToken } from './session.store'
import { createAppointment, deleteAppointment, listAppointments, listEmployees, NETWORK_ERROR_MESSAGE, updateAppointment } from './remote-api.client'
import { getConnectivityStatus } from './connectivity.service'
import { enqueue } from './sync-outbox.service'
import { registerSyncDispatcher, type DispatchResult } from './sync-worker'
import {
  createLocalAppointment,
  getLocalAppointmentServerUpdatedAt,
  listLocalAppointments,
  softDeleteLocalAppointment,
  syncDownAppointments,
  updateLocalAppointment,
  upsertSyncedAppointment
} from './appointments-local.service'
import type { CreateAppointmentInput, UpdateAppointmentInput } from '../../shared/appointment-types'

// Mode hors-ligne — Phase 1 : Rendez-vous (voir Plan-Mode-Hors-Ligne-Synchronisation.md). Même
// pattern que patients.service.ts.

function requireToken(): string {
  const token = getCurrentToken()
  if (!token) {
    throw new Error('Non authentifié.')
  }
  return token
}

function isNetworkError(error: string): boolean {
  return error === NETWORK_ERROR_MESSAGE
}

export async function list() {
  const remote = await listAppointments(requireToken())
  if (remote.ok) {
    await syncDownAppointments(remote.data.appointments)
    return remote
  }
  if (getConnectivityStatus() === 'OFFLINE' || isNetworkError(remote.error)) {
    return { ok: true, data: { appointments: await listLocalAppointments() } }
  }
  return remote
}

export async function create(input: CreateAppointmentInput) {
  if (getConnectivityStatus() === 'ONLINE') {
    const remote = await createAppointment(requireToken(), input)
    if (remote.ok) {
      await upsertSyncedAppointment(remote.data.appointment)
      return remote
    }
    if (!isNetworkError(remote.error)) return remote
  }

  const id = randomUUID()
  const appointment = await createLocalAppointment(id, input)
  await enqueue('appointment', id, 'CREATE', { ...input, id })
  return { ok: true, data: { appointment } }
}

export async function update(id: string, input: UpdateAppointmentInput) {
  if (getConnectivityStatus() === 'ONLINE') {
    const remote = await updateAppointment(requireToken(), id, input)
    if (remote.ok) {
      await upsertSyncedAppointment(remote.data.appointment)
      return remote
    }
    if (!isNetworkError(remote.error)) return remote
  }

  const expectedUpdatedAt = await getLocalAppointmentServerUpdatedAt(id)
  const appointment = await updateLocalAppointment(id, input)
  await enqueue('appointment', id, 'UPDATE', { ...input, id, expectedUpdatedAt })
  return { ok: true, data: { appointment } }
}

export async function remove(id: string) {
  if (getConnectivityStatus() === 'ONLINE') {
    const remote = await deleteAppointment(requireToken(), id)
    if (remote.ok) {
      await softDeleteLocalAppointment(id)
      return remote
    }
    if (!isNetworkError(remote.error)) return remote
  }

  await softDeleteLocalAppointment(id)
  await enqueue('appointment', id, 'DELETE', { id })
  return { ok: true, data: {} }
}

export function listDoctors() {
  return listEmployees(requireToken())
}

registerSyncDispatcher('appointment', async (operation, payload): Promise<DispatchResult> => {
  const token = getCurrentToken()
  if (!token) return { ok: false, error: 'Non authentifié.', retryable: true }

  if (operation === 'CREATE') {
    const input = payload as CreateAppointmentInput & { id: string }
    const result = await createAppointment(token, input)
    if (!result.ok) return { ok: false, error: result.error, retryable: isNetworkError(result.error) }
    await upsertSyncedAppointment(result.data.appointment)
    return { ok: true }
  }

  if (operation === 'UPDATE') {
    const { id, ...input } = payload as UpdateAppointmentInput & { id: string }
    const result = await updateAppointment(token, id, input)
    if (!result.ok) {
      return { ok: false, error: result.error, retryable: isNetworkError(result.error), conflict: result.conflict }
    }
    await upsertSyncedAppointment(result.data.appointment)
    return { ok: true }
  }

  if (operation === 'DELETE') {
    const { id } = payload as { id: string }
    const result = await deleteAppointment(token, id)
    if (!result.ok) return { ok: false, error: result.error, retryable: isNetworkError(result.error) }
    return { ok: true }
  }

  return { ok: false, error: `Opération de synchro inconnue : ${operation}.`, retryable: false }
})
