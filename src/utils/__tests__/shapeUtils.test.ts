import { fabric } from 'fabric';
import {
  createFabricShape,
  generateConnectionPoints,
  fabricObjectToSlideElement,
  getConnectionPointPosition,
  findClosestConnectionPoint,
} from '../shapeUtils';
import { ShapeType, SlideElement } from '../../types/presentation';

// Mock fabric.js
jest.mock('fabric', () => ({
  fabric: {
    Rect: jest.fn().mockImplementation((options) => ({ type: 'rect', ...options })),
    Circle: jest.fn().mockImplementation((options) => ({ type: 'circle', ...options })),
    Ellipse: jest.fn().mockImplementation((options) => ({ type: 'ellipse', ...options })),
    Triangle: jest.fn().mockImplementation((options) => ({ type: 'triangle', ...options })),
    Polygon: jest.fn().mockImplementation((options) => ({ type: 'polygon', ...options })),
    Line: jest.fn().mockImplementation((options) => ({ type: 'line', ...options })),
    Group: jest.fn().mockImplementation((objects, options) => ({ type: 'group', objects, ...options })),
  },
}));

describe('shapeUtils', () => {
  describe('createFabricShape', () => {
    test('creates rectangle shape', () => {
      const shape = createFabricShape('rectangle', 10, 20, 110, 120);
      
      expect(fabric.Rect).toHaveBeenCalledWith({
        left: 10,
        top: 20,
        width: 100,
        height: 100,
        fill: '#cccccc',
        stroke: '#000000',
        strokeWidth: 2,
      });
    });

    test('creates circle shape', () => {
      const shape = createFabricShape('circle', 10, 20, 110, 120);
      
      expect(fabric.Circle).toHaveBeenCalledWith({
        left: 10,
        top: 20,
        radius: 50,
        fill: '#cccccc',
        stroke: '#000000',
        strokeWidth: 2,
      });
    });

    test('creates line shape', () => {
      const shape = createFabricShape('line', 10, 20, 110, 120);
      
      expect(fabric.Line).toHaveBeenCalledWith([10, 20, 110, 120], {
        stroke: '#000000',
        strokeWidth: 2,
        selectable: true,
      });
    });

    test('applies custom properties', () => {
      const properties = {
        fillColor: { r: 255, g: 0, b: 0 },
        strokeColor: { r: 0, g: 255, b: 0 },
        strokeWidth: 5,
      };

      const shape = createFabricShape('rectangle', 0, 0, 100, 100, properties);
      
      expect(fabric.Rect).toHaveBeenCalledWith({
        left: 0,
        top: 0,
        width: 100,
        height: 100,
        fill: 'rgba(255, 0, 0, 1)',
        stroke: 'rgba(0, 255, 0, 1)',
        strokeWidth: 5,
      });
    });
  });

  describe('generateConnectionPoints', () => {
    test('generates connection points for rectangle', () => {
      const points = generateConnectionPoints('rectangle');
      
      expect(points).toHaveLength(4);
      expect(points).toEqual([
        { id: 'top', x: 0.5, y: 0, type: 'bidirectional' },
        { id: 'right', x: 1, y: 0.5, type: 'bidirectional' },
        { id: 'bottom', x: 0.5, y: 1, type: 'bidirectional' },
        { id: 'left', x: 0, y: 0.5, type: 'bidirectional' },
      ]);
    });

    test('generates connection points for circle', () => {
      const points = generateConnectionPoints('circle');
      
      expect(points).toHaveLength(8);
      expect(points[0]).toEqual({ id: 'top', x: 0.5, y: 0, type: 'bidirectional' });
      expect(points[2]).toEqual({ id: 'right', x: 1, y: 0.5, type: 'bidirectional' });
    });

    test('generates connection points for line', () => {
      const points = generateConnectionPoints('line');
      
      expect(points).toHaveLength(2);
      expect(points).toEqual([
        { id: 'start', x: 0, y: 0, type: 'input' },
        { id: 'end', x: 1, y: 1, type: 'output' },
      ]);
    });
  });

  describe('fabricObjectToSlideElement', () => {
    test('converts fabric object to slide element', () => {
      const mockFabricObject = {
        getBoundingRect: () => ({ left: 10, top: 20, width: 100, height: 80 }),
        fill: 'rgba(255, 0, 0, 1)',
        stroke: 'rgba(0, 255, 0, 1)',
        strokeWidth: 3,
        opacity: 0.8,
        angle: 45,
      };

      const element = fabricObjectToSlideElement(mockFabricObject as any, 'rectangle');
      
      expect(element.type).toBe('shape');
      expect(element.position).toEqual({ x: 10, y: 20 });
      expect(element.size).toEqual({ width: 100, height: 80 });
      expect(element.properties.shapeType).toBe('rectangle');
      expect(element.properties.fillColor).toEqual({ r: 255, g: 0, b: 0, a: 1 });
      expect(element.properties.strokeColor).toEqual({ r: 0, g: 255, b: 0, a: 1 });
      expect(element.properties.strokeWidth).toBe(3);
      expect(element.properties.opacity).toBe(0.8);
      expect(element.properties.rotation).toBe(45);
    });
  });

  describe('getConnectionPointPosition', () => {
    test('calculates absolute position of connection point', () => {
      const element: SlideElement = {
        id: 'test-element',
        type: 'shape',
        position: { x: 100, y: 200 },
        size: { width: 200, height: 100 },
        properties: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const connectionPoint = { id: 'center', x: 0.5, y: 0.5, type: 'bidirectional' as const };
      
      const position = getConnectionPointPosition(element, connectionPoint);
      
      expect(position).toEqual({ x: 200, y: 250 }); // 100 + 200*0.5, 200 + 100*0.5
    });
  });

  describe('findClosestConnectionPoint', () => {
    test('finds closest connection point within distance', () => {
      const element: SlideElement = {
        id: 'test-element',
        type: 'shape',
        position: { x: 100, y: 100 },
        size: { width: 100, height: 100 },
        properties: {
          connectionPoints: [
            { id: 'top', x: 0.5, y: 0, type: 'bidirectional' },
            { id: 'bottom', x: 0.5, y: 1, type: 'bidirectional' },
          ],
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Target point close to top connection point (150, 100)
      const closestPoint = findClosestConnectionPoint(element, 155, 105, 20);
      
      expect(closestPoint).toEqual({ id: 'top', x: 0.5, y: 0, type: 'bidirectional' });
    });

    test('returns null when no connection point is within distance', () => {
      const element: SlideElement = {
        id: 'test-element',
        type: 'shape',
        position: { x: 100, y: 100 },
        size: { width: 100, height: 100 },
        properties: {
          connectionPoints: [
            { id: 'top', x: 0.5, y: 0, type: 'bidirectional' },
          ],
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Target point far from any connection point
      const closestPoint = findClosestConnectionPoint(element, 300, 300, 20);
      
      expect(closestPoint).toBeNull();
    });

    test('returns null when element has no connection points', () => {
      const element: SlideElement = {
        id: 'test-element',
        type: 'shape',
        position: { x: 100, y: 100 },
        size: { width: 100, height: 100 },
        properties: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const closestPoint = findClosestConnectionPoint(element, 150, 150, 20);
      
      expect(closestPoint).toBeNull();
    });
  });
});