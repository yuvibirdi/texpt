import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
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
 * Node.js-specific LaTeX Compilation Service
 * Handles LaTeX compilation with queue management, error parsing, and background processing
 */
export class LaTeXCompilerNode extends EventEmitter {
  private queue: CompilationJob[] = [];
  private activeJobs: Map<string, ChildProcess> = new Map();
  private tempDir: string;
  private maxConcurrentJobs: number = 2;
  private isProcessing: boolean = false;
  private jobCounter: number = 0;

  constructor() {
    super();
    this.tempDir = path.join(os.tmpdir(), 'latex-presentation-editor');
    this.ensureTempDirectory();
    this.startQueueProcessor();
  }

  /**
   * Add a compilation job to the queue
   */
  public async compile(source: string, options: CompilationOptions = {}): Promise<string> {
    const jobId = this.generateJobId();
    const job: CompilationJob = {
      id: jobId,
      source,
      options: {
        compiler: 'pdflatex',
        timeout: 30000, // 30 seconds
        includeAux: false,
        shell: false,
        synctex: true,
        ...options,
      },
      priority: 1,
      timestamp: Date.now(),
    };

    this.queue.push(job);
    this.sortQueue();
    this.processQueue();

    return jobId;
  }

  /**
   * Cancel a compilation job
   */
  public cancelJob(jobId: string): boolean {
    // Remove from queue if not started
    const queueIndex = this.queue.findIndex(job => job.id === jobId);
    if (queueIndex !== -1) {
      this.queue.splice(queueIndex, 1);
      this.emit('job-cancelled', { jobId });
      return true;
    }

    // Kill active process if running
    const activeProcess = this.activeJobs.get(jobId);
    if (activeProcess) {
      if (activeProcess.kill) {
        activeProcess.kill('SIGTERM');
      }
      this.activeJobs.delete(jobId);
      this.emit('job-cancelled', { jobId });
      return true;
    }

    return false;
  }

  /**
   * Get queue status
   */
  public getQueueStatus(): { queued: number; active: number; total: number } {
    return {
      queued: this.queue.length,
      active: this.activeJobs.size,
      total: this.queue.length + this.activeJobs.size,
    };
  }

  /**
   * Clear all jobs from queue
   */
  public clearQueue(): void {
    // Cancel all active jobs
    this.activeJobs.forEach((process, jobId) => {
      if (process && process.kill) {
        process.kill('SIGTERM');
      }
      this.emit('job-cancelled', { jobId });
    });
    this.activeJobs.clear();

    // Clear queue
    const cancelledJobs = this.queue.map(job => job.id);
    this.queue = [];
    
    cancelledJobs.forEach(jobId => {
      this.emit('job-cancelled', { jobId });
    });
  }

  /**
   * Check if LaTeX is available on the system
   */
  public async checkLatexAvailability(): Promise<{ available: boolean; compilers: string[]; version?: string }> {
    // Hardcoded paths for development on macOS with TeX Live
    const compilerPaths = {
      'pdflatex': '/Library/TeX/texbin/pdflatex',
      'xelatex': '/Library/TeX/texbin/xelatex',
      'lualatex': '/Library/TeX/texbin/lualatex'
    };
    
    const availableCompilers: string[] = [];
    let version: string | undefined;

    for (const [compiler, fullPath] of Object.entries(compilerPaths)) {
      try {
        // First try the hardcoded path
        const result = await this.runCommand(fullPath, ['--version'], { timeout: 5000 });
        if (result.success) {
          availableCompilers.push(compiler);
          if (!version && result.stdout) {
            // Extract version from first available compiler
            const versionMatch = result.stdout.match(/\d+\.\d+/);
            if (versionMatch) {
              version = versionMatch[0];
            }
          }
        }
      } catch (error) {
        // Try fallback to system PATH
        try {
          const result = await this.runCommand(compiler, ['--version'], { timeout: 5000 });
          if (result.success) {
            availableCompilers.push(compiler);
            if (!version && result.stdout) {
              const versionMatch = result.stdout.match(/\d+\.\d+/);
              if (versionMatch) {
                version = versionMatch[0];
              }
            }
          }
        } catch (fallbackError) {
          // Compiler not available
        }
      }
    }

    return {
      available: availableCompilers.length > 0,
      compilers: availableCompilers,
      version,
    };
  }

