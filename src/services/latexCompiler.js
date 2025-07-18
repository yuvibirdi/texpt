"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.latexCompiler = exports.LaTeXCompiler = void 0;
const child_process_1 = require("child_process");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const events_1 = require("events");
/**
 * LaTeX Compilation Service
 * Handles LaTeX compilation with queue management, error parsing, and background processing
 */
class LaTeXCompiler extends events_1.EventEmitter {
    constructor() {
        super();
        this.queue = [];
        this.activeJobs = new Map();
        this.maxConcurrentJobs = 2;
        this.isProcessing = false;
        this.jobCounter = 0;
        this.tempDir = path.join(os.tmpdir(), 'latex-presentation-editor');
        this.ensureTempDirectory();
        this.startQueueProcessor();
    }
    /**
     * Add a compilation job to the queue
     */
    async compile(source, options = {}) {
        const jobId = this.generateJobId();
        const job = {
            id: jobId,
            source,
            options: {
                compiler: 'pdflatex',
                timeout: 30000,
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
    cancelJob(jobId) {
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
    getQueueStatus() {
        return {
            queued: this.queue.length,
            active: this.activeJobs.size,
            total: this.queue.length + this.activeJobs.size,
        };
    }
    /**
     * Clear all jobs from queue
     */
    clearQueue() {
        // Cancel all active jobs
        for (const [jobId, process] of this.activeJobs) {
            if (process && process.kill) {
                process.kill('SIGTERM');
            }
            this.emit('job-cancelled', { jobId });
        }
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
    async checkLatexAvailability() {
        const compilers = ['pdflatex', 'xelatex', 'lualatex'];
        const availableCompilers = [];
        let version;
        for (const compiler of compilers) {
            try {
                const result = await this.runCommand(compiler, ['--version'], { timeout: 5000 });
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
            }
            catch (error) {
                // Compiler not available
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
    async processQueue() {
        if (this.isProcessing || this.queue.length === 0 || this.activeJobs.size >= this.maxConcurrentJobs) {
            return;
        }
        this.isProcessing = true;
        while (this.queue.length > 0 && this.activeJobs.size < this.maxConcurrentJobs) {
            const job = this.queue.shift();
            this.processJob(job);
        }
        this.isProcessing = false;
    }
    /**
     * Process a single compilation job
     */
    async processJob(job) {
        const startTime = Date.now();
        // Add job to active jobs immediately
        this.activeJobs.set(job.id, null); // Placeholder until actual process starts
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
        }
        catch (error) {
            const duration = Date.now() - startTime;
            const errorResult = {
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
        }
        finally {
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
    async runLatexCompilation(job, texFilePath, workingDir) {
        const compiler = job.options.compiler || 'pdflatex';
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
        let lastResult;
        const maxRuns = 3;
        for (let run = 1; run <= maxRuns; run++) {
            this.emitProgress(job.id, 'compiling', 30 + (run - 1) * 20, `Compilation pass ${run}/${maxRuns}`);
            lastResult = await this.runCommand(compiler, args, {
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
     * Run a command with timeout and process management
     */
    async runCommand(command, args, options = {}) {
        return new Promise((resolve, reject) => {
            const process = (0, child_process_1.spawn)(command, args, {
                cwd: options.cwd,
                stdio: ['pipe', 'pipe', 'pipe'],
            });
            let stdout = '';
            let stderr = '';
            let timeoutId = null;
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
    async processCompilationResult(job, result, workingDir, startTime) {
        const duration = Date.now() - startTime;
        const pdfPath = path.join(workingDir, 'document.pdf');
        let pdfBuffer;
        let pdfExists = false;
        try {
            if (await this.fileExists(pdfPath)) {
                pdfBuffer = await fs.promises.readFile(pdfPath);
                pdfExists = true;
            }
        }
        catch (error) {
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
    parseLatexLog(log) {
        const errors = [];
        const warnings = [];
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
                }
                else {
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
    getContextLines(lines, errorIndex, contextSize = 2) {
        const start = Math.max(0, errorIndex - contextSize);
        const end = Math.min(lines.length, errorIndex + contextSize + 1);
        return lines.slice(start, end).join('\n');
    }
    /**
     * Check if another compilation run is needed
     */
    needsAnotherRun(stdout) {
        return stdout.includes('Rerun to get cross-references right') ||
            stdout.includes('There were undefined references') ||
            stdout.includes('Label(s) may have changed');
    }
    /**
     * Emit progress update
     */
    emitProgress(jobId, stage, progress, message) {
        this.emit('progress', {
            jobId,
            stage,
            progress,
            message,
        });
    }
    /**
     * Generate unique job ID
     */
    generateJobId() {
        return `job_${Date.now()}_${++this.jobCounter}`;
    }
    /**
     * Sort queue by priority and timestamp
     */
    sortQueue() {
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
    startQueueProcessor() {
        setInterval(() => {
            if (!this.isProcessing && this.queue.length > 0 && this.activeJobs.size < this.maxConcurrentJobs) {
                this.processQueue();
            }
        }, 100); // Reduced interval for faster processing in tests
    }
    /**
     * Ensure temp directory exists
     */
    ensureTempDirectory() {
        if (!fs.existsSync(this.tempDir)) {
            fs.mkdirSync(this.tempDir, { recursive: true });
        }
    }
    /**
     * Clean up job files
     */
    async cleanupJobFiles(jobId) {
        const jobTempDir = path.join(this.tempDir, jobId);
        try {
            await fs.promises.rm(jobTempDir, { recursive: true, force: true });
        }
        catch (error) {
            // Ignore cleanup errors
        }
    }
    /**
     * Check if file exists
     */
    async fileExists(filePath) {
        try {
            await fs.promises.access(filePath);
            return true;
        }
        catch {
            return false;
        }
    }
    /**
     * Cleanup all temp files on shutdown
     */
    async cleanup() {
        this.clearQueue();
        try {
            await fs.promises.rm(this.tempDir, { recursive: true, force: true });
        }
        catch (error) {
            // Ignore cleanup errors
        }
    }
}
exports.LaTeXCompiler = LaTeXCompiler;
// Export singleton instance
exports.latexCompiler = new LaTeXCompiler();
//# sourceMappingURL=latexCompiler.js.map