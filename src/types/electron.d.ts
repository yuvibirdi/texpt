// Global type declarations for Electron API

interface ElectronAPI {
  // File operations
  openFile: () => Promise<{
    success: boolean;
    filePath?: string;
    content?: string;
    error?: string;
    canceled?: boolean;
  }>;
  saveFile: (data: any) => Promise<{
    success: boolean;
    filePath?: string;
    error?: string;
    canceled?: boolean;
  }>;
  
  // LaTeX compilation
  compileLatex: (source: string, options?: any) => Promise<{
    success: boolean;
    jobId?: string;
    error?: string;
  }>;
  cancelLatexJob: (jobId: string) => Promise<{
    success: boolean;
    cancelled?: boolean;
    error?: string;
  }>;
  getLatexQueueStatus: () => Promise<{
    success: boolean;
    status?: { queued: number; active: number; total: number };
    error?: string;
  }>;
  clearLatexQueue: () => Promise<{
    success: boolean;
    error?: string;
  }>;
  checkLatexAvailability: () => Promise<{
    success: boolean;
    available?: boolean;
    compilers?: string[];
    version?: string;
    error?: string;
  }>;
  
  // Window management
  minimizeWindow: () => Promise<void>;
  maximizeWindow: () => Promise<void>;
  closeWindow: () => Promise<void>;
  isWindowMaximized: () => Promise<boolean>;
  
  // Application info
  getAppVersion: () => Promise<string>;
  getAppName: () => Promise<string>;
  getPlatform: () => Promise<string>;
  
  // Export operations
  exportSaveFile: (data: string, options?: any) => Promise<{
    success: boolean;
    filePath?: string;
    fileSize?: number;
    error?: string;
    canceled?: boolean;
  }>;
  exportWriteFile: (filePath: string, content: string) => Promise<{
    success: boolean;
    filePath?: string;
    fileSize?: number;
    error?: string;
  }>;
  exportWriteFileBuffer: (filePath: string, buffer: Buffer) => Promise<{
    success: boolean;
    filePath?: string;
    fileSize?: number;
    error?: string;
  }>;
  exportGetFileStats: (filePath: string) => Promise<{
    success: boolean;
    size?: number;
    created?: Date;
    modified?: Date;
    error?: string;
  }>;
  
  // Error reporting
  reportError: (error: any) => Promise<{ success: boolean }>;
  
  // Application events
  onMenuAction: (callback: (action: string) => void) => void;
  
  // LaTeX compilation events
  onLatexProgress: (callback: (progress: any) => void) => void;
  onLatexJobCompleted: (callback: (result: any) => void) => void;
  onLatexJobCancelled: (callback: (data: { jobId: string }) => void) => void;
  
  // Remove listeners
  removeAllListeners: (channel: string) => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};