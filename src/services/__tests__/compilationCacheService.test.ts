import { CompilationCacheService } from '../compilationCacheService';
import { Slide, Presentation } from '../../types/presentation';
import { CompilationResult } from '../latexCompiler';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
});

describe('CompilationCacheService', () => {
  let service: CompilationCacheService;
  let mockSlide: Slide;
  let mockPresentation: Presentation;
  let mockCompilationResult: CompilationResult;

  beforeEach(() => {
    service = new CompilationCacheService({
      maxEntries: 5,
      maxMemoryMB: 10,
      maxAge: 60000, // 1 minute
      enablePersistence: false, // Disable for testing
      compressionLevel: 0,
    });

    mockSlide = {
      id: 'slide-1',
      title: 'Test Slide',
      elements: [
        {
          id: 'element-1',
          type: 'text',
          position: { x: 100, y: 100 },
          size: { width: 200, height: 50 },
          properties: { fontSize: 16 },
          content: 'Test text',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      connections: [],
      layout: {
        name: 'default',
        template: 'title-content',
        regions: {
          title: { x: 0, y: 0, width: 800, height: 100 },
          content: { x: 0, y: 100, width: 800, height: 500 },
        },
      },
      background: {
        type: 'color',
        color: '#ffffff',
      },
      notes: '',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockPresentation = {
      id: 'presentation-1',
      title: 'Test Presentation',
      slides: [mockSlide],
      theme: {
        id: 'default',
        name: 'Default Theme',
        colors: {
          primary: { r: 0, g: 122, b: 204 },
          secondary: { r: 108, g: 117, b: 125 },
          accent: { r: 40, g: 167, b: 69 },
          background: { r: 255, g: 255, b: 255 },
          text: { r: 33, g: 37, b: 41 },
        },
        fonts: {
          heading: { family: 'Arial', size: 24, weight: 'bold' },
          body: { family: 'Arial', size: 16, weight: 'normal' },
          code: { family: 'Courier New', size: 14, weight: 'normal' },
        },
      },
      metadata: {
        title: 'Test Presentation',
        author: 'Test Author',
        subject: 'Test Subject',
        keywords: ['test'],
        date: new Date(),
      },
      settings: {
        autoSave: true,
        autoSaveInterval: 30,
        snapToGrid: true,
        gridSize: 10,
        showGrid: false,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      version: '1.0.0',
    };

    mockCompilationResult = {
      success: true,
      pdfPath: '/tmp/test.pdf',
      pdfBuffer: Buffer.from('test pdf content'),
      log: 'Compilation successful',
      errors: [],
      warnings: [],
      duration: 1000,
      jobId: 'job-1',
    };

    // Clear localStorage mocks
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
  });

  afterEach(() => {
    service.cleanup();
  });

  describe('initialization', () => {
    it('should initialize with default options', () => {
      const newService = new CompilationCacheService();
      expect(newService).toBeDefined();
    });

    it('should initialize with custom options', () => {
      const customService = new CompilationCacheService({
        maxEntries: 20,
        maxMemoryMB: 100,
        enablePersistence: false,
      });
      expect(customService).toBeDefined();
    });
  });

  describe('caching', () => {
    it('should cache compilation results', () => {
      const latexCode = '\\documentclass{beamer}\\begin{document}\\end{document}';
      
      service.cacheResult(mockSlide, mockPresentation, latexCode, mockCompilationResult);
      
      const stats = service.getStats();
      expect(stats.totalEntries).toBe(1);
    });

    it('should retrieve cached results', () => {
      const latexCode = '\\documentclass{beamer}\\begin{document}\\end{document}';
      
      service.cacheResult(mockSlide, mockPresentation, latexCode, mockCompilationResult);
      
      const cachedResult = service.getCachedResult(mockSlide, mockPresentation, latexCode);
      
      expect(cachedResult).toBeDefined();
      expect(cachedResult?.success).toBe(true);
      expect(cachedResult?.jobId).toBe('job-1');
    });

    it('should return null for non-cached results', () => {
      const latexCode = '\\documentclass{beamer}\\begin{document}\\end{document}';
      
      const cachedResult = service.getCachedResult(mockSlide, mockPresentation, latexCode);
      
      expect(cachedResult).toBeNull();
    });

    it('should invalidate cache when slide content changes', () => {
      const latexCode = '\\documentclass{beamer}\\begin{document}\\end{document}';
      
      service.cacheResult(mockSlide, mockPresentation, latexCode, mockCompilationResult);
      
      let cachedResult = service.getCachedResult(mockSlide, mockPresentation, latexCode);
      expect(cachedResult).toBeDefined();
      
      // Change slide content
      const modifiedSlide = {
        ...mockSlide,
        title: 'Modified Slide',
        updatedAt: new Date(),
      };
      
      cachedResult = service.getCachedResult(modifiedSlide, mockPresentation, latexCode);
      expect(cachedResult).toBeNull();
    });
  });

  describe('cache invalidation', () => {
    it('should invalidate cache for specific slide', () => {
      const latexCode = '\\documentclass{beamer}\\begin{document}\\end{document}';
      
      service.cacheResult(mockSlide, mockPresentation, latexCode, mockCompilationResult);
      
      let stats = service.getStats();
      expect(stats.totalEntries).toBe(1);
      
      service.invalidateSlide('slide-1');
      
      stats = service.getStats();
      expect(stats.totalEntries).toBe(0);
    });

    it('should invalidate cache for entire presentation', () => {
      const latexCode = '\\documentclass{beamer}\\begin{document}\\end{document}';
      
      service.cacheResult(mockSlide, mockPresentation, latexCode, mockCompilationResult);
      
      let stats = service.getStats();
      expect(stats.totalEntries).toBe(1);
      
      service.invalidatePresentation('presentation-1');
      
      stats = service.getStats();
      expect(stats.totalEntries).toBe(0);
    });

    it('should clear all cache entries', () => {
      const latexCode = '\\documentclass{beamer}\\begin{document}\\end{document}';
      
      service.cacheResult(mockSlide, mockPresentation, latexCode, mockCompilationResult);
      
      let stats = service.getStats();
      expect(stats.totalEntries).toBe(1);
      
      service.clearCache();
      
      stats = service.getStats();
      expect(stats.totalEntries).toBe(0);
    });
  });

  describe('cache statistics', () => {
    it('should provide cache statistics', () => {
      const stats = service.getStats();
      
      expect(stats).toHaveProperty('totalEntries');
      expect(stats).toHaveProperty('memoryUsage');
      expect(stats).toHaveProperty('hitRate');
      expect(stats).toHaveProperty('oldestEntry');
      expect(stats).toHaveProperty('newestEntry');
      expect(stats).toHaveProperty('averageSize');
      
      expect(typeof stats.totalEntries).toBe('number');
      expect(typeof stats.memoryUsage).toBe('number');
      expect(typeof stats.hitRate).toBe('number');
    });

    it('should track hit rate correctly', () => {
      const latexCode = '\\documentclass{beamer}\\begin{document}\\end{document}';
      
      // Cache miss
      let cachedResult = service.getCachedResult(mockSlide, mockPresentation, latexCode);
      expect(cachedResult).toBeNull();
      
      // Cache the result
      service.cacheResult(mockSlide, mockPresentation, latexCode, mockCompilationResult);
      
      // Cache hit
      cachedResult = service.getCachedResult(mockSlide, mockPresentation, latexCode);
      expect(cachedResult).toBeDefined();
      
      const stats = service.getStats();
      expect(stats.hitRate).toBe(0.5); // 1 hit out of 2 requests
    });
  });

  describe('cache optimization', () => {
    it('should optimize cache by removing least useful entries', () => {
      const latexCode = '\\documentclass{beamer}\\begin{document}\\end{document}';
      
      // Fill cache beyond limit
      for (let i = 0; i < 10; i++) {
        const slide = { ...mockSlide, id: `slide-${i}` };
        service.cacheResult(slide, mockPresentation, latexCode, mockCompilationResult);
      }
      
      let stats = service.getStats();
      expect(stats.totalEntries).toBe(5); // Should be limited by maxEntries
      
      service.optimizeCache();
      
      stats = service.getStats();
      expect(stats.totalEntries).toBeLessThanOrEqual(4); // Should be reduced further
    });
  });

  describe('import/export', () => {
    it('should export cache data', () => {
      const latexCode = '\\documentclass{beamer}\\begin{document}\\end{document}';
      
      service.cacheResult(mockSlide, mockPresentation, latexCode, mockCompilationResult);
      
      const exportedData = service.exportCache();
      
      expect(exportedData).toBeDefined();
      expect(typeof exportedData).toBe('string');
      
      const parsedData = JSON.parse(exportedData);
      expect(parsedData).toHaveProperty('entries');
      expect(parsedData).toHaveProperty('stats');
      expect(parsedData).toHaveProperty('timestamp');
    });

    it('should import cache data', () => {
      const latexCode = '\\documentclass{beamer}\\begin{document}\\end{document}';
      
      service.cacheResult(mockSlide, mockPresentation, latexCode, mockCompilationResult);
      
      const exportedData = service.exportCache();
      
      // Clear cache
      service.clearCache();
      expect(service.getStats().totalEntries).toBe(0);
      
      // Import data
      const success = service.importCache(exportedData);
      
      expect(success).toBe(true);
      expect(service.getStats().totalEntries).toBe(1);
    });

    it('should handle invalid import data gracefully', () => {
      const success = service.importCache('invalid json');
      
      expect(success).toBe(false);
    });
  });

  describe('preloading', () => {
    it('should preload slides without errors', () => {
      const slides = [mockSlide, { ...mockSlide, id: 'slide-2' }];
      
      expect(() => service.preloadSlides(slides, mockPresentation)).not.toThrow();
    });
  });
});