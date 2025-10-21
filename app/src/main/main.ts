import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
import { join } from 'path'
import { spawn } from 'child_process'
import { existsSync } from 'fs'

// Keep a global reference of the window object
let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.openDevTools()

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Load the remote URL for development or the local html file for production.
  if (process.env.NODE_ENV === 'development' && process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })

})

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// IPC handlers
ipcMain.handle('dialog:openDirectory', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openDirectory']
  })
  return result
})

ipcMain.handle('dialog:openFile', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openFile'],
    filters: [
      { name: 'All Files', extensions: ['*'] },
      { name: 'Images', extensions: ['jpg', 'png', 'gif'] },
      { name: 'Movies', extensions: ['mkv', 'avi', 'mp4'] }
    ]
  })
  return result
})

// Task management IPC handlers
ipcMain.handle('task:start', async (_event, _taskData) => {
  try {
    // Start orchestrator service if not running
    const orchestratorPath = join(__dirname, '../../../server/dist/index.js')
    if (existsSync(orchestratorPath)) {
      const orchestrator = spawn('node', [orchestratorPath], {
        stdio: ['pipe', 'pipe', 'pipe']
      })
      
      // Handle orchestrator output
      orchestrator.stdout?.on('data', (data) => {
        mainWindow?.webContents.send('task:log', data.toString())
      })
      
      orchestrator.stderr?.on('data', (data) => {
        mainWindow?.webContents.send('task:error', data.toString())
      })
      
      return { success: true, taskId: Date.now().toString() }
    } else {
      throw new Error('Orchestrator service not found')
    }
  } catch (error) {
    console.error('Failed to start task:', error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
})

ipcMain.handle('task:stop', async (_event, _taskId) => {
  // Stop task implementation
  return { success: true }
})

ipcMain.handle('task:status', async (_event, _taskId) => {
  // Get task status implementation
  return { status: 'running', progress: 50 }
})

// Project management IPC handlers
ipcMain.handle('project:add', async (_event, projectPath) => {
  try {
    // Validate project path and detect project type
    if (!existsSync(projectPath)) {
      throw new Error('Project path does not exist')
    }
    
    // Detect project type based on files
    const packageJsonPath = join(projectPath, 'package.json')
    const hasPackageJson = existsSync(packageJsonPath)
    
    let projectType = 'unknown'
    if (hasPackageJson) {
      projectType = 'node'
    }
    
    return {
      success: true,
      project: {
        id: Date.now().toString(),
        path: projectPath,
        type: projectType,
        name: projectPath.split(/[/\\]/).pop()
      }
    }
  } catch (error) {
    console.error('Failed to add project:', error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
})

ipcMain.handle('project:list', async () => {
  // Return list of projects from local storage
  return { projects: [] }
})

// Settings IPC handlers
ipcMain.handle('settings:get', async () => {
  return {
    theme: 'system',
    telemetry: false,
    autoUpdate: true
  }
})

ipcMain.handle('settings:set', async (_event, _settings) => {
  // Save settings to local storage
  return { success: true }
})
