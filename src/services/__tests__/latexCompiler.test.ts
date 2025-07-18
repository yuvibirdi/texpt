import { LaTeXCompiler } from '../latexCompiler';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Mock child_process
jest.mock('child_process');
import { spawn } from 'child_process';
const mockSpawn = spawn as jest.MockedFunction<typeof spawn>;

// Mock fs promises
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  promises: {
    mkdir: jest.fn(),
    writeFile: jest.fn(),
    readFile: jest.fn(),
    access: jest.fn(),
    rm: jest.fn(),
  },
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
}));

describe('LaTeXCompiler', () => {
  let compiler: LaTeXCompiler;
  let mockProcess: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock successful process
    mockProcess = {
      stdout: {
        on: jest.fn((event, callback) => {
          if (event === 'data') {
            setTimeout(() => callback('LaTeX compilation output'), 10);
          }
        }),
      },
      stderr: {
        on: jest.fn((event, callback) => {
          if (event === 'data') {
            setTimeout(() => callback(''), 10);
          }
        }),
      },
      on: jest.fn((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(0), 20); // Success exit code
        }
      }),
      kill: jest.fn(),
    };

    mockSpawn.mockReturnValue(mockProcess as any);
    
    // Mock fs operations
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.promises.mkdir as jest.Mock).mockResolvedValue(undefined);
    (fs.promises.writeFile as jest.Mock).mockResolvedValue(undefined);
    (fs.promises.readFile as jest.Mock).mockResolvedValue(Buffer.from('PDF content'));
    (fs.promises.access as jest.Mock).mockResolvedValue(undefined);
    (fs.promises.rm as jest.Mock).mockResolvedValue(undefined);

    compiler = new LaTeXCompiler();
  });

  afterEach(async () => {
    await compiler.cleanup();
  });

  describe('compile', () => {
    it('should queue a compilation job and return job ID', async () => {
      const source = '\\documentclass{beamer}\\begin{document}\\end{document}';
      const jobId = await compiler.compile(source);

      expect(jobId).toMatch(/^job_\d+_\d+$/);
      expect(compiler.getQueueStatus().total).toBe(1);
    });

    it('should accept compilation options', async () => {
      const source = '\\documentclass{beamer}\\begin{document}\\end{document}';
      const options = {
        compiler: 'xelatex' as const,
        timeout: 60000,
        synctex: false,
      };

      const jobId = await compiler.compile(source, options);
      expect(jobId).toBeDefined();
    });

    it('should emit progress events during compilation', (done) => {
      const source = '\\documentclass{beamer}\\begin{document}\\end{document}';
      let progressCount = 0;

      compiler.on('progress', (progress) => {
        expect(progress).toHaveProperty('jobId');
        expect(progress).toHaveProperty('stage');
        expect(progress).toHaveProperty('progress');
        expect(progress).toHaveProperty('message');
        progressCount++;
      });

      compiler.on('job-completed', () => {
        expect(progressCount).toBeGreaterThan(0);
        done();
      });

      compiler.compile(source);
    });

    it('should emit job-completed event with results', (done) => {
      const source = '\\documentclass{beamer}\\begin{document}\\end{document}';

      compiler.on('job-completed', (result) => {
        expect(result).toHaveProperty('success');
        expect(result).toHaveProperty('jobId');
        expect(result).toHaveProperty('log');
        expect(result).toHaveProperty('errors');
        expect(result).toHaveProperty('warnings');
        expect(result).toHaveProperty('duration');
        done();
      });

      compiler.compile(source);
    });
  });

  describe('cancelJob', () => {
    it('should cancel queued job', async () => {
      const source = '\\documentclass{beamer}\\begin{document}\\end{document}';
      const jobId = await compiler.compile(source);

      const cancelled = compiler.cancelJob(jobId);
      expect(cancelled).toBe(true);
      expect(compiler.getQueueStatus().total).toBe(0);
    });

    it('should return false for non-existent job', () => {
      const cancelled = compiler.cancelJob('non-existent-job');
      expect(cancelled).toBe(false);
    });

    it('should emit job-cancelled event', (done) => {
      compiler.on('job-cancelled', (data) => {
        expect(data).toHaveProperty('jobId');
        done();
      });

      compiler.compile('\\documentclass{beamer}\\begin{document}\\end{document}')
        .then(jobId => compiler.cancelJob(jobId));
    });
  });

  describe('getQueueStatus', () => {
    it('should return correct queue status', async () => {
      const status1 = compiler.getQueueStatus();
      expect(status1).toEqual({ queued: 0, active: 0, total: 0 });

      await compiler.compile('\\documentclass{beamer}\\begin{document}\\end{document}');
      const status2 = compiler.getQueueStatus();
      expect(status2.total).toBe(1);
    });
  });

  describe('clearQueue', () => {
    it('should clear all jobs from queue', async () => {
      await compiler.compile('\\documentclass{beamer}\\begin{document}\\end{document}');
      await compiler.compile('\\documentclass{beamer}\\begin{document}\\end{document}');

      expect(compiler.getQueueStatus().total).toBe(2);

      compiler.clearQueue();
      expect(compiler.getQueueStatus().total).toBe(0);
    });

    it('should emit job-cancelled events for all jobs', (done) => {
      let cancelledCount = 0;

      compiler.on('job-cancelled', () => {
        cancelledCount++;
        if (cancelledCount === 2) {
          done();
        }
      });

      Promise.all([
        compiler.compile('\\documentclass{beamer}\\begin{document}\\end{document}'),
        compiler.compile('\\documentclass{beamer}\\begin{document}\\end{document}'),
      ]).then(() => {
        compiler.clearQueue();
      });
    });
  });

  describe('checkLatexAvailability', () => {
    it('should check for available LaTeX compilers', async () => {
      const availability = await compiler.checkLatexAvailability();

      expect(availability).toHaveProperty('available');
      expect(availability).toHaveProperty('compilers');
      expect(Array.isArray(availability.compilers)).toBe(true);
    });

    it('should handle unavailable compilers gracefully', async () => {
      // Mock spawn to simulate command not found
      mockProcess.on.mockImplementation((event, callback) => {
        if (event === 'error') {
          setTimeout(() => callback(new Error('Command not found')), 10);
        }
      });

      const availability = await compiler.checkLatexAvailability();
      expect(availability.available).toBe(false);
      expect(availability.compilers).toEqual([]);
    });
  });

  describe('error handling', () => {
    it('should handle compilation errors gracefully', (done) => {
      // Mock failed process
      mockProcess.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(1), 20); // Error exit code
        }
      });

      compiler.on('job-completed', (result) => {
        expect(result.success).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
        done();
      });

      compiler.compile('\\invalid{latex}');
    });

    it('should handle process timeout', (done) => {
      // Mock process that never completes
      mockProcess.on.mockImplementation((event, callback) => {
        // Don't call the close callback to simulate hanging process
      });

      compiler.on('job-completed', (result) => {
        expect(result.success).toBe(false);
        expect(result.log).toContain('timed out');
        done();
      });

      compiler.compile('\\documentclass{beamer}\\begin{document}\\end{document}', {
        timeout: 100, // Very short timeout
      });
    });

    it('should parse LaTeX errors from log', () => {
      const logWithErrors = `
./document.tex:5: Undefined control sequence.
l.5 \\invalidcommand
                   
? 
! Emergency stop.
<*> ./document.tex

!  ==> Fatal error occurred, no output PDF file produced!
`;

      // Access private method for testing
      const parseMethod = (compiler as any).parseLatexLog.bind(compiler);
      const { errors, warnings } = parseMethod(logWithErrors);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toHaveProperty('line', 5);
      expect(errors[0]).toHaveProperty('message');
      expect(errors[0]).toHaveProperty('type');
    });

    it('should parse LaTeX warnings from log', () => {
      const logWithWarnings = `
Package babel Warning: No hyphenation patterns were preloaded for
(babel)                the language \`English' into the format.

LaTeX Warning: Reference \`fig:example' on page 1 undefined on input line 10.
`;

      const parseMethod = (compiler as any).parseLatexLog.bind(compiler);
      const { errors, warnings } = parseMethod(logWithWarnings);

      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings.some(w => w.message.includes('babel'))).toBe(true);
      expect(warnings.some(w => w.message.includes('Reference'))).toBe(true);
    });
  });

  describe('file management', () => {
    it('should create temporary directories for jobs', async () => {
      const source = '\\documentclass{beamer}\\begin{document}\\end{document}';
      await compiler.compile(source);

      expect(fs.promises.mkdir).toHaveBeenCalled();
    });

    it('should write LaTeX source to temporary file', async () => {
      const source = '\\documentclass{beamer}\\begin{document}\\end{document}';
      await compiler.compile(source);

      expect(fs.promises.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('document.tex'),
        source,
        'utf-8'
      );
    });

    it('should clean up temporary files after compilation', (done) => {
      const source = '\\documentclass{beamer}\\begin{document}\\end{document}';

      compiler.on('job-completed', () => {
        // Give some time for cleanup
        setTimeout(() => {
          expect(fs.promises.rm).toHaveBeenCalled();
          done();
        }, 100);
      });

      compiler.compile(source);
    });
  });

  describe('queue management', () => {
    it('should process jobs in priority order', async () => {
      const job1 = await compiler.compile('\\documentclass{beamer}\\begin{document}Job 1\\end{document}');
      const job2 = await compiler.compile('\\documentclass{beamer}\\begin{document}Job 2\\end{document}');

      // Access private queue for testing
      const queue = (compiler as any).queue;
      expect(queue.length).toBe(2);
      
      // Jobs should be sorted by timestamp (FIFO for same priority)
      expect(queue[0].id).toBe(job1);
      expect(queue[1].id).toBe(job2);
    });

    it('should limit concurrent jobs', async () => {
      // Set max concurrent jobs to 1 for testing
      (compiler as any).maxConcurrentJobs = 1;

      await compiler.compile('\\documentclass{beamer}\\begin{document}Job 1\\end{document}');
      await compiler.compile('\\documentclass{beamer}\\begin{document}Job 2\\end{document}');

      const status = compiler.getQueueStatus();
      expect(status.active).toBeLessThanOrEqual(1);
    });
  });

  describe('compilation options', () => {
    it('should use specified compiler', async () => {
      const source = '\\documentclass{beamer}\\begin{document}\\end{document}';
      await compiler.compile(source, { compiler: 'xelatex' });

      // Check that spawn was called with xelatex
      expect(mockSpawn).toHaveBeenCalledWith(
        'xelatex',
        expect.arrayContaining([expect.stringContaining('document.tex')]),
        expect.any(Object)
      );
    });

    it('should handle synctex option', async () => {
      const source = '\\documentclass{beamer}\\begin{document}\\end{document}';
      await compiler.compile(source, { synctex: false });

      // Check that synctex argument is not included
      const spawnArgs = mockSpawn.mock.calls[0][1];
      expect(spawnArgs).not.toContain('-synctex=1');
    });

    it('should handle shell escape option', async () => {
      const source = '\\documentclass{beamer}\\begin{document}\\end{document}';
      await compiler.compile(source, { shell: true });

      // Check that shell-escape argument is included
      const spawnArgs = mockSpawn.mock.calls[0][1];
      expect(spawnArgs).toContain('-shell-escape');
    });
  });

  describe('multiple compilation runs', () => {
    it('should run multiple passes for references', (done) => {
      // Mock output that indicates need for rerun
      mockProcess.stdout.on.mockImplementation((event, callback) => {
        if (event === 'data') {
          setTimeout(() => callback('Rerun to get cross-references right'), 10);
        }
      });

      compiler.on('job-completed', () => {
        // Should have been called multiple times for multiple passes
        expect(mockSpawn).toHaveBeenCalledTimes(2);
        done();
      });

      compiler.compile('\\documentclass{beamer}\\begin{document}\\ref{test}\\end{document}');
    });

    it('should limit maximum compilation runs', (done) => {
      // Mock output that always indicates need for rerun
      mockProcess.stdout.on.mockImplementation((event, callback) => {
        if (event === 'data') {
          setTimeout(() => callback('Rerun to get cross-references right'), 10);
        }
      });

      compiler.on('job-completed', () => {
        // Should not exceed maximum runs (3)
        expect(mockSpawn).toHaveBeenCalledTimes(3);
        done();
      });

      compiler.compile('\\documentclass{beamer}\\begin{document}\\ref{test}\\end{document}');
    });
  });
});