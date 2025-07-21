/**
 * Integration test for performance optimizations
 * Tests the actual functionality without complex mocking
 */

import { CanvasVirtualizationService } from '../canvasVirtualizationService';
import { LazyLoadingService } from '../lazyLoadingService';
import { CompilationCacheService } from '../compilationCacheService';
import { MemoryManagementService } from '../memoryManagementService';
import { SlideElement, Slide, Presentation } from '../../types/presentation';
import { CompilationResult } from '../latexCompiler';

describe('Performance Optimizations Integration', () => {
  describe('CanvasVirtualizationService', () => {
    it('should initialize and provide basic functionality', () => {
      const service = new CanvasVirtualizationService({
        enableCulling: false, // Disable complex features for testing
        enableLOD: false,
      });

      expect(service).toBeDefined();
      
      const stats = service.getStats();
      expect(stats).toHaveProperty('totalObjects');
      expect(stats).toHaveProperty('visibleObjects');
      expect(stats).toHaveProperty('renderedObjects');
      expect(stats).toHaveProperty('memoryUsage');

      service.cleanup();
    });

    it('should handle element updates', () => {
      const service = new CanvasVirtualizationService({
        enableCulling: false,
        enableLOD: false,
      });

      const elements: SlideElement[] = [
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
      ];

      // Should not throw errors
      expect(() => service.updateElements(elements)).not.toThrow();
      expect(() => service.forceUpdate()).not.toThrow();
      
      service.cleanup();
    });
  });

  describe('LazyLoadingService', () => {
    it('should initialize and provide basic functionality', () => {
      const service = new LazyLoadingService({
        enableIntersectionObserver: false, // Disable for testing
      });

      expect(service).toBeDefined();
      
      const stats = service.getCacheStats();
      expect(stats).toHaveProperty('thumbnails');
      expect(stats).toHaveProperty('previews');
      expect(stats).toHaveProperty('totalMemory');

      service.cleanup();
    });

    it('should handle cache operations', () => {
      const service = new LazyLoadingService({
        enableIntersectionObserver: false,
      });

      // Should not throw errors
      expect(() => service.clearAllCaches()).not.toThrow();
      expect(() => service.clearSlideCache('test-slide')).not.toThrow();
      
      const stats = service.getCacheStats();
      expect(stats.thumbnails.count).toBe(0);
      expect(stats.previews.count).toBe(0);

      service.cleanup();
    });
  });

  describe('CompilationCacheService', () => {
    it('should initialize and provide basic functionality', () => {
      const service = new CompilationCacheService({
        enablePersistence: false, // Disable for testing
      });

      expect(service).toBeDefined();
      
      const stats = service.getStats();
      expect(stats).toHaveProperty('totalEntries');
      expect(stats).toHaveProperty('memoryUsage');
      expect(stats).toHaveProperty('hitRate');

      service.cleanup();
    });

    it('should handle cache operations', () => {
      const service = new CompilationCacheService({
        enablePersistence: false,
      });

      const mockSlide: Slide = {
        id: 'slide-1',
        title: 'Test Slide',
        elements: [],
        connections: [],
        layout: {
          name: 'default',
          template: 'title-content',
          regions: {
            title: { x: 0, y: 0, width: 800, height: 100 },
            content: { x: 0, y: 100, width: 800, height: 500 },
          },
        },
        background: { type: 'color', color: '#ffffff' },
        notes: '',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockPresentation: Presentation = {
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

      const mockResult: CompilationResult = {
        success: true,
        pdfPath: '/tmp/test.pdf',
        pdfBuffer: Buffer.from('test'),
        log: 'Success',
        errors: [],
        warnings: [],
        duration: 1000,
        jobId: 'job-1',
      };

      const latexCode = '\\documentclass{beamer}\\begin{document}\\end{document}';

      // Should not throw errors
      expect(() => service.cacheResult(mockSlide, mockPresentation, latexCode, mockResult)).not.toThrow();
      expect(() => service.invalidateSlide('slide-1')).not.toThrow();
      expect(() => service.clearCache()).not.toThrow();

      service.cleanup();
    });
  });

  describe('MemoryManagementService', () => {
    it('should initialize and provide basic functionality', () => {
      const service = new MemoryManagementService({
        enableAutoCleanup: false, // Disable for testing
        enablePerformanceMonitoring: false,
      });

      expect(service).toBeDefined();
      
      const stats = service.getMemoryStats();
      expect(stats).toHaveProperty('fabricObjects');
      expect(stats).toHaveProperty('canvasMemory');
      expect(stats).toHaveProperty('imageCache');
      expect(stats).toHaveProperty('totalEstimated');

      service.cleanup();
    });

    it('should handle image cache operations', () => {
      const service = new MemoryManagementService({
        enableAutoCleanup: false,
        enablePerformanceMonitoring: false,
      });

      // Should not throw errors
      expect(() => service.cacheImage('image-1', 'test-data', 1024)).not.toThrow();
      expect(service.getCachedImage('image-1')).toBe('test-data');
      expect(() => service.removeCachedImage('image-1')).not.toThrow();
      expect(service.getCachedImage('image-1')).toBeNull();

      service.cleanup();
    });

    it('should handle cleanup operations', async () => {
      const service = new MemoryManagementService({
        enableAutoCleanup: false,
        enablePerformanceMonitoring: false,
      });

      // Should not throw errors
      await expect(service.performCleanup(true)).resolves.not.toThrow();
      expect(() => service.forceGarbageCollection()).not.toThrow();

      service.cleanup();
    });
  });

  describe('Integration between services', () => {
    it('should work together without conflicts', () => {
      const virtualizationService = new CanvasVirtualizationService({
        enableCulling: false,
        enableLOD: false,
      });
      
      const lazyLoadingService = new LazyLoadingService({
        enableIntersectionObserver: false,
      });
      
      const cacheService = new CompilationCacheService({
        enablePersistence: false,
      });
      
      const memoryService = new MemoryManagementService({
        enableAutoCleanup: false,
        enablePerformanceMonitoring: false,
      });

      // All services should be able to coexist
      expect(virtualizationService).toBeDefined();
      expect(lazyLoadingService).toBeDefined();
      expect(cacheService).toBeDefined();
      expect(memoryService).toBeDefined();

      // Cleanup all services
      virtualizationService.cleanup();
      lazyLoadingService.cleanup();
      cacheService.cleanup();
      memoryService.cleanup();
    });

    it('should provide performance benefits', () => {
      const memoryService = new MemoryManagementService({
        enableAutoCleanup: false,
        enablePerformanceMonitoring: false,
      });

      // Test memory management
      memoryService.cacheImage('large-image', 'large-data', 10 * 1024 * 1024); // 10MB
      
      const statsBefore = memoryService.getMemoryStats();
      expect(statsBefore.imageCache).toBeGreaterThan(0);

      // Clear cache should reduce memory usage
      memoryService.removeCachedImage('large-image');
      
      const statsAfter = memoryService.getMemoryStats();
      expect(statsAfter.imageCache).toBeLessThan(statsBefore.imageCache);

      memoryService.cleanup();
    });
  });
});