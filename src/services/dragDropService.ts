import { fabric } from 'fabric';
import { SlideElement, Position, Size, ElementType } from '../types/presentation';

export interface DragDropState {
  isDragging: boolean;
  dragType: 'element' | 'toolbar' | 'file' | null;
  dragData: any;
  dragPreview: HTMLElement | null;
  snapToGrid: boolean;
  gridSize: number;
  showSnapGuides: boolean;
}

export interface SnapGuide {
  type: 'horizontal' | 'vertical';
  position: number;
  elements: string[]; // IDs of elements that created this guide
}

export interface DragDropOptions {
  snapToGrid?: boolean;
  gridSize?: number;
  snapThreshold?: number;
  showSnapGuides?: boolean;
  enableZIndexManagement?: boolean;
}

export class DragDropService {
  private canvas: fabric.Canvas | null = null;
  private state: DragDropState = {
    isDragging: false,
    dragType: null,
    dragData: null,
    dragPreview: null,
    snapToGrid: true,
    gridSize: 10,
    showSnapGuides: true,
  };
  private options: Required<DragDropOptions> = {
    snapToGrid: true,
    gridSize: 10,
    snapThreshold: 5,
    showSnapGuides: true,
    enableZIndexManagement: true,
  };
  private snapGuides: SnapGuide[] = [];
  private snapGuideLines: fabric.Line[] = [];

  constructor(canvas: fabric.Canvas | null, options: DragDropOptions = {}) {
    this.canvas = canvas;
    this.options = { ...this.options, ...options };
    this.state.snapToGrid = this.options.snapToGrid;
    this.state.gridSize = this.options.gridSize;
    this.state.showSnapGuides = this.options.showSnapGuides;
  }

  // Update canvas reference
  setCanvas(canvas: fabric.Canvas | null) {
    this.canvas = canvas;
  }

  // Update options
  updateOptions(options: Partial<DragDropOptions>) {
    this.options = { ...this.options, ...options };
    this.state.snapToGrid = this.options.snapToGrid;
    this.state.gridSize = this.options.gridSize;
    this.state.showSnapGuides = this.options.showSnapGuides;
  }

  // Snap position to grid
  snapToGrid(position: Position): Position {
    if (!this.state.snapToGrid) return position;

    return {
      x: Math.round(position.x / this.state.gridSize) * this.state.gridSize,
      y: Math.round(position.y / this.state.gridSize) * this.state.gridSize,
    };
  }

  // Calculate snap guides based on existing elements
  calculateSnapGuides(elements: SlideElement[], excludeIds: string[] = []): SnapGuide[] {
    const guides: SnapGuide[] = [];
    const filteredElements = elements.filter(el => !excludeIds.includes(el.id));

    // Create horizontal guides (for vertical alignment)
    const horizontalPositions = new Map<number, string[]>();
    filteredElements.forEach(element => {
      const top = element.position.y;
      const centerY = element.position.y + element.size.height / 2;
      const bottom = element.position.y + element.size.height;

      [top, centerY, bottom].forEach(pos => {
        const rounded = Math.round(pos);
        if (!horizontalPositions.has(rounded)) {
          horizontalPositions.set(rounded, []);
        }
        horizontalPositions.get(rounded)!.push(element.id);
      });
    });

    // Create vertical guides (for horizontal alignment)
    const verticalPositions = new Map<number, string[]>();
    filteredElements.forEach(element => {
      const left = element.position.x;
      const centerX = element.position.x + element.size.width / 2;
      const right = element.position.x + element.size.width;

      [left, centerX, right].forEach(pos => {
        const rounded = Math.round(pos);
        if (!verticalPositions.has(rounded)) {
          verticalPositions.set(rounded, []);
        }
        verticalPositions.get(rounded)!.push(element.id);
      });
    });

    // Convert to guides
    horizontalPositions.forEach((elementIds, position) => {
      guides.push({
        type: 'horizontal',
        position,
        elements: elementIds,
      });
    });

    verticalPositions.forEach((elementIds, position) => {
      guides.push({
        type: 'vertical',
        position,
        elements: elementIds,
      });
    });

    return guides;
  }

