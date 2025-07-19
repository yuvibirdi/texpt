import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // File operations
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  saveFile: (data: any) => ipcRenderer.invoke('dialog:saveFile', data),
  
  // LaTeX compilation
  compileLatex: (source: string, options?: any) => ipcRenderer.invoke('latex:compile', source, options),
  cancelLatexJob: (jobId: string) => ipcRenderer.invoke('latex:cancel', jobId),
  getLatexQueueStatus: () => ipcRenderer.invoke('latex:getQueueStatus'),
  clearLatexQueue: () => ipcRenderer.invoke('latex:clearQueue'),
  checkLatexAvailability: () => ipcRenderer.invoke('latex:checkAvailability'),
  
  // Window management
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window:maximize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
  isWindowMaximized: () => ipcRenderer.invoke('window:isMaximized'),
  
  // Application info
  getAppVersion: () => ipcRenderer.invoke('app:getVersion'),
  getAppName: () => ipcRenderer.invoke('app:getName'),
  getPlatform: () => ipcRenderer.invoke('app:getPlatform'),
  
  // Export operations
  exportSaveFile: (data: string, options?: any) => ipcRenderer.invoke('export:saveFile', data, options),
  exportWriteFile: (filePath: string, content: string) => ipcRenderer.invoke('export:writeFile', filePath, content),
  exportWriteFileBuffer: (filePath: string, buffer: Buffer) => ipcRenderer.invoke('export:writeFileBuffer', filePath, buffer),
  exportGetFileStats: (filePath: string) => ipcRenderer.invoke('export:getFileStats', filePath),
  
  // Error reporting
  reportError: (error: any) => ipcRenderer.invoke('app:reportError', error),
  
  // Application events
  onMenuAction: (callback: (action: string) => void) => {
    ipcRenderer.on('menu-action', (_event, action) => callback(action));
  },
  
  // LaTeX compilation events
  onLatexProgress: (callback: (progress: any) => void) => {
    ipcRenderer.on('latex:progress', (_event, progress) => callback(progress));
  },
  onLatexJobCompleted: (callback: (result: any) => void) => {
    ipcRenderer.on('latex:job-completed', (_event, result) => callback(result));
  },
  onLatexJobCancelled: (callback: (data: any) => void) => {
    ipcRenderer.on('latex:job-cancelled', (_event, data) => callback(data));
  },
  
  // Remove listeners
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  }
});