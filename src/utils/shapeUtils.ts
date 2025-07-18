import { fabric } from 'fabric';
import { SlideElement, ShapeType, Color, ConnectionPoint } from '../types/presentation';

export interface ShapeDrawingState {
  isDrawing: boolean;
  startPoint: { x: number; y: number } | null;
  currentShape: fabric.Object | null;
}

// Create Fabric.js shape objects based on shape type
export const createFabricShape = (
  shapeType: ShapeType,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  properties: {
    fillColor?: Color;
    strokeColor?: Color;
    strokeWidth?: number;
  } = {}
): fabric.Object => {
  const width = Math.abs(endX - startX);
  const height = Math.abs(endY - startY);
  const left = Math.min(startX, endX);
  const top = Math.min(startY, endY);

  const defaultFill = properties.fillColor ? 
    `rgba(${properties.fillColor.r}, ${properties.fillColor.g}, ${properties.fillColor.b}, ${properties.fillColor.a || 1})` : 
    '#cccccc';
  
  const defaultStroke = properties.strokeColor ? 
    `rgba(${properties.strokeColor.r}, ${properties.strokeColor.g}, ${properties.strokeColor.b}, ${properties.strokeColor.a || 1})` : 
    '#000000';

  const strokeWidth = properties.strokeWidth || 2;

  switch (shapeType) {
    case 'rectangle':
      return new fabric.Rect({
        left,
        top,
        width,
        height,
        fill: defaultFill,
        stroke: defaultStroke,
        strokeWidth,
      });

    case 'circle':
      const radius = Math.min(width, height) / 2;
      return new fabric.Circle({
        left: left + width / 2 - radius,
        top: top + height / 2 - radius,
        radius,
        fill: defaultFill,
        stroke: defaultStroke,
        strokeWidth,
      });

    case 'ellipse':
      return new fabric.Ellipse({
        left: left + width / 2,
        top: top + height / 2,
        rx: width / 2,
        ry: height / 2,
        fill: defaultFill,
        stroke: defaultStroke,
        strokeWidth,
        originX: 'center',
        originY: 'center',
      });

    case 'triangle':
      const points = [
        { x: left + width / 2, y: top },
        { x: left, y: top + height },
        { x: left + width, y: top + height },
      ];
      return new fabric.Triangle({
        left: left + width / 2,
        top: top + height / 2,
        width,
        height,
        fill: defaultFill,
        stroke: defaultStroke,
        strokeWidth,
        originX: 'center',
        originY: 'center',
      });

    case 'diamond':
      const diamondPoints = [
        { x: left + width / 2, y: top },
        { x: left + width, y: top + height / 2 },
        { x: left + width / 2, y: top + height },
        { x: left, y: top + height / 2 },
      ];
      return new fabric.Polygon(diamondPoints, {
        fill: defaultFill,
        stroke: defaultStroke,
        strokeWidth,
      });

    case 'line':
      return new fabric.Line([startX, startY, endX, endY], {
        stroke: defaultStroke,
        strokeWidth,
        selectable: true,
      });

    case 'arrow':
      // Create arrow as a group with line and arrowhead
      const line = new fabric.Line([startX, startY, endX, endY], {
        stroke: defaultStroke,
        strokeWidth,
      });

      // Calculate arrowhead points
      const angle = Math.atan2(endY - startY, endX - startX);
      const arrowLength = 15;
      const arrowAngle = Math.PI / 6; // 30 degrees

      const arrowPoint1X = endX - arrowLength * Math.cos(angle - arrowAngle);
      const arrowPoint1Y = endY - arrowLength * Math.sin(angle - arrowAngle);
      const arrowPoint2X = endX - arrowLength * Math.cos(angle + arrowAngle);
      const arrowPoint2Y = endY - arrowLength * Math.sin(angle + arrowAngle);

      const arrowHead = new fabric.Polygon([
        { x: endX, y: endY },
        { x: arrowPoint1X, y: arrowPoint1Y },
        { x: arrowPoint2X, y: arrowPoint2Y },
      ], {
        fill: defaultStroke,
        stroke: defaultStroke,
        strokeWidth: 1,
      });

      return new fabric.Group([line, arrowHead], {
        selectable: true,
      });

    default:
      // Fallback to rectangle
      return new fabric.Rect({
        left,
        top,
        width,
        height,
        fill: defaultFill,
        stroke: defaultStroke,
        strokeWidth,
      });
  }
};

