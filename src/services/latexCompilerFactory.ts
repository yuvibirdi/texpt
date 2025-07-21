import { EventEmitter } from 'events';
import {
  CompilationJob,
  CompilationOptions,
  CompilationResult,
  CompilationError,
  CompilationWarning,
  CompilationProgress,
} from './latexCompiler';

/**
 * Browser-compatible LaTeX Compiler interface
 */
export interface ILatexCompiler extends EventEmitter {
  compile(source: string, options?: CompilationOptions): Promise<string>;
  cancelJob(jobId: string): boolean;
  getQueueStatus(): { queued: number; active: number; total: number };
  clearQueue(): void;
  checkLatexAvailability(): Promise<{ available: boolean; compilers: string[]; version?: string }>;
  cleanup(): Promise<void>;
}

/**
 * Browser-compatible LaTeX Compilation Service
 * Provides mock functionality for browser environment
 */
class LaTeXCompilerBrowser extends EventEmitter implements ILatexCompiler {
  private jobCounter: number = 0;

  constructor() {
    super();
  }

  /**
   * Add a compilation job to the queue (mock implementation)
   */
  public async compile(source: string, options: CompilationOptions = {}): Promise<string> {
    const jobId = this.generateJobId();
    
    // Simulate compilation process
    setTimeout(() => {
      this.emit('progress', {
        jobId,
        stage: 'preparing',
        progress: 10,
        message: 'Preparing compilation...',
      } as CompilationProgress);
    }, 100);

    setTimeout(() => {
      this.emit('progress', {
        jobId,
        stage: 'compiling',
        progress: 50,
        message: 'Compiling LaTeX...',
      } as CompilationProgress);
    }, 200);

    setTimeout(() => {
      this.emit('progress', {
        jobId,
        stage: 'completed',
        progress: 100,
        message: 'Compilation completed (browser mode)',
      } as CompilationProgress);

      // Mock compilation result - provide helpful message for browser
      const result: CompilationResult = {
        success: false,
        log: `LaTeX compilation is not available in browser environment.

To enable LaTeX compilation:
1. Download and install the desktop application
2. Or install LaTeX locally (TeX Live, MiKTeX, or MacTeX)
3. The desktop app will automatically detect your LaTeX installation

Current source preview:
${source.substring(0, 200)}${source.length > 200 ? '...' : ''}`,
        errors: [{
          message: 'LaTeX compilation requires a desktop environment with LaTeX installed. This is a browser preview mode.',
          type: 'error',
        }],
        warnings: [{
          message: 'Switch to desktop application for full LaTeX compilation support',
          type: 'info',
        }],
        duration: 300,
        jobId,
      };

      this.emit('job-completed', result);
    }, 300);

    return jobId;
  }

  /**
   * Cancel a compilation job
   */
  public cancelJob(jobId: string): boolean {
    this.emit('job-cancelled', { jobId });
    return true;
  }

  /**
   * Get queue status
   */
  public getQueueStatus(): { queued: number; active: number; total: number } {
    return {
      queued: 0,
      active: 0,
      total: 0,
    };
  }

  /**
   * Clear all jobs from queue
   */
  public clearQueue(): void {
    // Nothing to clear in browser environment
  }

  /**
   * Check if LaTeX is available on the system
   */
  public async checkLatexAvailability(): Promise<{ available: boolean; compilers: string[]; version?: string }> {
    return {
      available: false,
      compilers: [],
      version: undefined,
    };
  }

  /**
   * Generate unique job ID
   */
  private generateJobId(): string {
    return `browser_job_${Date.now()}_${++this.jobCounter}`;
  }

  /**
   * Cleanup (no-op in browser)
   */
  public async cleanup(): Promise<void> {
    // Nothing to cleanup in browser environment
  }
}

/**
 * Factory function to create the appropriate LaTeX compiler instance
 */
function createLatexCompiler(): ILatexCompiler {
  // Check if we're in a Node.js environment (Electron main process)
  const isNode = typeof process !== 'undefined' && process.versions && process.versions.node;
  
  if (isNode) {
    // Try to load the Node.js version
    try {
      // Use eval to prevent webpack from bundling the Node.js-specific module
      const nodeModule = eval('require')('./latexCompilerNode');
      const { LaTeXCompilerNode } = nodeModule;
      return new LaTeXCompilerNode();
    } catch (error) {
      // Fallback to browser version if Node.js version fails to load
      return new LaTeXCompilerBrowser();
    }
  }

  // Check if we're in an Electron renderer process
  const globalWindow = typeof globalThis !== 'undefined' && (globalThis as any).window;
  if (globalWindow && globalWindow.electronAPI && typeof globalWindow.electronAPI.compileLatex === 'function') {
    try {
      // Use dynamic import to avoid bundling issues
      const { LaTeXCompilerElectron } = require('./latexCompilerElectron');
      return new LaTeXCompilerElectron();
    } catch (error) {
      console.warn('Failed to load Electron LaTeX compiler, falling back to browser version:', error);
    }
  }

  // Default to browser version
  return new LaTeXCompilerBrowser();
}

// Export singleton instance
export const latexCompiler = createLatexCompiler();