  /**
   * Process the compilation queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0 || this.activeJobs.size >= this.maxConcurrentJobs) {
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0 && this.activeJobs.size < this.maxConcurrentJobs) {
      const job = this.queue.shift()!;
      this.processJob(job);
    }

    this.isProcessing = false;
  }

  /**
   * Process a single compilation job
   */
  private async processJob(job: CompilationJob): Promise<void> {
    const startTime = Date.now();
    
    // Add job to active jobs immediately
    this.activeJobs.set(job.id, null as any); // Placeholder until actual process starts
    
    try {
      this.emitProgress(job.id, 'preparing', 10, 'Preparing compilation environment');

      // Create job-specific temp directory
      const jobTempDir = path.join(this.tempDir, job.id);
      await fs.promises.mkdir(jobTempDir, { recursive: true });

      // Write LaTeX source to file
      const texFilePath = path.join(jobTempDir, 'document.tex');
      await fs.promises.writeFile(texFilePath, job.source, 'utf-8');

      this.emitProgress(job.id, 'compiling', 30, `Compiling with ${job.options.compiler}`);

      // Compile LaTeX
      const result = await this.runLatexCompilation(job, texFilePath, jobTempDir);

      this.emitProgress(job.id, 'processing', 80, 'Processing output');

      // Process results
      const compilationResult = await this.processCompilationResult(job, result, jobTempDir, startTime);

      this.emitProgress(job.id, 'completed', 100, 'Compilation completed');
      this.emit('job-completed', compilationResult);

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorResult: CompilationResult = {
        success: false,
        log: error instanceof Error ? error.message : String(error),
        errors: [{
          message: error instanceof Error ? error.message : String(error),
          type: 'fatal',
        }],
        warnings: [],
        duration,
        jobId: job.id,
      };

      this.emitProgress(job.id, 'failed', 100, 'Compilation failed');
      this.emit('job-completed', errorResult);
    } finally {
      // Clean up
      this.activeJobs.delete(job.id);
      this.cleanupJobFiles(job.id);
      
      // Process next job in queue
      setTimeout(() => this.processQueue(), 100);
    }
  }

  /**
   * Run LaTeX compilation
   */
  private async runLatexCompilation(
    job: CompilationJob,
    texFilePath: string,
    workingDir: string
  ): Promise<{ success: boolean; stdout: string; stderr: string }> {
    const compiler = job.options.compiler || 'pdflatex';
    
    // Get the full path to the compiler
    const compilerPath = this.getCompilerPath(compiler);
    
    const args = [
      '-interaction=nonstopmode',
      '-file-line-error',
      '-output-directory=' + workingDir,
    ];

    if (job.options.synctex) {
      args.push('-synctex=1');
    }

    if (job.options.shell) {
      args.push('-shell-escape');
    }

    args.push(texFilePath);

    // Run compilation (potentially multiple times for references)
    let lastResult: { success: boolean; stdout: string; stderr: string } = {
      success: false,
      stdout: '',
      stderr: 'No compilation runs executed'
    };
    const maxRuns = 3;

    for (let run = 1; run <= maxRuns; run++) {
      this.emitProgress(job.id, 'compiling', 30 + (run - 1) * 20, `Compilation pass ${run}/${maxRuns}`);
      
      lastResult = await this.runCommand(compilerPath, args, {
        cwd: workingDir,
        timeout: job.options.timeout || 30000,
      });

      // Check if we need another run (for references, citations, etc.)
      if (run < maxRuns && this.needsAnotherRun(lastResult.stdout)) {
        continue;
      }
      break;
    }

    return lastResult;
  }

  /**
   * Get the full path to a LaTeX compiler
   */
  private getCompilerPath(compiler: string): string {
    const compilerPaths: { [key: string]: string } = {
      'pdflatex': '/Library/TeX/texbin/pdflatex',
      'xelatex': '/Library/TeX/texbin/xelatex',
      'lualatex': '/Library/TeX/texbin/lualatex'
    };
    
    // Return hardcoded path if available, otherwise fallback to system PATH
    return compilerPaths[compiler] || compiler;
  }

