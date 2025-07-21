import { LazyLoadingService } from '../lazyLoadingService';
import { Slide } from '../../types/presentation';

// Mock DOM APIs
Object.defineProperty(global, 'IntersectionObserver', {
  writable: true,
  value: jest.fn().mockImplementation((callback) => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  })),
});

Object.defineProperty(global, 'HTMLCanvasElement', {
  writable: true,
  value: jest.fn().mockImplementation(() => ({
    getContext: jest.fn().mockReturnValue({
      fillStyle: '',
      fillRect: jest.fn(),
      font: '',
      fillText: jest.fn(),
      measureText: jest.fn().mockReturnValue({ width: 100 }),
      drawImage: jest.fn(),
      clearRect: jest.fn(),
    }),
    toDataURL: jest.fn().mockReturnValue('data:image/png;base64,test'),
    width: 150,
    height: 100,
  })),
});

Object.defineProperty(global, 'Image', {
  writable: true,
  value: jest.fn().mockImplementation(() => ({
    onload: null,
    onerror: null,
    src: '',
    width: 100,
    height: 100,
  })),
});

describe('LazyLoadingService', () => {
  let service: LazyLoadingService;
  let mockSlide: Slide;

  beforeEach(() => {
    service = new LazyLoadingService({
      thumbnailSize: { width: 150, height: 100 },
      previewSize: { width: 800, height: 600 },
      cacheSize: 10,
      preloadDistance: 2,
      enableIntersectionObserver: true,
      debounceMs: 50,
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
  });

  afterEach(() => {
    service.cleanup();
  });

  describe('initialization', () => {
    it('should initialize with default options', () => {
      const newService = new LazyLoadingService();
      expect(newService).toBeDefined();
    });

    it('should initialize with custom options', () => {
      const customService = new LazyLoadingService({
        cacheSize: 20,
        enableIntersectionObserver: false,
      });
      expect(customService).toBeDefined();
    });
  });

  describe('thumbnail loading', () => {
    it('should load thumbnail for a slide', async () => {
      const thumbnailUrl = await service.loadThumbnail(mockSlide, 0);
      
      expect(thumbnailUrl).toBeDefined();
      expect(typeof thumbnailUrl).toBe('string');
      expect(thumbnailUrl).toContain('data:image');
    });

    it('should cache loaded thumbnails', async () => {
      const thumbnailUrl1 = await service.loadThumbnail(mockSlide, 0);
      const thumbnailUrl2 = await service.loadThumbnail(mockSlide, 0);
      
      expect(thumbnailUrl1).toBe(thumbnailUrl2);
      
      const stats = service.getCacheStats();
      expect(stats.thumbnails.count).toBe(1);
    });

    it('should handle loading errors gracefully', async () => {
      // Create a slide that might cause rendering issues
      const problematicSlide = {
        ...mockSlide,
        elements: [
          {
            id: 'element-1',
            type: 'image' as const,
            position: { x: 100, y: 100 },
            size: { width: 200, height: 150 },
            properties: {},
            content: 'invalid-image-url',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      };

      const thumbnailUrl = await service.loadThumbnail(problematicSlide, 0);
      
      // Should still return a result (might be null or placeholder)
      expect(thumbnailUrl).toBeDefined();
    });
  });

  describe('preview loading', () => {
    it('should load preview for a slide', async () => {
      const previewUrl = await service.loadPreview(mockSlide, 0);
      
      expect(previewUrl).toBeDefined();
      expect(typeof previewUrl).toBe('string');
      expect(previewUrl).toContain('data:image');
    });

    it('should cache loaded previews', async () => {
      const previewUrl1 = await service.loadPreview(mockSlide, 0);
      const previewUrl2 = await service.loadPreview(mockSlide, 0);
      
      expect(previewUrl1).toBe(previewUrl2);
      
      const stats = service.getCacheStats();
      expect(stats.previews.count).toBe(1);
    });
  });

  describe('preloading', () => {
    it('should preload thumbnails for slides around current index', () => {
      const slides = [mockSlide, { ...mockSlide, id: 'slide-2' }, { ...mockSlide, id: 'slide-3' }];
      
      // Should not throw errors
      expect(() => service.preloadThumbnails(slides, 1)).not.toThrow();
    });

    it('should preload previews for slides around current index', () => {
      const slides = [mockSlide, { ...mockSlide, id: 'slide-2' }, { ...mockSlide, id: 'slide-3' }];
      
      // Should not throw errors
      expect(() => service.preloadPreviews(slides, 1)).not.toThrow();
    });
  });

  describe('intersection observer', () => {
    it('should observe elements for lazy loading', () => {
      const mockElement = document.createElement('div');
      
      expect(() => service.observeElement(mockElement, 'slide-1', 'thumbnail')).not.toThrow();
    });

    it('should unobserve elements', () => {
      const mockElement = document.createElement('div');
      
      service.observeElement(mockElement, 'slide-1', 'thumbnail');
      expect(() => service.unobserveElement('slide-1', 'thumbnail')).not.toThrow();
    });
  });

  describe('cache management', () => {
    it('should provide cache statistics', () => {
      const stats = service.getCacheStats();
      
      expect(stats).toHaveProperty('thumbnails');
      expect(stats).toHaveProperty('previews');
      expect(stats).toHaveProperty('totalMemory');
      
      expect(stats.thumbnails).toHaveProperty('count');
      expect(stats.thumbnails).toHaveProperty('size');
      expect(stats.previews).toHaveProperty('count');
      expect(stats.previews).toHaveProperty('size');
    });

    it('should clear cache for specific slide', async () => {
      await service.loadThumbnail(mockSlide, 0);
      
      let stats = service.getCacheStats();
      expect(stats.thumbnails.count).toBe(1);
      
      service.clearSlideCache('slide-1');
      
      stats = service.getCacheStats();
      expect(stats.thumbnails.count).toBe(0);
    });

    it('should clear all caches', async () => {
      await service.loadThumbnail(mockSlide, 0);
      await service.loadPreview(mockSlide, 0);
      
      let stats = service.getCacheStats();
      expect(stats.thumbnails.count).toBe(1);
      expect(stats.previews.count).toBe(1);
      
      service.clearAllCaches();
      
      stats = service.getCacheStats();
      expect(stats.thumbnails.count).toBe(0);
      expect(stats.previews.count).toBe(0);
    });
  });

  describe('cleanup', () => {
    it('should cleanup resources properly', async () => {
      await service.loadThumbnail(mockSlide, 0);
      
      expect(() => service.cleanup()).not.toThrow();
      
      const stats = service.getCacheStats();
      expect(stats.thumbnails.count).toBe(0);
      expect(stats.previews.count).toBe(0);
    });
  });
});