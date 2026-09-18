import { ipcMain } from 'electron'
import {
  actions,
  certifications,
  createAction,
  createCertification,
  createIndicator,
  deleteAction,
  deleteCertification,
  deleteIndicator,
  indicators,
  updateAction,
  updateCertification,
  updateIndicator
} from '../services/quality.service'
import type {
  CreateQualityActionInput,
  CreateQualityCertificationInput,
  CreateQualityIndicatorInput,
  UpdateQualityActionInput,
  UpdateQualityCertificationInput,
  UpdateQualityIndicatorInput
} from '../../shared/quality-types'

export function registerQualityIpcHandlers(): void {
  ipcMain.handle('quality:indicators', () => indicators())

  ipcMain.handle('quality:createIndicator', (_event, input: CreateQualityIndicatorInput) => createIndicator(input))

  ipcMain.handle('quality:updateIndicator', (_event, id: string, input: UpdateQualityIndicatorInput) => updateIndicator(id, input))

  ipcMain.handle('quality:deleteIndicator', (_event, id: string) => deleteIndicator(id))

  ipcMain.handle('quality:certifications', () => certifications())

  ipcMain.handle('quality:createCertification', (_event, input: CreateQualityCertificationInput) => createCertification(input))

  ipcMain.handle('quality:updateCertification', (_event, id: string, input: UpdateQualityCertificationInput) =>
    updateCertification(id, input)
  )

  ipcMain.handle('quality:deleteCertification', (_event, id: string) => deleteCertification(id))

  ipcMain.handle('quality:actions', () => actions())

  ipcMain.handle('quality:createAction', (_event, input: CreateQualityActionInput) => createAction(input))

  ipcMain.handle('quality:updateAction', (_event, id: string, input: UpdateQualityActionInput) => updateAction(id, input))

  ipcMain.handle('quality:deleteAction', (_event, id: string) => deleteAction(id))
}
