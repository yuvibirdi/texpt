import { CanvasVirtualizationService } from '../canvasVirtualizationService';
import { SlideElement } from '../../types/presentation';
import { fabric } from 'fabric';

// Mock fabric.js
jest.mock('fabric', () => ({
  fabric: {
    Canvas: jest.fn().mockImplementation(() => ({
      getWidth: jest.fn().mockReturnValue(800),
      getHeight: jest.fn().mockReturnValue(600),
      getZoom: jest.fn().mockReturnValue(1),
      viewportTransform: [1, 0, 0, 1, 0, 0],
      on: jest.fn(),
      add: jest.fn(),
      remove: jest.fn(),
    })),
    Textbox: jest.fn(),
    Rect: jest.fn(),
    Image: {
      fromURL: jest.fn(),
    },
  },
}));

describe('CanvasVirtualizationService', () => {
  let service: CanvasVirtualizationService;
  let mockCanvas: any;

  beforeEach(() => {
    service = new CanvasVirtualizationService({
      viewportWidth: 800,
      viewportHeight: 600,
      bufferZone: 100,
      maxObjectsPerFrame: 5,
      enableCulling: true,
      enableLOD: true,
    });

    mockCanvas = new (fabric as any).Canvas();
    service.initialize(mockCanvas);
  });

  afterEach(() => {
    service.cleanup();
  });

  describe('initialization', () => {
    it('should initialize with default options', () => {
      const newService = new CanvasVirtualizationService();
      expect(newService).toBeDefined();
    });

    it('should initialize with custom options', () => {
      const customService = new CanvasVirtualizationService({
        maxObjectsPerFrame: 20,
        enableCulling: false,
      });
      expect(customService).toBeDefined();
    });
  });

  describe('element management', () => {
    it('should update elements for virtualization', () => {
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
        {
          id: 'element-2',
          type: 'shape',
          position: { x: 300, y: 200 },
          size: { width: 100, height: 100 },
          properties: { shapeType: 'rectangle' },
          content: '',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      service.updateElements(elements);
      const stats = service.getStats();
      
      expect(stats.totalObjects).toBe(2);
    });

    it('should remove elements that no longer exist', () => {
      const initialElements: SlideElement[] = [
        {
          id: 'element-1',
          type: 'text',
          position: { x: 100, y: 100 },
          size: { width: 200, height: 50 },
          properties: {},
          content: 'Test text',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      service.updateElements(initialElements);
      expect(service.getStats().totalObjects).toBe(1);

      // Update with empty array
      service.updateElements([]);
      expect(service.getStats().totalObjects).toBe(0);
    });
  });

  describe('viewport management', () => {
    it('should handle viewport changes', () => {
      const elements: SlideElement[] = [
        {
          id: 'element-1',
          type: 'text',
          position: { x: 100, y: 100 },
          size: { width: 200, height: 50 },
          properties: {},
          content: 'Test text',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      service.updateElements(elements);
      service.onViewportChange();
      
      // Should not throw errors
      expect(service.getStats().totalObjects).toBe(1);
    });
  });

  describe('performance statistics', () => {
    it('should provide performance statistics', () => {
      const stats = service.getStats();
      
      expect(stats).toHaveProperty('totalObjects');
      expect(stats).toHaveProperty('visibleObjects');
      expect(stats).toHaveProperty('renderedObjects');
      expect(stats).toHaveProperty('memoryUsage');
      
      expect(typeof stats.totalObjects).toBe('number');
      expect(typeof stats.visibleObjects).toBe('number');
      expect(typeof stats.renderedObjects).toBe('number');
      expect(typeof stats.memoryUsage).toBe('number');
    });

    it('should track memory usage', () => {
      const elements: SlideElement[] = [
        {
          id: 'element-1',
          type: 'text',
          position: { x: 100, y: 100 },
          size: { width: 200, height: 50 },
          properties: {},
          content: 'Test text',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      service.updateElements(elements);
      const stats = service.getStats();
      
      expect(stats.memoryUsage).toBeGreaterThan(0);
    });
  });

  describe('cleanup', () => {
    it('should cleanup resources properly', () => {
      const elements: SlideElement[] = [
        {
          id: 'element-1',
          type: 'text',
          position: { x: 100, y: 100 },
          size: { width: 200, height: 50 },
          properties: {},
          content: 'Test text',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      service.updateElements(elements);
      expect(service.getStats().totalObjects).toBe(1);

      service.cleanup();
      expect(service.getStats().totalObjects).toBe(0);
    });
  });

  describe('force update', () => {
    it('should force update all objects', () => {
      const elements: SlideElement[] = [
        {
          id: 'element-1',
          type: 'text',
          position: { x: 100, y: 100 },
          size: { width: 200, height: 50 },
          properties: {},
          content: 'Test text',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      service.updateElements(elements);
      
      // Should not throw errors
      expect(() => service.forceUpdate()).not.toThrow();
    });
  });
});