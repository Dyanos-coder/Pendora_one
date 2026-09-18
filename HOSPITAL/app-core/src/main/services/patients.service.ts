import { app, shell } from 'electron'
import { writeFileSync } from 'fs'
import { join } from 'path'
import { getCurrentToken } from './session.store'
import {
  createPatient,
  createPatientPrescription,
  createPatientVitals,
  deletePatient,
  getPatient,
  getPatientDossier,
  getPatientPrintDocument,
  listPatients,
  updatePatient,
  updatePatientPrescription
} from './remote-api.client'
import type {
  CreatePatientInput,
  CreatePrescriptionInput,
  CreateVitalsInput,
  UpdatePatientInput,
  UpdatePrescriptionInput
} from '../../shared/patient-types'

function requireToken(): string {
  const token = getCurrentToken()
  if (!token) {
    throw new Error('Non authentifié.')
  }
  return token
}

export function list() {
  return listPatients(requireToken())
}

export function get(id: string) {
  return getPatient(requireToken(), id)
}

export function create(input: CreatePatientInput) {
  return createPatient(requireToken(), input)
}

export function update(id: string, input: UpdatePatientInput) {
  return updatePatient(requireToken(), id, input)
}

export function remove(id: string) {
  return deletePatient(requireToken(), id)
}

export function dossier(id: string) {
  return getPatientDossier(requireToken(), id)
}

export function addVitals(id: string, input: CreateVitalsInput) {
  return createPatientVitals(requireToken(), id, input)
}

export function addPrescription(id: string, input: CreatePrescriptionInput) {
  return createPatientPrescription(requireToken(), id, input)
}

export function updatePrescription(id: string, prescriptionId: string, input: UpdatePrescriptionInput) {
  return updatePatientPrescription(requireToken(), id, prescriptionId, input)
}

/** Récupère le PDF généré par app-server puis l'ouvre avec la visionneuse par défaut de l'OS
 * (prêt à imprimer via Ctrl+P côté visionneuse) — pas de boîte "Enregistrer sous" ici,
 * contrairement à reports.service.ts::download, car l'intention d'un clic sur "Imprimer" est
 * d'ouvrir le document tout de suite, pas de choisir où le classer. */
export async function print(id: string): Promise<void> {
  const token = requireToken()
  const result = await getPatientPrintDocument(token, id)
  if (!result.ok) {
    throw new Error(result.error)
  }

  const filePath = join(app.getPath('temp'), result.data.document.filename)
  writeFileSync(filePath, Buffer.from(result.data.document.contentBase64, 'base64'))
  await shell.openPath(filePath)
}
