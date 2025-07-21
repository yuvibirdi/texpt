import { MemoryManagementService } from '../memoryManagementService';
import { fabric } from 'fabric';

// Mock fabric.js
jest.mock('fabric', () => ({
  fabric: {
    Canvas: jest.fn().mockImplementation(() => ({
      getObjects: jest.fn().mockReturnValue([]),
      getWidth: jest.fn().mockReturnValue(800),
      getHeight: jest.fn().mockReturnValue(600),
      getZoom: jest.fn().mockReturnValue(1),
      viewportTransform: [1, 0, 0, 1, 0, 0],
      add: jest.fn(),
      remove: jest.fn(),
    })),
  },
}));

// Mock PerformanceObserver
Object.defineProperty(global, 'PerformanceObserver', {
  writable: true,
  value: jest.fn().mockImplementation((callback) => ({
    observe: jest.fn(),
    disconnect: jest.fn(),
  })),
});

describe('MemoryManagementService', () => {
  let service: MemoryManagementService;
  let mockCanvas: any;

  beforeEach(() => {
    service = new MemoryManagementService({
      maxFabricObjects: 100,
      maxImageCacheSize: 10, // 10MB
      maxCompilationCacheSize: 5, // 5MB
      cleanupInterval: 1000, // 1 second
      gcThreshold: 50, // 50MB
      enableAutoCleanup: false, // Disable for testing
      enablePerformanceMonitoring: false, // Disable for testing
    });

    mockCanvas = new (fabric as any).Canvas();
  });

  afterEach(() => {
    service.cleanup();
  });

  describe('initialization', () => {
    it('should initialize with default options', () => {
      const newService = new MemoryManagementService();
      expect(newService).toBeDefined();
    });

    it('should initialize with custom options', () => {
      const customService = new MemoryManagementService({
        maxFabricObjects: 500,
        enableAutoCleanup: false,
      });
      expect(customService).toBeDefined();
    });
  });

  describe('canvas management', () => {
    it('should register canvas for memory management', () => {
      expect(() => service.registerCanvas(mockCanvas)).not.toThrow();
    });

    it('should unregister canvas', () => {
      service.registerCanvas(mockCanvas);
      expect(() => service.unregisterCanvas(mockCanvas)).not.toThrow();
    });
  });

  describe('image cache management', () => {
    it('should cache images', () => {
      const imageData = 'test-image-data';
      const size = 1024; // 1KB
      
      service.cacheImage('image-1', imageData, size);
      
      const cachedImage = service.getCachedImage('image-1');
      expect(cachedImage).toBe(imageData);
    });

    it('should return null for non-cached images', () => {
      const cachedImage = service.getCachedImage('non-existent');
      expect(cachedImage).toBeNull();
    });

    it('should remove cached images', () => {
      const imageData = 'test-image-data';
      const size = 1024;
      
      service.cacheImage('image-1', imageData, size);
      expect(service.getCachedImage('image-1')).toBe(imageData);
      
      service.removeCachedImage('image-1');
      expect(service.getCachedImage('image-1')).toBeNull();
    });

    it('should enforce cache size limits', () => {
      // Cache images that exceed the limit
      const largeImageSize = 6 * 1024 * 1024; // 6MB (exceeds 10MB limit when combined)
      
      service.cacheImage('image-1', 'data1', largeImageSize);
      service.cacheImage('image-2', 'data2', largeImageSize);
      
      // Should still work but may evict older entries
      expect(service.getCachedImage('image-2')).toBe('data2');
    });
  });

  describe('memory statistics', () => {
    it('should provide memory statistics', () => {
      service.registerCanvas(mockCanvas);
      
      const stats = service.getMemoryStats();
      
      expect(stats).toHaveProperty('fabricObjects');
      expect(stats).toHaveProperty('canvasMemory');
      expect(stats).toHaveProperty('imageCache');
      expect(stats).toHaveProperty('compilationCache');
      expect(stats).toHaveProperty('totalEstimated');
      expect(stats).toHaveProperty('gcSuggested');
      
      expect(typeof stats.fabricObjects).toBe('number');
      expect(typeof stats.canvasMemory).toBe('number');
      expect(typeof stats.imageCache).toBe('number');
      expect(typeof stats.totalEstimated).toBe('number');
      expect(typeof stats.gcSuggested).toBe('boolean');
    });

    it('should suggest garbage collection when memory is high', () => {
      // Cache large amount of data to trigger GC suggestion
      const largeSize = 60 * 1024 * 1024; // 60MB (exceeds 50MB threshold)
      service.cacheImage('large-image', 'large-data', largeSize);
      
      const stats = service.getMemoryStats();
      expect(stats.gcSuggested).toBe(true);
    });
  });

  describe('cleanup operations', () => {
    it('should perform manual cleanup', async () => {
      service.registerCanvas(mockCanvas);
      
      await expect(service.performCleanup()).resolves.not.toThrow();
    });

    it('should force cleanup even if recently cleaned', async () => {
      service.registerCanvas(mockCanvas);
      
      await service.performCleanup();
      await expect(service.performCleanup(true)).resolves.not.toThrow();
    });

    it('should force garbage collection', () => {
      expect(() => service.forceGarbageCollection()).not.toThrow();
    });
  });

  describe('memory monitoring', () => {
    it('should start memory monitoring', () => {
      expect(() => service.startMemoryMonitoring()).not.toThrow();
    });

    it('should get memory trend', () => {
      const trend = service.getMemoryTrend();
      expect(['increasing', 'decreasing', 'stable']).toContain(trend);
    });
  });

  describe('cleanup tasks', () => {
    it('should add custom cleanup tasks', () => {
      const customTask = {
        id: 'custom-task',
        name: 'Custom Cleanup Task',
        priority: 5,
        estimatedMemorySaved: 1024,
        execute: jest.fn().mockResolvedValue(undefined),
      };
      
      expect(() => service.addCleanupTask(customTask)).not.toThrow();
    });

    it('should remove cleanup tasks', () => {
      const customTask = {
        id: 'custom-task',
        name: 'Custom Cleanup Task',
        priority: 5,
        estimatedMemorySaved: 1024,
        execute: jest.fn().mockResolvedValue(undefined),
      };
      
      service.addCleanupTask(customTask);
      expect(() => service.removeCleanupTask('custom-task')).not.toThrow();
    });

    it('should execute custom cleanup tasks during cleanup', async () => {
      const mockExecute = jest.fn().mockResolvedValue(undefined);
      const customTask = {
        id: 'custom-task',
        name: 'Custom Cleanup Task',
        priority: 10, // High priority
        estimatedMemorySaved: 1024,
        execute: mockExecute,
      };
      
      service.addCleanupTask(customTask);
      await service.performCleanup(true);
      
      expect(mockExecute).toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('should cleanup all resources', () => {
      service.registerCanvas(mockCanvas);
      service.cacheImage('image-1', 'data', 1024);
      
      expect(() => service.cleanup()).not.toThrow();
      
      // Should clear cached images
      expect(service.getCachedImage('image-1')).toBeNull();
    });
  });
});