  // Find nearest snap position
  findSnapPosition(
    position: Position,
    size: Size,
    elements: SlideElement[],
    excludeIds: string[] = []
  ): { position: Position; guides: SnapGuide[] } {
    if (!this.state.showSnapGuides) {
      return { position: this.snapToGrid(position), guides: [] };
    }

    const guides = this.calculateSnapGuides(elements, excludeIds);
    let snappedPosition = { ...position };
    const activeGuides: SnapGuide[] = [];

    const elementCenterX = position.x + size.width / 2;
    const elementCenterY = position.y + size.height / 2;
    const elementRight = position.x + size.width;
    const elementBottom = position.y + size.height;

    // Check horizontal snapping (vertical guides)
    for (const guide of guides.filter(g => g.type === 'vertical')) {
      const distances = [
        { pos: guide.position, offset: 0 }, // Left edge
        { pos: guide.position - size.width / 2, offset: size.width / 2 }, // Center
        { pos: guide.position - size.width, offset: size.width }, // Right edge
      ];

      for (const { pos, offset } of distances) {
        if (Math.abs(position.x - pos) <= this.options.snapThreshold) {
          snappedPosition.x = pos;
          activeGuides.push(guide);
          break;
        }
      }
    }

    // Check vertical snapping (horizontal guides)
    for (const guide of guides.filter(g => g.type === 'horizontal')) {
      const distances = [
        { pos: guide.position, offset: 0 }, // Top edge
        { pos: guide.position - size.height / 2, offset: size.height / 2 }, // Center
        { pos: guide.position - size.height, offset: size.height }, // Bottom edge
      ];

      for (const { pos, offset } of distances) {
        if (Math.abs(position.y - pos) <= this.options.snapThreshold) {
          snappedPosition.y = pos;
          activeGuides.push(guide);
          break;
        }
      }
    }

    // Apply grid snapping if no guide snapping occurred
    if (activeGuides.length === 0) {
      snappedPosition = this.snapToGrid(snappedPosition);
    }

    return { position: snappedPosition, guides: activeGuides };
  }

  // Show snap guide lines on canvas
  showSnapGuides(guides: SnapGuide[]) {
    if (!this.canvas || !this.state.showSnapGuides) return;

    this.hideSnapGuides();

    guides.forEach(guide => {
      let line: fabric.Line;
      
      if (guide.type === 'horizontal') {
        line = new fabric.Line([0, guide.position, this.canvas!.width!, guide.position], {
          stroke: '#3b82f6',
          strokeWidth: 1,
          strokeDashArray: [5, 5],
          selectable: false,
          evented: false,
          excludeFromExport: true,
        });
      } else {
        line = new fabric.Line([guide.position, 0, guide.position, this.canvas!.height!], {
          stroke: '#3b82f6',
          strokeWidth: 1,
          strokeDashArray: [5, 5],
          selectable: false,
          evented: false,
          excludeFromExport: true,
        });
      }

      if (this.canvas) {
        this.canvas.add(line);
      }
      this.snapGuideLines.push(line);
    });

    if (this.canvas) {
      this.canvas.renderAll();
    }
  }

  // Hide snap guide lines
  hideSnapGuides() {
    if (!this.canvas) return;

    this.snapGuideLines.forEach(line => {
      this.canvas!.remove(line);
    });
    this.snapGuideLines = [];
    this.canvas.renderAll();
  }

  // Start dragging operation
  startDrag(type: DragDropState['dragType'], data: any, preview?: HTMLElement) {
    this.state.isDragging = true;
    this.state.dragType = type;
    this.state.dragData = data;
    this.state.dragPreview = preview || null;
  }

  // End dragging operation
  endDrag() {
    this.state.isDragging = false;
    this.state.dragType = null;
    this.state.dragData = null;
    this.state.dragPreview = null;
    this.hideSnapGuides();
  }

  // Get current drag state
  getDragState(): DragDropState {
    return { ...this.state };
  }

  // Handle element z-index management
  bringToFront(fabricObject: fabric.Object) {
    if (!this.canvas || !this.options.enableZIndexManagement) return;
    
    this.canvas.bringToFront(fabricObject);
    this.canvas.renderAll();
  }

  sendToBack(fabricObject: fabric.Object) {
    if (!this.canvas || !this.options.enableZIndexManagement) return;
    
    this.canvas.sendToBack(fabricObject);
    this.canvas.renderAll();
  }

  bringForward(fabricObject: fabric.Object) {
    if (!this.canvas || !this.options.enableZIndexManagement) return;
    
    this.canvas.bringForward(fabricObject);
    this.canvas.renderAll();
  }

