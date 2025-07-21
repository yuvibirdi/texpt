import { EventEmitter } from 'events';
import {
  CompilationOptions,
  CompilationResult,
  CompilationProgress,
  ILatexCompiler,
} from './latexCompiler';

/**
 * Electron-specific LaTeX Compiler that uses IPC to communicate with the main process
 */
export class LaTeXCompilerElectron extends EventEmitter implements ILatexCompiler {
  private jobCounter: number = 0;

  constructor() {
    super();
    this.setupEventListeners();
  }

  /**
   * Setup event listeners for IPC communication
   */
  private setupEventListeners(): void {
    if (typeof window !== 'undefined' && window.electronAPI) {
      // Listen for progress updates
      window.electronAPI.onLatexProgress((progress: CompilationProgress) => {
        this.emit('progress', progress);
      });

      // Listen for job completion
      window.electronAPI.onLatexJobCompleted((result: CompilationResult) => {
        this.emit('job-completed', result);
      });

      // Listen for job cancellation
      window.electronAPI.onLatexJobCancelled((data: { jobId: string }) => {
        this.emit('job-cancelled', data);
      });
    }
  }

  /**
   * Compile LaTeX source using Electron main process
   */
  public async compile(source: string, options: CompilationOptions = {}): Promise<string> {
    if (!window.electronAPI) {
      throw new Error('Electron API not available');
    }

    try {
      const result = await window.electronAPI.compileLatex(source, options);
      if (result.success && result.jobId) {
        return result.jobId;
      } else {
        throw new Error(result.error || 'Compilation failed');
      }
    } catch (error) {
      throw new Error(`LaTeX compilation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Cancel a compilation job
   */
  public cancelJob(jobId: string): boolean {
    if (!window.electronAPI) {
      return false;
    }

    try {
      window.electronAPI.cancelLatexJob(jobId);
      return true;
    } catch (error) {
      console.error('Failed to cancel LaTeX job:', error);
      return false;
    }
  }

  /**
   * Get queue status
   */
  public getQueueStatus(): { queued: number; active: number; total: number } {
    if (!window.electronAPI) {
      return { queued: 0, active: 0, total: 0 };
    }

    try {
      // This should be async, but we'll handle it synchronously for now
      // In a real implementation, you might want to cache this or make it async
      return { queued: 0, active: 0, total: 0 };
    } catch (error) {
      return { queued: 0, active: 0, total: 0 };
    }
  }

  /**
   * Clear all jobs from queue
   */
  public clearQueue(): void {
    if (window.electronAPI) {
      try {
        window.electronAPI.clearLatexQueue();
      } catch (error) {
        console.error('Failed to clear LaTeX queue:', error);
      }
    }
  }

  /**
   * Check if LaTeX is available on the system
   */
  public async checkLatexAvailability(): Promise<{ available: boolean; compilers: string[]; version?: string }> {
    if (!window.electronAPI) {
      return {
        available: false,
        compilers: [],
        version: undefined,
      };
    }

    try {
      const result = await window.electronAPI.checkLatexAvailability();
      if (result.success) {
        return {
          available: result.available || false,
          compilers: result.compilers || [],
          version: result.version,
        };
      } else {
        console.error('LaTeX availability check failed:', result.error);
        return {
          available: false,
          compilers: [],
          version: undefined,
        };
      }
    } catch (error) {
      console.error('Failed to check LaTeX availability:', error);
      return {
        available: false,
        compilers: [],
        version: undefined,
      };
    }
  }

  /**
   * Cleanup (no-op for Electron renderer)
   */
  public async cleanup(): Promise<void> {
    // Remove event listeners
    if (window.electronAPI) {
      try {
        window.electronAPI.removeAllListeners('latex:progress');
        window.electronAPI.removeAllListeners('latex:job-completed');
        window.electronAPI.removeAllListeners('latex:job-cancelled');
      } catch (error) {
        console.error('Failed to cleanup LaTeX compiler listeners:', error);
      }
    }
  }
}

