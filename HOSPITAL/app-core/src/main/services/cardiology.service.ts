import { getCurrentToken } from './session.store'
import { cardioPatientsFollowed, createCardioExam, deleteCardioExam, listCardioExams, updateCardioExam } from './remote-api.client'
import type { CreateCardioExamInput, UpdateCardioExamInput } from '../../shared/cardiology-types'

function requireToken(): string {
  const token = getCurrentToken()
  if (!token) {
    throw new Error('Non authentifié.')
  }
  return token
}

export function list() {
  return listCardioExams(requireToken())
}

export function create(input: CreateCardioExamInput) {
  return createCardioExam(requireToken(), input)
}

export function update(id: string, input: UpdateCardioExamInput) {
  return updateCardioExam(requireToken(), id, input)
}

export function remove(id: string) {
  return deleteCardioExam(requireToken(), id)
}

export function patientsFollowed() {
  return cardioPatientsFollowed(requireToken())
}