  sendBackwards(fabricObject: fabric.Object) {
    if (!this.canvas || !this.options.enableZIndexManagement) return;
    
    this.canvas.sendBackwards(fabricObject);
    this.canvas.renderAll();
  }

  // Get element z-index
  getElementZIndex(fabricObject: fabric.Object): number {
    if (!this.canvas) return 0;
    
    const objects = this.canvas.getObjects();
    return objects.indexOf(fabricObject);
  }

  // Set element z-index
  setElementZIndex(fabricObject: fabric.Object, zIndex: number) {
    if (!this.canvas || !this.options.enableZIndexManagement) return;
    
    const objects = this.canvas.getObjects();
    const currentIndex = objects.indexOf(fabricObject);
    
    if (currentIndex === -1) return;
    
    // Clamp zIndex to valid range
    const targetIndex = Math.max(0, Math.min(objects.length - 1, zIndex));
    
    if (currentIndex === targetIndex) return;
    
    // Move object to new position
    this.canvas.remove(fabricObject);
    objects.splice(currentIndex, 1);
    objects.splice(targetIndex, 0, fabricObject);
    
    // Re-add all objects in new order
    this.canvas.clear();
    objects.forEach(obj => this.canvas!.add(obj));
    this.canvas.renderAll();
  }

  // Create drag preview element
  createDragPreview(element: HTMLElement, type: ElementType): HTMLElement {
    const preview = element.cloneNode(true) as HTMLElement;
    preview.style.position = 'fixed';
    preview.style.pointerEvents = 'none';
    preview.style.zIndex = '9999';
    preview.style.opacity = '0.7';
    preview.style.transform = 'scale(0.8)';
    preview.style.border = '2px dashed #3b82f6';
    preview.style.borderRadius = '4px';
    preview.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
    
    // Add type indicator
    const typeIndicator = document.createElement('div');
    typeIndicator.textContent = type.toUpperCase();
    typeIndicator.style.position = 'absolute';
    typeIndicator.style.top = '-20px';
    typeIndicator.style.left = '0';
    typeIndicator.style.fontSize = '10px';
    typeIndicator.style.fontWeight = 'bold';
    typeIndicator.style.color = '#3b82f6';
    typeIndicator.style.backgroundColor = 'white';
    typeIndicator.style.padding = '2px 6px';
    typeIndicator.style.borderRadius = '2px';
    typeIndicator.style.border = '1px solid #3b82f6';
    
    preview.appendChild(typeIndicator);
    
    return preview;
  }

  // Update drag preview position
  updateDragPreview(x: number, y: number) {
    if (this.state.dragPreview) {
      this.state.dragPreview.style.left = `${x + 10}px`;
      this.state.dragPreview.style.top = `${y + 10}px`;
    }
  }

  // Validate drop target
  isValidDropTarget(target: EventTarget | null, allowedTypes: ElementType[]): boolean {
    if (!target) return false;
    
    const element = target as HTMLElement;
    const canvas = element.closest('canvas');
    const canvasWrapper = element.closest('.canvas-wrapper');
    
    return !!(canvas || canvasWrapper);
  }

  // Handle file validation for drag and drop
  validateDroppedFiles(files: FileList): { valid: File[]; invalid: File[] } {
    const valid: File[] = [];
    const invalid: File[] = [];
    
    Array.from(files).forEach(file => {
      if (this.isValidFileType(file)) {
        valid.push(file);
      } else {
        invalid.push(file);
      }
    });
    
    return { valid, invalid };
  }

  // Check if file type is supported
  private isValidFileType(file: File): boolean {
    const supportedTypes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/gif',
      'image/svg+xml',
      'image/webp',
      'image/bmp',
      'application/pdf', // For future PDF import
    ];
    
    return supportedTypes.includes(file.type);
  }

  // Constrain position to canvas bounds
  constrainToCanvas(position: Position, size: Size, canvasSize: { width: number; height: number }): Position {
    return {
      x: Math.max(0, Math.min(canvasSize.width - size.width, position.x)),
      y: Math.max(0, Math.min(canvasSize.height - size.height, position.y)),
    };
  }

  // Calculate drop position from event
  getDropPosition(event: DragEvent, canvasElement: HTMLCanvasElement): Position {
    const rect = canvasElement.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }
}

// Export singleton instance
export const dragDropService = new DragDropService(null);