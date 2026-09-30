import { app, dialog, session, shell, BrowserWindow } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
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
import { registerCompanyIpcHandlers } from './ipc/company.ipc'
import { registerPicklistIpcHandlers } from './ipc/picklist.ipc'
import { registerBackupIpcHandlers } from './ipc/backup.ipc'
import { registerConnectivityIpcHandlers } from './ipc/connectivity.ipc'
import { registerSyncIpcHandlers } from './ipc/sync.ipc'
import { registerSetupIpcHandlers } from './ipc/setup.ipc'
import { registerUpdaterIpcHandlers } from './ipc/updater.ipc'
import { registerCashierIpcHandlers } from './ipc/cashier.ipc'
import { registerSubscriptionIpcHandlers } from './ipc/subscription.ipc'
import { startUpdater } from './services/updater.service'
import { startSubscriptionMonitor } from './services/subscription.service'
import { startConnectivityMonitor } from './services/connectivity.service'
import { startSyncWorker } from './services/sync-worker'
import { initEmbeddedBackend } from './services/embedded-backend.service'
import { getPrismaClient } from './db/client'
import { migrateLocalDatabase } from './db/migrate-local-db'
import { isDevEnvironment } from './paths'

function createWindow(): BrowserWindow {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    show: false,
    autoHideMenuBar: true,
    icon,
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

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.pandorahealth.core')

  // Autorise silencieusement la géolocalisation (item 14 PETITES MODIFS — pointeuse automatique à
  // la connexion) : Electron refuse toute demande de permission par défaut tant qu'on ne répond
  // pas explicitement, contrairement à un navigateur qui affiche une invite à l'utilisateur.
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    callback(permission === 'geolocation')
  })

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Avant tout accès à la base locale (mode hors-ligne) : sur un poste qui n'a jamais lancé l'app,
  // ce fichier est vide (voir migrate-local-db.ts) — sans ça, toute requête locale échoue avec
  // "no such table" dès le premier essai. Uniquement en production : `dev.db` est déjà tenu à jour
  // par `prisma migrate dev` (voir db/client.ts) — rejouer les migrations SQL par-dessus créerait
  // un conflit avec les tables déjà existantes (et un faux "drift" détecté par le CLI Prisma ensuite).
  try {
    if (!isDevEnvironment()) await migrateLocalDatabase(getPrismaClient())
  } catch (error) {
    console.error('[migrate-local-db] échec de la migration de la base locale', error)
  }

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
  registerCompanyIpcHandlers()
  registerPicklistIpcHandlers()
  registerBackupIpcHandlers()
  registerConnectivityIpcHandlers()
  registerSyncIpcHandlers()
  registerSetupIpcHandlers()
  registerUpdaterIpcHandlers()
  registerCashierIpcHandlers()
  registerSubscriptionIpcHandlers()

  // Avant tout appel : démarre le backend embarqué (127.0.0.1, port libre) et lance le contrôle
  // de la base distante — voir Plan-Backend-Embarque-Travaux.md. Sans ça, le premier ping de
  // connectivité et le premier essai de connexion n'auraient aucun serveur à joindre.
  // Le port est choisi par le système (port 0 = premier port libre), donc jamais « déjà occupé ».
  // Si le démarrage échoue malgré tout (ex. antivirus/pare-feu qui bloque l'écoute locale), on le
  // dit clairement au lieu de laisser l'app ouverte sans fenêtre.
  try {
    await initEmbeddedBackend()
  } catch (error) {
    dialog.showErrorBox(
      'Pandora Health — démarrage impossible',
      `Le service interne de l'application n'a pas pu démarrer sur ce poste.

${error instanceof Error ? error.message : String(error)}

Vérifiez qu'un antivirus ou un pare-feu ne bloque pas Pandora Health, puis relancez l'application.`
    )
    app.quit()
    return
  }

  startConnectivityMonitor()
  startSyncWorker()
  // Abonnement Pandora (Plan-Site-Pandora.md §6) : contrôle au lancement, toutes les 15 min et au
  // retour de la connexion ; copie locale pour le contrôle hors connexion.
  startSubscriptionMonitor()

  createWindow()

  // Mise à jour automatique (Plan-Mise-A-Jour-Automatique.md) — vérification dès le lancement,
  // puis toutes les 30 min et au retour de la connexion ; inactive en développement.
  startUpdater()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
