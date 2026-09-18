import { ipcMain } from 'electron'
import { audits, createNewAudit, deleteExistingAudit, findings, frameworks, updateExistingAudit } from '../services/audit-compliance.service'
import type { CreateAuditInput, UpdateAuditInput } from '../../shared/audit-compliance-types'

export function registerAuditComplianceIpcHandlers(): void {
  ipcMain.handle('auditCompliance:audits', () => audits())

  ipcMain.handle('auditCompliance:createAudit', (_event, input: CreateAuditInput) => createNewAudit(input))

  ipcMain.handle('auditCompliance:updateAudit', (_event, id: string, input: UpdateAuditInput) => updateExistingAudit(id, input))

  ipcMain.handle('auditCompliance:deleteAudit', (_event, id: string) => deleteExistingAudit(id))

  ipcMain.handle('auditCompliance:findings', () => findings())

  ipcMain.handle('auditCompliance:frameworks', () => frameworks())
}
