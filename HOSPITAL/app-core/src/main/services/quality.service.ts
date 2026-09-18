import { getCurrentToken } from './session.store'
import {
  createQualityAction,
  createQualityCertification,
  createQualityIndicator,
  deleteQualityAction,
  deleteQualityCertification,
  deleteQualityIndicator,
  listQualityActions,
  listQualityCertifications,
  listQualityIndicators,
  updateQualityAction,
  updateQualityCertification,
  updateQualityIndicator
} from './remote-api.client'
import type {
  CreateQualityActionInput,
  CreateQualityCertificationInput,
  CreateQualityIndicatorInput,
  UpdateQualityActionInput,
  UpdateQualityCertificationInput,
  UpdateQualityIndicatorInput
} from '../../shared/quality-types'

function requireToken(): string {
  const token = getCurrentToken()
  if (!token) {
    throw new Error('Non authentifié.')
  }
  return token
}

export function indicators() {
  return listQualityIndicators(requireToken())
}

export function createIndicator(input: CreateQualityIndicatorInput) {
  return createQualityIndicator(requireToken(), input)
}

export function updateIndicator(id: string, input: UpdateQualityIndicatorInput) {
  return updateQualityIndicator(requireToken(), id, input)
}

export function deleteIndicator(id: string) {
  return deleteQualityIndicator(requireToken(), id)
}

export function certifications() {
  return listQualityCertifications(requireToken())
}

export function createCertification(input: CreateQualityCertificationInput) {
  return createQualityCertification(requireToken(), input)
}

export function updateCertification(id: string, input: UpdateQualityCertificationInput) {
  return updateQualityCertification(requireToken(), id, input)
}

export function deleteCertification(id: string) {
  return deleteQualityCertification(requireToken(), id)
}

export function actions() {
  return listQualityActions(requireToken())
}

export function createAction(input: CreateQualityActionInput) {
  return createQualityAction(requireToken(), input)
}

export function updateAction(id: string, input: UpdateQualityActionInput) {
  return updateQualityAction(requireToken(), id, input)
}

export function deleteAction(id: string) {
  return deleteQualityAction(requireToken(), id)
}
