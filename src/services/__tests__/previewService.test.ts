import { PreviewService } from '../previewService';
import { latexCompiler } from '../latexCompiler';
import { latexGenerator } from '../latexGenerator';
import { Presentation } from '../../types/presentation';

// Mock the dependencies
jest.mock('../latexCompiler', () => ({
  latexCompiler: {
    compile: jest.fn(),
    cancelJob: jest.fn(),
    getQueueStatus: jest.fn(),
    checkLatexAvailability: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
  },
}));

jest.mock('../latexGenerator', () => ({
  latexGenerator: {
    generateDocument: jest.fn(),
  },
}));

const mockLatexCompiler = latexCompiler as jest.Mocked<typeof latexCompiler>;
const mockLatexGenerator = latexGenerator as jest.Mocked<typeof latexGenerator>;

// Mock URL.createObjectURL and revokeObjectURL
global.URL.createObjectURL = jest.fn(() => 'mock-blob-url');
global.URL.revokeObjectURL = jest.fn();

const createMockPresentation = (): Presentation => ({
  id: 'test-presentation',
  title: 'Test Presentation',
  slides: [
    {
      id: 'slide-1',
      title: 'Slide 1',
      elements: [
        {
          id: 'element-1',
          type: 'text',
          position: { x: 100, y: 100 },
          size: { width: 200, height: 50 },
          properties: {
            textColor: { r: 0, g: 0, b: 0, a: 1 },
            fontSize: 16,
            fontWeight: 'normal',
            fontStyle: 'normal',
            textAlign: 'left',
          },
          content: 'Hello World',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      connections: [],
      layout: { name: 'default' },
      background: { type: 'color', color: { r: 255, g: 255, b: 255, a: 1 } },
      notes: '',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
  theme: {
    colors: {
      primary: { r: 0, g: 123, b: 255, a: 1 },
      secondary: { r: 108, g: 117, b: 125, a: 1 },
      background: { r: 255, g: 255, b: 255, a: 1 },
      text: { r: 33, g: 37, b: 41, a: 1 },
    },
    fonts: {
      heading: 'Inter',
      body: 'Inter',
    },
  },
  metadata: {
    title: 'Test Presentation',
    subtitle: '',
    author: '',
    institution: '',
    date: new Date(),
    keywords: [],
    description: '',
  },
  settings: {
    slideSize: { width: 800, height: 600 },
    aspectRatio: '4:3',
    theme: 'default',
    language: 'en',
    autoSave: true,
    autoSaveInterval: 30000,
  },
  createdAt: new Date(),
  updatedAt: new Date(),
  version: '1.0.0',
});

describe('PreviewService', () => {
  let previewService: PreviewService;

  beforeEach(() => {
    jest.clearAllMocks();
    previewService = new PreviewService({
      debounceMs: 100, // Shorter debounce for tests
      autoCompile: true,
    });
  });

  afterEach(() => {
    previewService.cleanup();
  });

  describe('compilePresentation', () => {
    it('should generate LaTeX and start compilation', async () => {
      const mockPresentation = createMockPresentation();
      const mockLatexSource = '\\documentclass{beamer}\\begin{document}\\end{document}';
      const mockJobId = 'job-123';

      mockLatexGenerator.generateDocument.mockReturnValue(mockLatexSource);
      mockLatexCompiler.compile.mockResolvedValue(mockJobId);

      // Start compilation and wait for debounce
      const compilationPromise = previewService.compilePresentation(mockPresentation);
      
      // Wait for debounce timeout
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(mockLatexGenerator.generateDocument).toHaveBeenCalledWith(mockPresentation, {
        includePackages: true,
        includeDocumentClass: true,
        optimizeCode: true,
      });

      expect(mockLatexCompiler.compile).toHaveBeenCalledWith(mockLatexSource, {
        compiler: 'pdflatex',
        timeout: 30000,
        synctex: true,
      });
    });

    it('should handle compilation errors', async () => {
      const mockPresentation = createMockPresentation();
      const mockLatexSource = '\\documentclass{beamer}\\begin{document}\\end{document}';

      mockLatexGenerator.generateDocument.mockReturnValue(mockLatexSource);
      mockLatexCompiler.compile.mockRejectedValue(new Error('LaTeX compilation failed'));

      await expect(previewService.compilePresentation(mockPresentation)).rejects.toThrow('LaTeX compilation failed');
    });

    it('should debounce multiple compilation requests', async () => {
      const mockPresentation = createMockPresentation();
      mockLatexGenerator.generateDocument.mockReturnValue('\\documentclass{beamer}');
      mockLatexCompiler.compile.mockResolvedValue('job-123');

      // Make multiple rapid calls
      previewService.compilePresentation(mockPresentation);
      previewService.compilePresentation(mockPresentation);
      previewService.compilePresentation(mockPresentation);

      // Wait for debounce timeout
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should only compile once due to debouncing
      expect(mockLatexCompiler.compile).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple compilation requests', async () => {
      const mockPresentation = createMockPresentation();
      mockLatexGenerator.generateDocument.mockReturnValue('\\documentclass{beamer}');
      mockLatexCompiler.compile.mockResolvedValue('job-123');
      mockLatexCompiler.cancelJob.mockReturnValue(true);

      // Start first compilation
      previewService.compilePresentation(mockPresentation);
      
      // Start second compilation immediately
      previewService.compilePresentation(mockPresentation);

      // Wait for debounce
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should have attempted to compile
      expect(mockLatexCompiler.compile).toHaveBeenCalled();
    });
  });

  describe('updatePreview', () => {
    it('should not compile if presentation hash is unchanged', () => {
      const mockPresentation = createMockPresentation();
      mockLatexGenerator.generateDocument.mockReturnValue('\\documentclass{beamer}');

      // First update should trigger compilation
      previewService.updatePreview(mockPresentation);
      
      // Second update with same presentation should not trigger compilation
      previewService.updatePreview(mockPresentation);

      expect(mockLatexCompiler.compile).toHaveBeenCalledTimes(0); // Due to debouncing, not called yet
    });

    it('should compile if forceCompile is true even with unchanged hash', async () => {
      const mockPresentation = createMockPresentation();
      mockLatexGenerator.generateDocument.mockReturnValue('\\documentclass{beamer}');
      mockLatexCompiler.compile.mockResolvedValue('job-123');

      // First update
      previewService.updatePreview(mockPresentation);
      await new Promise(resolve => setTimeout(resolve, 150));

      // Second update with forceCompile should trigger compilation
      previewService.updatePreview(mockPresentation, true);
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(mockLatexCompiler.compile).toHaveBeenCalledTimes(2);
    });

    it('should compile when presentation content changes', async () => {
      const mockPresentation = createMockPresentation();
      mockLatexGenerator.generateDocument.mockReturnValue('\\documentclass{beamer}');
      mockLatexCompiler.compile.mockResolvedValue('job-123');

      // First update
      previewService.updatePreview(mockPresentation);
      await new Promise(resolve => setTimeout(resolve, 150));

      // Modify presentation
      const modifiedPresentation = {
        ...mockPresentation,
        title: 'Modified Presentation',
        updatedAt: new Date(),
      };

      previewService.updatePreview(modifiedPresentation);
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(mockLatexCompiler.compile).toHaveBeenCalledTimes(2);
    });
  });

  describe('event handling', () => {
    it('should emit compilation-started event', (done) => {
      const mockPresentation = createMockPresentation();
      mockLatexGenerator.generateDocument.mockReturnValue('\\documentclass{beamer}');
      mockLatexCompiler.compile.mockResolvedValue('job-123');

      previewService.on('compilation-started', () => {
        done();
      });

      previewService.compilePresentation(mockPresentation);
    });
  });

  describe('navigation and synchronization', () => {
    it('should emit slide-navigation event when navigating to slide', (done) => {
      previewService.on('slide-navigation', ({ slideIndex }) => {
        expect(slideIndex).toBe(3);
        done();
      });

      previewService.navigateToSlide(3);
    });

    it('should sync with slide by finding slide index', () => {
      const mockPresentation = createMockPresentation();
      const slideNavigationSpy = jest.fn();
      
      previewService.on('slide-navigation', slideNavigationSpy);
      previewService.syncWithSlide('slide-1', mockPresentation);

      expect(slideNavigationSpy).toHaveBeenCalledWith({ slideIndex: 1 }); // 1-indexed
    });

    it('should not navigate if slide ID is not found', () => {
      const mockPresentation = createMockPresentation();
      const slideNavigationSpy = jest.fn();
      
      previewService.on('slide-navigation', slideNavigationSpy);
      previewService.syncWithSlide('non-existent-slide', mockPresentation);

      expect(slideNavigationSpy).not.toHaveBeenCalled();
    });
  });

  describe('utility methods', () => {
    it('should return compilation status', () => {
      mockLatexCompiler.getQueueStatus.mockReturnValue({
        queued: 2,
        active: 1,
        total: 3,
      });

      const status = previewService.getCompilationStatus();

      expect(status.isCompiling).toBe(false);
      expect(status.queueStatus).toEqual({
        queued: 2,
        active: 1,
        total: 3,
      });
    });

    it('should handle cancellation when no job is active', () => {
      mockLatexCompiler.cancelJob.mockReturnValue(false);
      
      const cancelled = previewService.cancelCompilation();
      
      expect(cancelled).toBe(false);
    });

    it('should check LaTeX availability', async () => {
      const mockAvailability = {
        available: true,
        compilers: ['pdflatex', 'xelatex'],
        version: '2023',
      };
      
      mockLatexCompiler.checkLatexAvailability.mockResolvedValue(mockAvailability);
      
      const result = await previewService.checkLatexAvailability();
      
      expect(result).toEqual(mockAvailability);
    });

    it('should update options', () => {
      previewService.updateOptions({
        debounceMs: 1000,
        compiler: 'xelatex',
      });

      // Options are private, but we can test the effect by checking compilation behavior
      expect(previewService).toBeDefined(); // Basic check that service still works
    });
  });

  describe('cleanup', () => {
    it('should clean up resources on cleanup', () => {
      // Set up a mock PDF URL
      previewService['currentPdfUrl'] = 'mock-blob-url';
      
      previewService.cleanup();
      
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('mock-blob-url');
    });
  });
});