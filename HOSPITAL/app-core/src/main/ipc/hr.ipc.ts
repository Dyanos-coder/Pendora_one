import { ipcMain } from 'electron'
import {
  addAttendance,
  addContract,
  addDocument,
  addPayrollEntry,
  addReview,
  addTraining,
  checkIn,
  create,
  exportExcel,
  list,
  listAttendanceRecords,
  listDocuments,
  listEmployeeContracts,
  listEmployeeTrainings,
  listPayroll,
  listReviews,
  remove,
  removeAttendance,
  removeContract,
  removeDocument,
  removePayrollEntry,
  removeReview,
  removeTraining,
  update,
  updateAttendanceRecord,
  updateEmployeeContract,
  updateEmployeeTraining,
  updatePayroll,
  updateReview,
  uploadDocumentFile,
  viewDocumentFile
} from '../services/hr.service'
import type {
  CheckInAttendanceInput,
  CreateAttendanceInput,
  CreateContractInput,
  CreateEmployeeDocumentInput,
  CreateHrEmployeeInput,
  CreatePayrollEntryInput,
  CreatePerformanceReviewInput,
  CreateTrainingInput,
  UpdateAttendanceInput,
  UpdateContractInput,
  UpdateHrEmployeeInput,
  UpdatePayrollEntryInput,
  UpdatePerformanceReviewInput,
  UpdateTrainingInput
} from '../../shared/hr-types'

export function registerHrIpcHandlers(): void {
  ipcMain.handle('hr:list', () => list())

  ipcMain.handle('hr:create', (_event, input: CreateHrEmployeeInput) => create(input))

  ipcMain.handle('hr:update', (_event, id: string, input: UpdateHrEmployeeInput) => update(id, input))

  ipcMain.handle('hr:delete', (_event, id: string) => remove(id))

  ipcMain.handle('hr:exportExcel', () => exportExcel())

  ipcMain.handle('hr:attendance:list', () => listAttendanceRecords())
  ipcMain.handle('hr:attendance:create', (_event, input: CreateAttendanceInput) => addAttendance(input))
  ipcMain.handle('hr:attendance:update', (_event, id: string, input: UpdateAttendanceInput) => updateAttendanceRecord(id, input))
  ipcMain.handle('hr:attendance:delete', (_event, id: string) => removeAttendance(id))
  ipcMain.handle('hr:attendance:checkIn', (_event, input: CheckInAttendanceInput) => checkIn(input))

  ipcMain.handle('hr:contracts:list', () => listEmployeeContracts())
  ipcMain.handle('hr:contracts:create', (_event, input: CreateContractInput) => addContract(input))
  ipcMain.handle('hr:contracts:update', (_event, id: string, input: UpdateContractInput) => updateEmployeeContract(id, input))
  ipcMain.handle('hr:contracts:delete', (_event, id: string) => removeContract(id))

  ipcMain.handle('hr:performance:list', () => listReviews())
  ipcMain.handle('hr:performance:create', (_event, input: CreatePerformanceReviewInput) => addReview(input))
  ipcMain.handle('hr:performance:update', (_event, id: string, input: UpdatePerformanceReviewInput) => updateReview(id, input))
  ipcMain.handle('hr:performance:delete', (_event, id: string) => removeReview(id))

  ipcMain.handle('hr:training:list', () => listEmployeeTrainings())
  ipcMain.handle('hr:training:create', (_event, input: CreateTrainingInput) => addTraining(input))
  ipcMain.handle('hr:training:update', (_event, id: string, input: UpdateTrainingInput) => updateEmployeeTraining(id, input))
  ipcMain.handle('hr:training:delete', (_event, id: string) => removeTraining(id))

  ipcMain.handle('hr:payroll:list', () => listPayroll())
  ipcMain.handle('hr:payroll:create', (_event, input: CreatePayrollEntryInput) => addPayrollEntry(input))
  ipcMain.handle('hr:payroll:update', (_event, id: string, input: UpdatePayrollEntryInput) => updatePayroll(id, input))
  ipcMain.handle('hr:payroll:delete', (_event, id: string) => removePayrollEntry(id))

  ipcMain.handle('hr:documents:list', () => listDocuments())
  ipcMain.handle('hr:documents:create', (_event, input: CreateEmployeeDocumentInput) => addDocument(input))
  ipcMain.handle('hr:documents:delete', (_event, id: string) => removeDocument(id))
  ipcMain.handle('hr:documents:uploadFile', (_event, id: string) => uploadDocumentFile(id))
  ipcMain.handle('hr:documents:viewFile', (_event, id: string) => viewDocumentFile(id))
}