// Generate default connection points for different shape types
export const generateConnectionPoints = (shapeType: ShapeType): ConnectionPoint[] => {
  const basePoints: ConnectionPoint[] = [];

  switch (shapeType) {
    case 'rectangle':
    case 'diamond':
      return [
        { id: 'top', x: 0.5, y: 0, type: 'bidirectional' },
        { id: 'right', x: 1, y: 0.5, type: 'bidirectional' },
        { id: 'bottom', x: 0.5, y: 1, type: 'bidirectional' },
        { id: 'left', x: 0, y: 0.5, type: 'bidirectional' },
      ];

    case 'circle':
    case 'ellipse':
      return [
        { id: 'top', x: 0.5, y: 0, type: 'bidirectional' },
        { id: 'top-right', x: 0.85, y: 0.15, type: 'bidirectional' },
        { id: 'right', x: 1, y: 0.5, type: 'bidirectional' },
        { id: 'bottom-right', x: 0.85, y: 0.85, type: 'bidirectional' },
        { id: 'bottom', x: 0.5, y: 1, type: 'bidirectional' },
        { id: 'bottom-left', x: 0.15, y: 0.85, type: 'bidirectional' },
        { id: 'left', x: 0, y: 0.5, type: 'bidirectional' },
        { id: 'top-left', x: 0.15, y: 0.15, type: 'bidirectional' },
      ];

    case 'triangle':
      return [
        { id: 'top', x: 0.5, y: 0, type: 'bidirectional' },
        { id: 'bottom-right', x: 0.75, y: 1, type: 'bidirectional' },
        { id: 'bottom-left', x: 0.25, y: 1, type: 'bidirectional' },
      ];

    case 'line':
      return [
        { id: 'start', x: 0, y: 0, type: 'input' },
        { id: 'end', x: 1, y: 1, type: 'output' },
      ];

    case 'arrow':
      return [
        { id: 'start', x: 0, y: 0, type: 'input' },
        { id: 'end', x: 1, y: 1, type: 'output' },
      ];

    default:
      return [
        { id: 'center', x: 0.5, y: 0.5, type: 'bidirectional' },
      ];
  }
};

// Convert Fabric.js object back to SlideElement
export const fabricObjectToSlideElement = (
  fabricObject: fabric.Object,
  shapeType: ShapeType
): Omit<SlideElement, 'id' | 'createdAt' | 'updatedAt'> => {
  const bounds = fabricObject.getBoundingRect();
  
  return {
    type: 'shape',
    position: { x: bounds.left, y: bounds.top },
    size: { width: bounds.width, height: bounds.height },
    properties: {
      shapeType,
      fillColor: fabricObject.fill ? parseColorFromString(fabricObject.fill as string) : undefined,
      strokeColor: fabricObject.stroke ? parseColorFromString(fabricObject.stroke as string) : undefined,
      strokeWidth: fabricObject.strokeWidth || 1,
      opacity: fabricObject.opacity || 1,
      rotation: fabricObject.angle || 0,
      connectionPoints: generateConnectionPoints(shapeType),
    },
  };
};

// Helper function to parse color from string
const parseColorFromString = (colorString: string): Color | undefined => {
  if (colorString.startsWith('rgba')) {
    const match = colorString.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
    if (match) {
      return {
        r: parseInt(match[1]),
        g: parseInt(match[2]),
        b: parseInt(match[3]),
        a: parseFloat(match[4]),
      };
    }
  } else if (colorString.startsWith('rgb')) {
    const match = colorString.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (match) {
      return {
        r: parseInt(match[1]),
        g: parseInt(match[2]),
        b: parseInt(match[3]),
      };
    }
  } else if (colorString.startsWith('#')) {
    const hex = colorString.slice(1);
    if (hex.length === 6) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
      };
    }
  }
  return undefined;
};

// Calculate connection point absolute position
export const getConnectionPointPosition = (
  element: SlideElement,
  connectionPoint: ConnectionPoint
): { x: number; y: number } => {
  return {
    x: element.position.x + element.size.width * connectionPoint.x,
    y: element.position.y + element.size.height * connectionPoint.y,
  };
};

// Find the closest connection point to a given position
export const findClosestConnectionPoint = (
  element: SlideElement,
  targetX: number,
  targetY: number,
  maxDistance: number = 20
): ConnectionPoint | null => {
  if (!element.properties.connectionPoints) return null;

  let closestPoint: ConnectionPoint | null = null;
  let minDistance = maxDistance;

  for (const point of element.properties.connectionPoints) {
    const pointPos = getConnectionPointPosition(element, point);
    const distance = Math.sqrt(
      Math.pow(pointPos.x - targetX, 2) + Math.pow(pointPos.y - targetY, 2)
    );

    if (distance < minDistance) {
      minDistance = distance;
      closestPoint = point;
    }
  }

  return closestPoint;
};