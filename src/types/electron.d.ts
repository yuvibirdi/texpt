// Global type definitions for Electron API exposed via preload script

export interface ElectronAPI {
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
    status?: {
      queued: number;
      active: number;
      total: number;
    };
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
  
  // Error reporting
  reportError: (error: any) => Promise<{ success: boolean }>;
  
  // Application events
  onMenuAction: (callback: (action: string) => void) => void;
  
  // LaTeX compilation events
  onLatexProgress: (callback: (progress: {
    jobId: string;
    stage: 'queued' | 'preparing' | 'compiling' | 'processing' | 'completed' | 'failed';
    progress: number;
    message: string;
  }) => void) => void;
  
  onLatexJobCompleted: (callback: (result: {
    success: boolean;
    pdfPath?: string;
    pdfBuffer?: Buffer;
    log: string;
    errors: Array<{
      line?: number;
      column?: number;
      message: string;
      type: 'error' | 'fatal';
      file?: string;
      context?: string;
    }>;
    warnings: Array<{
      line?: number;
      message: string;
      file?: string;
      type: 'warning' | 'info';
    }>;
    duration: number;
    jobId: string;
  }) => void) => void;
  
  onLatexJobCancelled: (callback: (data: { jobId: string }) => void) => void;
  
  // Remove listeners
  removeAllListeners: (channel: string) => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}