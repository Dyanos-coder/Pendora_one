import { app, shell, BrowserWindow } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { registerAuthIpcHandlers } from './ipc/auth.ipc'
import { registerAiIpcHandlers } from './ipc/ai.ipc'
import { registerPatientsIpcHandlers } from './ipc/patients.ipc'
import { registerAppointmentsIpcHandlers } from './ipc/appointments.ipc'
import { registerConsultationsIpcHandlers } from './ipc/consultations.ipc'
import { registerHospitalizationsIpcHandlers } from './ipc/hospitalizations.ipc'
import { registerEmergenciesIpcHandlers } from './ipc/emergencies.ipc'
import { registerOperatingRoomIpcHandlers } from './ipc/operating-room.ipc'
import { registerLaboratoryIpcHandlers } from './ipc/laboratory.ipc'
import { registerImagingIpcHandlers } from './ipc/imaging.ipc'
import { registerCardiologyIpcHandlers } from './ipc/cardiology.ipc'
import { registerPathologyIpcHandlers } from './ipc/pathology.ipc'
import { registerEndoscopyIpcHandlers } from './ipc/endoscopy.ipc'
import { registerPharmacyIpcHandlers } from './ipc/pharmacy.ipc'
import { registerStocksIpcHandlers } from './ipc/stocks.ipc'
import { registerProcurementIpcHandlers } from './ipc/procurement.ipc'
import { registerBloodBankIpcHandlers } from './ipc/blood-bank.ipc'
import { registerFinanceIpcHandlers } from './ipc/finance.ipc'
import { registerHrIpcHandlers } from './ipc/hr.ipc'
import { registerQualityIpcHandlers } from './ipc/quality.ipc'
import { registerRiskIpcHandlers } from './ipc/risk.ipc'
import { registerAuditComplianceIpcHandlers } from './ipc/audit-compliance.ipc'
import { registerDocumentsIpcHandlers } from './ipc/documents.ipc'
import { registerDashboardIpcHandlers } from './ipc/dashboard.ipc'
import { registerAutomationIpcHandlers } from './ipc/automation.ipc'
import { registerReportsIpcHandlers } from './ipc/reports.ipc'
import { registerUsersIpcHandlers } from './ipc/users.ipc'

function createWindow(): BrowserWindow {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      plugins: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return mainWindow
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.pandorahealth.core')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  registerAuthIpcHandlers()
  registerAiIpcHandlers()
  registerPatientsIpcHandlers()
  registerAppointmentsIpcHandlers()
  registerConsultationsIpcHandlers()
  registerHospitalizationsIpcHandlers()
  registerEmergenciesIpcHandlers()
  registerOperatingRoomIpcHandlers()
  registerLaboratoryIpcHandlers()
  registerImagingIpcHandlers()
  registerCardiologyIpcHandlers()
  registerPathologyIpcHandlers()
  registerEndoscopyIpcHandlers()
  registerPharmacyIpcHandlers()
  registerStocksIpcHandlers()
  registerProcurementIpcHandlers()
  registerBloodBankIpcHandlers()
  registerFinanceIpcHandlers()
  registerHrIpcHandlers()
  registerQualityIpcHandlers()
  registerRiskIpcHandlers()
  registerAuditComplianceIpcHandlers()
  registerDocumentsIpcHandlers()
  registerDashboardIpcHandlers()
  registerAutomationIpcHandlers()
  registerReportsIpcHandlers()
  registerUsersIpcHandlers()

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