  /**
   * Run a command with timeout and process management
   */
  private async runCommand(
    command: string,
    args: string[],
    options: { cwd?: string; timeout?: number } = {}
  ): Promise<{ success: boolean; stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      const process = spawn(command, args, {
        cwd: options.cwd,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';
      let timeoutId: NodeJS.Timeout | null = null;

      if (options.timeout) {
        timeoutId = setTimeout(() => {
          process.kill('SIGTERM');
          reject(new Error(`Command timed out after ${options.timeout}ms`));
        }, options.timeout);
      }

      process.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        resolve({
          success: code === 0,
          stdout,
          stderr,
        });
      });

      process.on('error', (error) => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        reject(error);
      });
    });
  }

  /**
   * Process compilation results and extract PDF
   */
  private async processCompilationResult(
    job: CompilationJob,
    result: { success: boolean; stdout: string; stderr: string },
    workingDir: string,
    startTime: number
  ): Promise<CompilationResult> {
    const duration = Date.now() - startTime;
    const pdfPath = path.join(workingDir, 'document.pdf');
    
    let pdfBuffer: Buffer | undefined;
    let pdfExists = false;

    try {
      if (await this.fileExists(pdfPath)) {
        pdfBuffer = await fs.promises.readFile(pdfPath);
        pdfExists = true;
      }
    } catch (error) {
      // PDF reading failed
    }

    // Parse log for errors and warnings
    const logContent = result.stdout + '\n' + result.stderr;
    const { errors, warnings } = this.parseLatexLog(logContent);

    return {
      success: result.success && pdfExists,
      pdfPath: pdfExists ? pdfPath : undefined,
      pdfBuffer,
      log: logContent,
      errors,
      warnings,
      duration,
      jobId: job.id,
    };
  }

  /**
   * Parse LaTeX log for errors and warnings
   */
  private parseLatexLog(log: string): { errors: CompilationError[]; warnings: CompilationWarning[] } {
    const errors: CompilationError[] = [];
    const warnings: CompilationWarning[] = [];
    const lines = log.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Parse errors (format: ./file.tex:line: Error message)
      const errorMatch = line.match(/^(.+?):(\d+):\s*(.*)Error:\s*(.+)$/) ||
                        line.match(/^(.+?):(\d+):\s*Undefined control sequence/);
      if (errorMatch) {
        const [, file, lineNum, , message] = errorMatch;
        errors.push({
          file: path.basename(file),
          line: parseInt(lineNum, 10),
          message: (message || errorMatch[0]).trim(),
          type: 'error',
          context: this.getContextLines(lines, i),
        });
        continue;
      }

      // Parse fatal errors
      const fatalMatch = line.match(/^!\s*(.+)$/);
      if (fatalMatch) {
        errors.push({
          message: fatalMatch[1].trim(),
          type: 'fatal',
          context: this.getContextLines(lines, i),
        });
        continue;
      }

      // Parse warnings
      const warningMatch = line.match(/^(.+?):(\d+):\s*(.+?)Warning:\s*(.+)$/) ||
                          line.match(/^Warning:\s*(.+)$/);
      if (warningMatch) {
        if (warningMatch.length === 5) {
          // File-specific warning
          const [, file, lineNum, , message] = warningMatch;
          warnings.push({
            file: path.basename(file),
            line: parseInt(lineNum, 10),
            message: message.trim(),
            type: 'warning',
          });
        } else {
          // General warning
          warnings.push({
            message: warningMatch[1].trim(),
            type: 'warning',
          });
        }
        continue;
      }

      // Parse package warnings and info
      const packageMatch = line.match(/^Package\s+(\w+)\s+Warning:\s*(.+)$/) ||
                          line.match(/^Package\s+(\w+)\s+Info:\s*(.+)$/);
      if (packageMatch) {
        warnings.push({
          message: `${packageMatch[1]}: ${packageMatch[2].trim()}`,
          type: line.includes('Warning') ? 'warning' : 'info',
        });
      }
    }

    return { errors, warnings };
  }

  /**
   * Get context lines around an error
   */
  private getContextLines(lines: string[], errorIndex: number, contextSize: number = 2): string {
    const start = Math.max(0, errorIndex - contextSize);
    const end = Math.min(lines.length, errorIndex + contextSize + 1);
    return lines.slice(start, end).join('\n');
  }

  /**
   * Check if another compilation run is needed
   */
  private needsAnotherRun(stdout: string): boolean {
    return stdout.includes('Rerun to get cross-references right') ||
           stdout.includes('There were undefined references') ||
           stdout.includes('Label(s) may have changed');
  }

  /**
   * Emit progress update
   */
  private emitProgress(jobId: string, stage: CompilationProgress['stage'], progress: number, message: string): void {
    this.emit('progress', {
      jobId,
      stage,
      progress,
      message,
    } as CompilationProgress);
  }

  /**
   * Generate unique job ID
   */
  private generateJobId(): string {
    return `job_${Date.now()}_${++this.jobCounter}`;
  }

  /**
   * Sort queue by priority and timestamp
   */
  private sortQueue(): void {
    this.queue.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority; // Higher priority first
      }
      return a.timestamp - b.timestamp; // Earlier timestamp first
    });
  }

  /**
   * Start the queue processor
   */
  private startQueueProcessor(): void {
    setInterval(() => {
      if (!this.isProcessing && this.queue.length > 0 && this.activeJobs.size < this.maxConcurrentJobs) {
        this.processQueue();
      }
    }, 100); // Reduced interval for faster processing in tests
  }

  /**
   * Ensure temp directory exists
   */
  private ensureTempDirectory(): void {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * Clean up job files
   */
  private async cleanupJobFiles(jobId: string): Promise<void> {
    const jobTempDir = path.join(this.tempDir, jobId);
    try {
      await fs.promises.rm(jobTempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  }

  /**
   * Check if file exists
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.promises.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Cleanup all temp files on shutdown
   */
  public async cleanup(): Promise<void> {
    this.clearQueue();
    try {
      await fs.promises.rm(this.tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  }
}