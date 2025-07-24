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
    console.log(`[LaTeX Compiler Node] Creating compilation job ${jobId}`);
    console.log(`[LaTeX Compiler Node] Source length: ${source.length} characters`);
    console.log(`[LaTeX Compiler Node] Source preview:`, source.substring(0, 300) + (source.length > 300 ? '...' : ''));
    
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

    console.log(`[LaTeX Compiler Node] Job options:`, job.options);
    
    this.queue.push(job);
    console.log(`[LaTeX Compiler Node] Added job to queue. Queue length: ${this.queue.length}`);
    
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
    console.log('🔍 [LaTeX Compiler Node] ===== STARTING LATEX AVAILABILITY CHECK =====');
    console.log('🔍 [LaTeX Compiler Node] Process info:', {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      cwd: process.cwd(),
      env: {
        PATH: process.env.PATH?.substring(0, 500) + '...',
        HOME: process.env.HOME,
        USER: process.env.USER,
        SHELL: process.env.SHELL
      }
    });
    
    // Enhanced paths for different systems
    const compilerPaths: { [key: string]: string[] } = {
      'pdflatex': [
        '/Library/TeX/texbin/pdflatex',  // macOS TeX Live
        '/usr/local/texlive/2023/bin/universal-darwin/pdflatex',  // Alternative macOS
        '/usr/local/texlive/2024/bin/universal-darwin/pdflatex',  // Alternative macOS
        '/usr/bin/pdflatex',  // Linux
        '/usr/local/bin/pdflatex',  // Alternative Linux
        'pdflatex'  // System PATH fallback
      ],
      'xelatex': [
        '/Library/TeX/texbin/xelatex',
        '/usr/local/texlive/2023/bin/universal-darwin/xelatex',
        '/usr/local/texlive/2024/bin/universal-darwin/xelatex',
        '/usr/bin/xelatex',
        '/usr/local/bin/xelatex',
        'xelatex'
      ],
      'lualatex': [
        '/Library/TeX/texbin/lualatex',
        '/usr/local/texlive/2023/bin/universal-darwin/lualatex',
        '/usr/local/texlive/2024/bin/universal-darwin/lualatex',
        '/usr/bin/lualatex',
        '/usr/local/bin/lualatex',
        'lualatex'
      ]
    };
    
    console.log('🔍 [LaTeX Compiler Node] Checking compiler paths:', compilerPaths);
    
    const availableCompilers: string[] = [];
    let version: string | undefined;
    const detailedResults: any = {};

    for (const [compiler, paths] of Object.entries(compilerPaths)) {
      console.log(`🔍 [LaTeX Compiler Node] ===== CHECKING ${compiler.toUpperCase()} =====`);
      detailedResults[compiler] = { found: false, workingPath: null, attempts: [] };
      
      for (let i = 0; i < paths.length; i++) {
        const fullPath = paths[i];
        console.log(`🔍 [LaTeX Compiler Node] Attempt ${i + 1}/${paths.length} for ${compiler}: ${fullPath}`);
        
        const attemptResult: any = {
          path: fullPath,
          fileExists: false,
          executable: false,
          versionCheck: null,
          error: null
        };
        
        try {
          // Check if file exists (for absolute paths)
          if (fullPath.startsWith('/')) {
            try {
              const stats = await fs.promises.stat(fullPath);
              attemptResult.fileExists = true;
              attemptResult.executable = !!(stats.mode & parseInt('111', 8));
              console.log(`🔍 [LaTeX Compiler Node] File check for ${fullPath}:`, {
                exists: attemptResult.fileExists,
                executable: attemptResult.executable,
                mode: stats.mode.toString(8)
              });
            } catch (statError) {
              attemptResult.error = `File stat failed: ${statError}`;
              console.log(`🔍 [LaTeX Compiler Node] File does not exist: ${fullPath} (${statError})`);
              detailedResults[compiler].attempts.push(attemptResult);
              continue;
            }
          }
          
          // Try to run version command
          console.log(`🔍 [LaTeX Compiler Node] Running version check: ${fullPath} --version`);
          const startTime = Date.now();
          const result = await this.runCommand(fullPath, ['--version'], { timeout: 10000 });
          const duration = Date.now() - startTime;
          
          attemptResult.versionCheck = {
            success: result.success,
            duration,
            stdoutLength: result.stdout.length,
            stderrLength: result.stderr.length,
            stdout: result.stdout.substring(0, 300),
            stderr: result.stderr.substring(0, 300)
          };
          
          console.log(`🔍 [LaTeX Compiler Node] Version check result for ${fullPath}:`, {
            success: result.success,
            duration: `${duration}ms`,
            stdoutLength: result.stdout.length,
            stderrLength: result.stderr.length,
            stdoutPreview: result.stdout.substring(0, 200),
            stderrPreview: result.stderr.substring(0, 200)
          });
          
          if (result.success && result.stdout.length > 0) {
            availableCompilers.push(compiler);
            detailedResults[compiler].found = true;
            detailedResults[compiler].workingPath = fullPath;
            console.log(`✅ [LaTeX Compiler Node] ${compiler} is AVAILABLE via: ${fullPath}`);
            
            if (!version && result.stdout) {
              // Extract version from first available compiler
              const versionMatch = result.stdout.match(/\d+\.\d+(\.\d+)?/);
              if (versionMatch) {
                version = versionMatch[0];
                console.log(`🔍 [LaTeX Compiler Node] Extracted version: ${version}`);
              }
            }
            
            detailedResults[compiler].attempts.push(attemptResult);
            break; // Found working compiler, stop trying other paths
          } else {
            attemptResult.error = `Version check failed: success=${result.success}, stdout=${result.stdout.length} chars, stderr=${result.stderr.length} chars`;
            console.log(`❌ [LaTeX Compiler Node] Version check failed for ${fullPath}:`, attemptResult.error);
          }
        } catch (error) {
          attemptResult.error = `Exception: ${error}`;
          console.log(`❌ [LaTeX Compiler Node] Exception checking ${fullPath}:`, error);
        }
        
        detailedResults[compiler].attempts.push(attemptResult);
      }
      
      if (!detailedResults[compiler].found) {
        console.log(`❌ [LaTeX Compiler Node] ${compiler} is NOT AVAILABLE after ${paths.length} attempts`);
      }
    }

    // Additional system diagnostics
    console.log('🔍 [LaTeX Compiler Node] ===== SYSTEM DIAGNOSTICS =====');
    try {
      const whichPdflatex = await this.runCommand('which', ['pdflatex'], { timeout: 5000 });
      console.log('🔍 [LaTeX Compiler Node] which pdflatex:', {
        success: whichPdflatex.success,
        stdout: whichPdflatex.stdout.trim(),
        stderr: whichPdflatex.stderr.trim()
      });
    } catch (error) {
      console.log('🔍 [LaTeX Compiler Node] which pdflatex failed:', error);
    }
    
    try {
      const whereisPdflatex = await this.runCommand('whereis', ['pdflatex'], { timeout: 5000 });
      console.log('🔍 [LaTeX Compiler Node] whereis pdflatex:', {
        success: whereisPdflatex.success,
        stdout: whereisPdflatex.stdout.trim(),
        stderr: whereisPdflatex.stderr.trim()
      });
    } catch (error) {
      console.log('🔍 [LaTeX Compiler Node] whereis pdflatex failed:', error);
    }
    
    try {
      const lsTexbin = await this.runCommand('ls', ['-la', '/Library/TeX/texbin/'], { timeout: 5000 });
      console.log('🔍 [LaTeX Compiler Node] ls /Library/TeX/texbin/:', {
        success: lsTexbin.success,
        stdout: lsTexbin.stdout.substring(0, 500),
        stderr: lsTexbin.stderr.trim()
      });
    } catch (error) {
      console.log('🔍 [LaTeX Compiler Node] ls /Library/TeX/texbin/ failed:', error);
    }

    const result = {
      available: availableCompilers.length > 0,
      compilers: availableCompilers,
      version,
    };
    
    console.log('🔍 [LaTeX Compiler Node] ===== FINAL AVAILABILITY RESULT =====');
    console.log('🔍 [LaTeX Compiler Node] Summary:', result);
    console.log('🔍 [LaTeX Compiler Node] Detailed results:', JSON.stringify(detailedResults, null, 2));
    console.log('🔍 [LaTeX Compiler Node] ===== END LATEX AVAILABILITY CHECK =====');
    
    return result;
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
    console.log(`[LaTeX Compiler Node] Starting job processing for ${job.id}`);
    
    // Add job to active jobs immediately
    this.activeJobs.set(job.id, null as any); // Placeholder until actual process starts
    console.log(`[LaTeX Compiler Node] Added job ${job.id} to active jobs. Active count: ${this.activeJobs.size}`);
    
    try {
      this.emitProgress(job.id, 'preparing', 10, 'Preparing compilation environment');

      // Create job-specific temp directory
      const jobTempDir = path.join(this.tempDir, job.id);
      console.log(`[LaTeX Compiler Node] Creating temp directory: ${jobTempDir}`);
      await fs.promises.mkdir(jobTempDir, { recursive: true });

      // Write LaTeX source to file
      const texFilePath = path.join(jobTempDir, 'document.tex');
      console.log(`[LaTeX Compiler Node] Writing LaTeX source to: ${texFilePath}`);
      await fs.promises.writeFile(texFilePath, job.source, 'utf-8');
      console.log(`[LaTeX Compiler Node] Successfully wrote ${job.source.length} characters to file`);

      this.emitProgress(job.id, 'compiling', 30, `Compiling with ${job.options.compiler}`);

      // Compile LaTeX
      console.log(`[LaTeX Compiler Node] Starting LaTeX compilation with ${job.options.compiler}`);
      const result = await this.runLatexCompilation(job, texFilePath, jobTempDir);
      console.log(`[LaTeX Compiler Node] Compilation completed. Success: ${result.success}`);
      console.log(`[LaTeX Compiler Node] Stdout length: ${result.stdout.length}, Stderr length: ${result.stderr.length}`);

      this.emitProgress(job.id, 'processing', 80, 'Processing output');

      // Process results
      console.log(`[LaTeX Compiler Node] Processing compilation results...`);
      const compilationResult = await this.processCompilationResult(job, result, jobTempDir, startTime);
      console.log(`[LaTeX Compiler Node] Final result - Success: ${compilationResult.success}, Errors: ${compilationResult.errors.length}, Warnings: ${compilationResult.warnings.length}`);

      this.emitProgress(job.id, 'completed', 100, 'Compilation completed');
      this.emit('job-completed', compilationResult);

    } catch (error) {
      console.error(`[LaTeX Compiler Node] Job ${job.id} failed with error:`, error);
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
      console.log(`[LaTeX Compiler Node] Cleaning up job ${job.id}`);
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
    console.log(`[LaTeX Compiler Node] Running LaTeX compilation with ${compiler}`);
    
    // Get the full path to the compiler
    const compilerPath = this.getCompilerPath(compiler);
    console.log(`[LaTeX Compiler Node] Compiler path: ${compilerPath}`);
    
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
    console.log(`[LaTeX Compiler Node] Compilation arguments:`, args);

    // Run compilation (potentially multiple times for references)
    let lastResult: { success: boolean; stdout: string; stderr: string } = {
      success: false,
      stdout: '',
      stderr: 'No compilation runs executed'
    };
    const maxRuns = 3;

    for (let run = 1; run <= maxRuns; run++) {
      console.log(`[LaTeX Compiler Node] Starting compilation pass ${run}/${maxRuns}`);
      this.emitProgress(job.id, 'compiling', 30 + (run - 1) * 20, `Compilation pass ${run}/${maxRuns}`);
      
      try {
        lastResult = await this.runCommand(compilerPath, args, {
          cwd: workingDir,
          timeout: job.options.timeout || 30000,
        });
        
        console.log(`[LaTeX Compiler Node] Pass ${run} completed:`, {
          success: lastResult.success,
          stdoutLength: lastResult.stdout.length,
          stderrLength: lastResult.stderr.length,
          stdoutPreview: lastResult.stdout.substring(0, 500),
          stderrPreview: lastResult.stderr.substring(0, 500)
        });

        // Check if we need another run (for references, citations, etc.)
        if (run < maxRuns && this.needsAnotherRun(lastResult.stdout)) {
          console.log(`[LaTeX Compiler Node] Another run needed for references/citations`);
          continue;
        }
        console.log(`[LaTeX Compiler Node] Compilation completed after ${run} pass(es)`);
        break;
      } catch (error) {
        console.error(`[LaTeX Compiler Node] Compilation pass ${run} failed:`, error);
        lastResult = {
          success: false,
          stdout: '',
          stderr: `Compilation pass ${run} failed: ${error instanceof Error ? error.message : String(error)}`
        };
        break;
      }
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