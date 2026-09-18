import { ipcMain } from 'electron'
import {
  addPrescription,
  addVitals,
  create,
  dossier,
  get,
  list,
  print,
  remove,
  update,
  updatePrescription
} from '../services/patients.service'
import type {
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

  ipcMain.handle('patients:addPrescription', (_event, id: string, input: CreatePrescriptionInput) => addPrescription(id, input))

  ipcMain.handle(
    'patients:updatePrescription',
    (_event, id: string, prescriptionId: string, input: UpdatePrescriptionInput) => updatePrescription(id, prescriptionId, input)
  )

  ipcMain.handle('patients:print', (_event, id: string) => print(id))
}
