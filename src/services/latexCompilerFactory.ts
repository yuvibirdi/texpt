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
  console.log('🏭 [LaTeX Compiler Factory] ===== STARTING COMPILER SELECTION =====');
  
  // Enhanced environment detection
  const isNode = typeof process !== 'undefined' && process.versions && process.versions.node;
  const isBrowser = typeof globalThis !== 'undefined' && typeof (globalThis as any).window !== 'undefined';
  const windowObj = isBrowser ? (globalThis as any).window : null;
  const isElectron = windowObj && windowObj.electronAPI;
  const hasRequire = typeof require !== 'undefined';
  const hasGlobal = typeof global !== 'undefined';
  const hasModule = typeof module !== 'undefined';
  
  console.log('🏭 [LaTeX Compiler Factory] Environment detection:', {
    isNode,
    isBrowser,
    isElectron,
    hasRequire,
    hasGlobal,
    hasModule,
    processVersions: typeof process !== 'undefined' ? process.versions : 'undefined',
    electronAPI: isElectron ? 'available' : 'not available',
    userAgent: isBrowser && windowObj.navigator ? windowObj.navigator.userAgent : 'undefined',
    location: isBrowser && windowObj.location ? windowObj.location.href : 'undefined'
  });
  
  // Check for Electron API details
  if (windowObj) {
    console.log('🏭 [LaTeX Compiler Factory] Window object analysis:', {
      hasElectronAPI: !!windowObj.electronAPI,
      electronAPIKeys: windowObj.electronAPI ? Object.keys(windowObj.electronAPI) : 'none',
      hasCompileLatex: windowObj.electronAPI ? typeof windowObj.electronAPI.compileLatex : 'undefined',
      hasCheckLatexAvailability: windowObj.electronAPI ? typeof windowObj.electronAPI.checkLatexAvailability : 'undefined'
    });
  }
  
  // Try Node.js compiler first (for main process or Node.js environment)
  if (isNode && !isBrowser) {
    console.log('🏭 [LaTeX Compiler Factory] Detected Node.js environment, attempting to load Node.js LaTeX compiler...');
    try {
      // Use eval to prevent webpack from bundling the Node.js-specific module
      const nodeModule = eval('require')('./latexCompilerNode');
      const { LaTeXCompilerNode } = nodeModule;
      console.log('✅ [LaTeX Compiler Factory] Successfully loaded Node.js LaTeX compiler');
      return new LaTeXCompilerNode();
    } catch (error) {
      console.error('❌ [LaTeX Compiler Factory] Failed to load Node.js LaTeX compiler:', error);
      console.log('🏭 [LaTeX Compiler Factory] Falling back to next option...');
    }
  }

  // Check if we're in an Electron renderer process
  const globalWindow = typeof globalThis !== 'undefined' && (globalThis as any).window;
  
  if (globalWindow && (globalWindow as any).electronAPI) {
    const electronAPI = (globalWindow as any).electronAPI;
    console.log('🏭 [LaTeX Compiler Factory] Detected Electron environment, checking API...');
    console.log('🏭 [LaTeX Compiler Factory] Electron API methods:', Object.keys(electronAPI));
    
    if (typeof electronAPI.compileLatex === 'function') {
      console.log('🏭 [LaTeX Compiler Factory] Electron API has compileLatex method, loading Electron compiler...');
      try {
        // Use dynamic import to avoid bundling issues
        const { LaTeXCompilerElectron } = require('./latexCompilerElectron');
        console.log('✅ [LaTeX Compiler Factory] Successfully loaded Electron LaTeX compiler');
        return new LaTeXCompilerElectron();
      } catch (error) {
        console.error('❌ [LaTeX Compiler Factory] Failed to load Electron LaTeX compiler:', error);
        console.warn('🏭 [LaTeX Compiler Factory] Falling back to browser version');
      }
    } else {
      console.log('❌ [LaTeX Compiler Factory] Electron API missing compileLatex method');
    }
  } else {
    console.log('🏭 [LaTeX Compiler Factory] No Electron API detected');
  }

  // Default to browser version
  console.log('🏭 [LaTeX Compiler Factory] Using browser LaTeX compiler (mock implementation)');
  console.log('🏭 [LaTeX Compiler Factory] ===== COMPILER SELECTION COMPLETE =====');
  return new LaTeXCompilerBrowser();
}

// Export singleton instance
export const latexCompiler = createLatexCompiler();