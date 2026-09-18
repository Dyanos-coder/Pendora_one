import { app, shell, BrowserWindow } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { registerAuthIpcHandlers } from './ipc/auth.ipc'
import { registerFinanceIpcHandlers } from './ipc/finance.ipc'
import { registerCompanyIpcHandlers } from './ipc/company.ipc'
import { registerMemoryIpcHandlers } from './ipc/memory.ipc'
import { registerSalesIpcHandlers } from './ipc/sales.ipc'
import { registerStocksIpcHandlers } from './ipc/stocks.ipc'
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
  electronApp.setAppUserModelId('com.pandoraone.core')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  registerAuthIpcHandlers()
  registerFinanceIpcHandlers()
  registerCompanyIpcHandlers()
  registerMemoryIpcHandlers()
  registerSalesIpcHandlers()
  registerStocksIpcHandlers()
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
