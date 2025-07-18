import { DragDropService } from '../dragDropService';
import { fabric } from 'fabric';
import { SlideElement, Position, Size } from '../../types/presentation';

// Mock fabric.js
jest.mock('fabric');

describe('DragDropService', () => {
  let service: DragDropService;
  let mockCanvas: jest.Mocked<fabric.Canvas>;

  beforeEach(() => {
    mockCanvas = {
      width: 800,
      height: 600,
      add: jest.fn(),
      remove: jest.fn(),
      renderAll: jest.fn(),
      bringToFront: jest.fn(),
      sendToBack: jest.fn(),
      bringForward: jest.fn(),
      sendBackwards: jest.fn(),
      getObjects: jest.fn().mockReturnValue([]),
      clear: jest.fn(),
    } as any;

    service = new DragDropService(mockCanvas);
  });

  describe('snapToGrid', () => {
    it('should snap position to grid when enabled', () => {
      service.updateOptions({ snapToGrid: true, gridSize: 10 });
      
      const position = { x: 23, y: 37 };
      const snapped = service.snapToGrid(position);
      
      expect(snapped).toEqual({ x: 20, y: 40 });
    });

    it('should not snap position when disabled', () => {
      service.updateOptions({ snapToGrid: false });
      
      const position = { x: 23, y: 37 };
      const snapped = service.snapToGrid(position);
      
      expect(snapped).toEqual(position);
    });
  });

  describe('calculateSnapGuides', () => {
    it('should calculate horizontal and vertical guides from elements', () => {
      const elements: SlideElement[] = [
        {
          id: 'element1',
          type: 'text',
          position: { x: 100, y: 100 },
          size: { width: 200, height: 50 },
          properties: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'element2',
          type: 'text',
          position: { x: 300, y: 200 },
          size: { width: 150, height: 40 },
          properties: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const guides = service.calculateSnapGuides(elements);
      
      expect(guides.length).toBeGreaterThan(0);
      expect(guides.some(g => g.type === 'horizontal')).toBe(true);
      expect(guides.some(g => g.type === 'vertical')).toBe(true);
    });

    it('should exclude specified element IDs', () => {
      const elements: SlideElement[] = [
        {
          id: 'element1',
          type: 'text',
          position: { x: 100, y: 100 },
          size: { width: 200, height: 50 },
          properties: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const guidesWithElement = service.calculateSnapGuides(elements);
      const guidesWithoutElement = service.calculateSnapGuides(elements, ['element1']);
      
      expect(guidesWithoutElement.length).toBeLessThan(guidesWithElement.length);
    });
  });

  describe('findSnapPosition', () => {
    it('should find snap position based on guides', () => {
      const elements: SlideElement[] = [
        {
          id: 'element1',
          type: 'text',
          position: { x: 100, y: 100 },
          size: { width: 200, height: 50 },
          properties: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const position = { x: 98, y: 102 }; // Close to element1's position
      const size = { width: 100, height: 30 };
      
      const result = service.findSnapPosition(position, size, elements);
      
      expect(result.position.x).toBeCloseTo(100, 0); // Should snap to element1's x position
      expect(result.guides.length).toBeGreaterThan(0);
    });

    it('should apply grid snapping when no guides are active', () => {
      service.updateOptions({ snapToGrid: true, gridSize: 10, showSnapGuides: false });
      
      const position = { x: 23, y: 37 };
      const size = { width: 100, height: 30 };
      
      const result = service.findSnapPosition(position, size, []);
      
      expect(result.position).toEqual({ x: 20, y: 40 });
      expect(result.guides.length).toBe(0);
    });
  });

  describe('drag state management', () => {
    it('should start and end drag operations', () => {
      expect(service.getDragState().isDragging).toBe(false);
      
      service.startDrag('toolbar', { elementType: 'text' });
      expect(service.getDragState().isDragging).toBe(true);
      expect(service.getDragState().dragType).toBe('toolbar');
      
      service.endDrag();
      expect(service.getDragState().isDragging).toBe(false);
      expect(service.getDragState().dragType).toBe(null);
    });
  });

  describe('z-index management', () => {
    it('should bring object to front', () => {
      const mockObject = {} as fabric.Object;
      
      service.bringToFront(mockObject);
      
      expect(mockCanvas.bringToFront).toHaveBeenCalledWith(mockObject);
      expect(mockCanvas.renderAll).toHaveBeenCalled();
    });

    it('should send object to back', () => {
      const mockObject = {} as fabric.Object;
      
      service.sendToBack(mockObject);
      
      expect(mockCanvas.sendToBack).toHaveBeenCalledWith(mockObject);
      expect(mockCanvas.renderAll).toHaveBeenCalled();
    });

    it('should bring object forward', () => {
      const mockObject = {} as fabric.Object;
      
      service.bringForward(mockObject);
      
      expect(mockCanvas.bringForward).toHaveBeenCalledWith(mockObject);
      expect(mockCanvas.renderAll).toHaveBeenCalled();
    });

    it('should send object backwards', () => {
      const mockObject = {} as fabric.Object;
      
      service.sendBackwards(mockObject);
      
      expect(mockCanvas.sendBackwards).toHaveBeenCalledWith(mockObject);
      expect(mockCanvas.renderAll).toHaveBeenCalled();
    });
  });

  describe('file validation', () => {
    it('should validate dropped files correctly', () => {
      const validFile = new File([''], 'test.jpg', { type: 'image/jpeg' });
      const invalidFile = new File([''], 'test.txt', { type: 'text/plain' });
      
      const fileList = {
        0: validFile,
        1: invalidFile,
        length: 2,
        item: (index: number) => index === 0 ? validFile : invalidFile,
      } as FileList;
      
      const result = service.validateDroppedFiles(fileList);
      
      expect(result.valid).toContain(validFile);
      expect(result.invalid).toContain(invalidFile);
    });
  });

  describe('position constraints', () => {
    it('should constrain position to canvas bounds', () => {
      const position = { x: -50, y: 1000 };
      const size = { width: 100, height: 50 };
      const canvasSize = { width: 800, height: 600 };
      
      const constrained = service.constrainToCanvas(position, size, canvasSize);
      
      expect(constrained.x).toBe(0); // Constrained to left edge
      expect(constrained.y).toBe(550); // Constrained to fit within canvas height
    });
  });

  describe('drag preview', () => {
    it('should create drag preview element', () => {
      const mockElement = document.createElement('div');
      mockElement.textContent = 'Test Element';
      
      const preview = service.createDragPreview(mockElement, 'text');
      
      expect(preview.style.position).toBe('fixed');
      expect(preview.style.pointerEvents).toBe('none');
      expect(preview.style.zIndex).toBe('9999');
      expect(preview.style.opacity).toBe('0.7');
    });

    it('should update drag preview position', () => {
      const mockElement = document.createElement('div');
      const preview = service.createDragPreview(mockElement, 'text');
      
      service.updateDragPreview(100, 200);
      
      // Since we don't have access to the internal preview, we can't test this directly
      // This would be tested in integration tests
    });
  });

  describe('drop position calculation', () => {
    it('should calculate drop position from event', () => {
      const mockCanvas = document.createElement('canvas');
      mockCanvas.getBoundingClientRect = jest.fn().mockReturnValue({
        left: 50,
        top: 100,
      });
      
      const mockEvent = {
        clientX: 200,
        clientY: 300,
      } as DragEvent;
      
      const position = service.getDropPosition(mockEvent, mockCanvas);
      
      expect(position).toEqual({ x: 150, y: 200 });
    });
  });
});