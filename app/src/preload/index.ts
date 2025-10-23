import { contextBridge, ipcRenderer } from 'electron'

const electronAPI = {
  openDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  
  // Task management APIs
  startTask: (taskData: any) => ipcRenderer.invoke('task:start', taskData),
  stopTask: (taskId: string) => ipcRenderer.invoke('task:stop', taskId),
  getTaskStatus: (taskId: string) => ipcRenderer.invoke('task:status', taskId),
  
  // Project management APIs
  addProject: (projectPath: string) => ipcRenderer.invoke('project:add', projectPath),
  listProjects: () => ipcRenderer.invoke('project:list'),
  
  // Settings APIs
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSettings: (settings: any) => ipcRenderer.invoke('settings:set', settings),
  
  // Event listeners
  onTaskLog: (callback: (data: string) => void) => {
    ipcRenderer.on('task:log', (_event, data) => callback(data))
  },
  onTaskError: (callback: (data: string) => void) => {
    ipcRenderer.on('task:error', (_event, data) => callback(data))
  },
  onTaskComplete: (callback: (data: any) => void) => {
    ipcRenderer.on('task:complete', (_event, data) => callback(data))
  },
  
  // Remove listeners
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel)
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// your renderer process.
contextBridge.exposeInMainWorld('electronAPI', electronAPI)

// Type definitions for the exposed APIs
export type ElectronAPI = typeof electronAPI
