import { LaTeXCompiler } from '../latexCompiler';

describe('LaTeXCompiler Integration Tests', () => {
  let compiler: LaTeXCompiler;

  beforeEach(() => {
    compiler = new LaTeXCompiler();
  });

  afterEach(async () => {
    await compiler.cleanup();
  });

  it('should create a compiler instance', () => {
    expect(compiler).toBeInstanceOf(LaTeXCompiler);
  });

  it('should generate unique job IDs', async () => {
    const source = '\\documentclass{beamer}\\begin{document}\\end{document}';
    const jobId1 = await compiler.compile(source);
    const jobId2 = await compiler.compile(source);

    expect(jobId1).toMatch(/^job_\d+_\d+$/);
    expect(jobId2).toMatch(/^job_\d+_\d+$/);
    expect(jobId1).not.toBe(jobId2);
  });

  it('should check LaTeX availability', async () => {
    const availability = await compiler.checkLatexAvailability();
    
    expect(availability).toHaveProperty('available');
    expect(availability).toHaveProperty('compilers');
    expect(Array.isArray(availability.compilers)).toBe(true);
  });

  it('should handle queue status correctly', () => {
    const initialStatus = compiler.getQueueStatus();
    expect(initialStatus).toEqual({
      queued: 0,
      active: 0,
      total: 0,
    });
  });

  it('should emit events during compilation', (done) => {
    const source = '\\documentclass{beamer}\\begin{document}Test\\end{document}';
    let progressReceived = false;
    let completedReceived = false;

    compiler.on('progress', (progress) => {
      expect(progress).toHaveProperty('jobId');
      expect(progress).toHaveProperty('stage');
      expect(progress).toHaveProperty('progress');
      expect(progress).toHaveProperty('message');
      progressReceived = true;
    });

    compiler.on('job-completed', (result) => {
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('jobId');
      expect(result).toHaveProperty('log');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('warnings');
      expect(result).toHaveProperty('duration');
      completedReceived = true;

      // Verify we received both progress and completion events
      expect(progressReceived).toBe(true);
      expect(completedReceived).toBe(true);
      done();
    });

    compiler.compile(source);
  });

  it('should parse LaTeX errors correctly', () => {
    const logWithError = `
./document.tex:5: Undefined control sequence.
l.5 \\invalidcommand
                   
? 
! Emergency stop.
<*> ./document.tex
`;

    // Access private method for testing
    const parseMethod = (compiler as any).parseLatexLog.bind(compiler);
    const { errors, warnings } = parseMethod(logWithError);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(e => e.type === 'fatal')).toBe(true);
  });

  it('should parse LaTeX warnings correctly', () => {
    const logWithWarnings = `
Package babel Warning: No hyphenation patterns were preloaded for
(babel)                the language English into the format.

LaTeX Warning: Reference undefined on input line 10.
`;

    const parseMethod = (compiler as any).parseLatexLog.bind(compiler);
    const { errors, warnings } = parseMethod(logWithWarnings);

    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings.some(w => w.message.includes('babel'))).toBe(true);
  });

  it('should handle compilation options', async () => {
    const source = '\\documentclass{beamer}\\begin{document}\\end{document}';
    const options = {
      compiler: 'xelatex' as const,
      timeout: 60000,
      synctex: false,
      shell: true,
    };

    const jobId = await compiler.compile(source, options);
    expect(jobId).toBeDefined();
    expect(jobId).toMatch(/^job_\d+_\d+$/);
  });

  it('should clear queue properly', async () => {
    const source = '\\documentclass{beamer}\\begin{document}\\end{document}';
    
    // Add some jobs
    await compiler.compile(source);
    await compiler.compile(source);
    
    // Clear the queue
    compiler.clearQueue();
    
    const status = compiler.getQueueStatus();
    expect(status.total).toBe(0);
  });

  it('should handle job cancellation', async () => {
    const source = '\\documentclass{beamer}\\begin{document}\\end{document}';
    const jobId = await compiler.compile(source);
    
    // Try to cancel immediately (might be in queue or already processing)
    const cancelled = compiler.cancelJob(jobId);
    
    // Should return true if job was found and cancelled
    expect(typeof cancelled).toBe('boolean');
  });

  it('should return false for cancelling non-existent job', () => {
    const cancelled = compiler.cancelJob('non-existent-job-id');
    expect(cancelled).toBe(false);
  });

  it('should detect need for multiple compilation runs', () => {
    const stdout1 = 'Rerun to get cross-references right';
    const stdout2 = 'There were undefined references';
    const stdout3 = 'Label(s) may have changed';
    const stdout4 = 'Normal output without rerun needed';

    const needsRerunMethod = (compiler as any).needsAnotherRun.bind(compiler);
    
    expect(needsRerunMethod(stdout1)).toBe(true);
    expect(needsRerunMethod(stdout2)).toBe(true);
    expect(needsRerunMethod(stdout3)).toBe(true);
    expect(needsRerunMethod(stdout4)).toBe(false);
  });

  it('should generate context lines for errors', () => {
    const lines = [
      'Line 1',
      'Line 2',
      'Error line',
      'Line 4',
      'Line 5',
    ];

    const getContextMethod = (compiler as any).getContextLines.bind(compiler);
    const context = getContextMethod(lines, 2, 1); // Error at index 2, context size 1

    expect(context).toContain('Line 2');
    expect(context).toContain('Error line');
    expect(context).toContain('Line 4');
  });
});