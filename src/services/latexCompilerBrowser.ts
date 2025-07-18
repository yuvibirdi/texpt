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
 * Browser-compatible LaTeX Compilation Service
 * Provides mock functionality for browser environment
 */
export class LaTeXCompilerBrowser extends EventEmitter {
  private queue: CompilationJob[] = [];
  private activeJobs: Map<string, any> = new Map();
  private maxConcurrentJobs: number = 2;
  private isProcessing: boolean = false;
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
      // Mock compilation result - always fails in browser
      const result: CompilationResult = {
        success: false,
        log: 'LaTeX compilation is not available in browser environment. Please use the desktop application.',
        errors: [{
          message: 'LaTeX compilation requires a desktop environment with LaTeX installed',
          type: 'fatal',
        }],
        warnings: [],
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

// Export browser-compatible instance
export const latexCompilerBrowser = new LaTeXCompilerBrowser();