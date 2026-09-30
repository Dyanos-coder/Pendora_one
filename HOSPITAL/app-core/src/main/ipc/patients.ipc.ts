import { ipcMain } from 'electron'
import {
  addDocument,
  addPrescription,
  addVitals,
  create,
  dossier,
  get,
  list,
  listDocuments,
  print,
  remove,
  removeDocument,
  update,
  updatePrescription,
  uploadDocumentFile,
  uploadVitalsDocument,
  viewDocumentFile,
  viewVitalsDocument
} from '../services/patients.service'
import type {
  CreatePatientDocumentInput,
  CreatePatientInput,
  CreatePrescriptionInput,
  CreateVitalsInput,
  UpdatePatientInput,
  UpdatePrescriptionInput
} from '../../shared/patient-types'

export function registerPatientsIpcHandlers(): void {
  ipcMain.handle('patients:list', () => list())

  ipcMain.handle('patients:get', (_event, id: string) => get(id))

  ipcMain.handle('patients:create', (_event, input: CreatePatientInput) => create(input))

  ipcMain.handle('patients:update', (_event, id: string, input: UpdatePatientInput) => update(id, input))

  ipcMain.handle('patients:delete', (_event, id: string) => remove(id))

  ipcMain.handle('patients:dossier', (_event, id: string) => dossier(id))

  ipcMain.handle('patients:addVitals', (_event, id: string, input: CreateVitalsInput) => addVitals(id, input))
  ipcMain.handle('patients:vitals:uploadFile', (_event, patientId: string, vitalsId: string) =>
    uploadVitalsDocument(patientId, vitalsId)
  )
  ipcMain.handle('patients:vitals:viewFile', (_event, patientId: string, vitalsId: string) =>
    viewVitalsDocument(patientId, vitalsId)
  )

  ipcMain.handle('patients:addPrescription', (_event, id: string, input: CreatePrescriptionInput) => addPrescription(id, input))

  ipcMain.handle(
    'patients:updatePrescription',
    (_event, id: string, prescriptionId: string, input: UpdatePrescriptionInput) => updatePrescription(id, prescriptionId, input)
  )

  ipcMain.handle('patients:print', (_event, id: string) => print(id))

  ipcMain.handle('patients:documents:list', (_event, patientId: string) => listDocuments(patientId))
  ipcMain.handle('patients:documents:create', (_event, input: CreatePatientDocumentInput) => addDocument(input))
  ipcMain.handle('patients:documents:delete', (_event, patientId: string, documentId: string) => removeDocument(patientId, documentId))
  ipcMain.handle('patients:documents:uploadFile', (_event, patientId: string, documentId: string) =>
    uploadDocumentFile(patientId, documentId)
  )
  ipcMain.handle('patients:documents:view', (_event, patientId: string, documentId: string) => viewDocumentFile(patientId, documentId))
}
