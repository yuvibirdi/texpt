import { fabric } from 'fabric';
import { SlideElement } from '../types/presentation';

export interface VirtualizationOptions {
  viewportWidth: number;
  viewportHeight: number;
  bufferZone: number; // Extra area around viewport to render
  maxObjectsPerFrame: number; // Limit objects rendered per frame
  enableCulling: boolean; // Whether to cull off-screen objects
  enableLOD: boolean; // Level of detail optimization
}

export interface ViewportBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface VirtualizedObject {
  element: SlideElement;
  fabricObject: fabric.Object | null;
  isVisible: boolean;
  isInBuffer: boolean;
  lastRenderTime: number;
  priority: number; // Higher priority objects render first
}

/**
 * Canvas Virtualization Service
 * Optimizes canvas performance for large presentations by:
 * - Only rendering objects within the viewport
 * - Using level-of-detail for distant objects
 * - Batching object creation/destruction
 * - Managing memory usage
 */
export class CanvasVirtualizationService {
  private canvas: fabric.Canvas | null = null;
  private options: VirtualizationOptions;
  private virtualizedObjects: Map<string, VirtualizedObject> = new Map();
  private viewportBounds: ViewportBounds = { left: 0, top: 0, right: 0, bottom: 0 };
  private renderQueue: string[] = [];
  private destroyQueue: string[] = [];
  private isProcessingQueue = false;
  private frameId: number | null = null;
  private lastUpdateTime = 0;
  private readonly UPDATE_THROTTLE = 16; // ~60fps

  constructor(options: Partial<VirtualizationOptions> = {}) {
    this.options = {
      viewportWidth: 800,
      viewportHeight: 600,
      bufferZone: 200,
      maxObjectsPerFrame: 10,
      enableCulling: true,
      enableLOD: true,
      ...options,
    };
  }

  /**
   * Initialize virtualization for a canvas
   */
  public initialize(canvas: fabric.Canvas): void {
    this.canvas = canvas;
    this.updateViewportBounds();
    this.setupEventListeners();
  }

  /**
   * Update elements for virtualization
   */
  public updateElements(elements: SlideElement[]): void {
    // Remove elements that no longer exist
    const currentElementIds = new Set(elements.map(el => el.id));
    this.virtualizedObjects.forEach((virtualObj, id) => {
      if (!currentElementIds.has(id)) {
        this.removeVirtualizedObject(id);
      }
    });

    // Add or update elements
    elements.forEach(element => {
      this.updateVirtualizedObject(element);
    });

    this.scheduleUpdate();
  }

  /**
   * Handle canvas viewport changes (zoom, pan)
   */
  public onViewportChange(): void {
    this.updateViewportBounds();
    this.scheduleUpdate();
  }

  /**
   * Get performance statistics
   */
  public getStats(): {
    totalObjects: number;
    visibleObjects: number;
    renderedObjects: number;
    memoryUsage: number;
  } {
    const totalObjects = this.virtualizedObjects.size;
    const visibleObjects = Array.from(this.virtualizedObjects.values())
      .filter(obj => obj.isVisible).length;
    const renderedObjects = Array.from(this.virtualizedObjects.values())
      .filter(obj => obj.fabricObject !== null).length;

    return {
      totalObjects,
      visibleObjects,
      renderedObjects,
      memoryUsage: this.estimateMemoryUsage(),
    };
  }

  /**
   * Cleanup resources
   */
  public cleanup(): void {
    if (this.frameId) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }

    // Destroy all fabric objects
    this.virtualizedObjects.forEach((virtualObj) => {
      if (virtualObj.fabricObject && this.canvas) {
        this.canvas.remove(virtualObj.fabricObject);
      }
    });

    this.virtualizedObjects.clear();
    this.renderQueue = [];
    this.destroyQueue = [];
    this.canvas = null;
  }

  /**
   * Force update of all objects (useful after major changes)
   */
  public forceUpdate(): void {
    this.updateViewportBounds();
    this.updateVisibility();
    this.processQueues();
  }

  private setupEventListeners(): void {
    if (!this.canvas) return;

    // Listen for viewport changes
    this.canvas.on('after:render', () => {
      this.onViewportChange();
    });

    // Listen for zoom changes
    this.canvas.on('mouse:wheel', () => {
      this.scheduleUpdate();
    });
  }

  private updateViewportBounds(): void {
    if (!this.canvas) return;

    const zoom = this.canvas.getZoom();
    const vpt = this.canvas.viewportTransform;
    if (!vpt) return;

    const canvasWidth = this.canvas.getWidth();
    const canvasHeight = this.canvas.getHeight();

    // Calculate viewport bounds in canvas coordinates
    this.viewportBounds = {
      left: -vpt[4] / zoom - this.options.bufferZone,
      top: -vpt[5] / zoom - this.options.bufferZone,
      right: (-vpt[4] + canvasWidth) / zoom + this.options.bufferZone,
      bottom: (-vpt[5] + canvasHeight) / zoom + this.options.bufferZone,
    };
  }

  private updateVirtualizedObject(element: SlideElement): void {
    const existing = this.virtualizedObjects.get(element.id);
    
    if (existing) {
      // Update existing object
      existing.element = element;
      existing.priority = this.calculatePriority(element);
    } else {
      // Create new virtualized object
      const virtualObj: VirtualizedObject = {
        element,
        fabricObject: null,
        isVisible: false,
        isInBuffer: false,
        lastRenderTime: 0,
        priority: this.calculatePriority(element),
      };
      this.virtualizedObjects.set(element.id, virtualObj);
    }
  }

  private removeVirtualizedObject(elementId: string): void {
    const virtualObj = this.virtualizedObjects.get(elementId);
    if (virtualObj) {
      if (virtualObj.fabricObject && this.canvas) {
        this.canvas.remove(virtualObj.fabricObject);
      }
      this.virtualizedObjects.delete(elementId);
    }
  }

  private calculatePriority(element: SlideElement): number {
    // Higher priority for:
    // - Text elements (usually important)
    // - Larger elements
    // - Elements closer to center
    let priority = 0;

    if (element.type === 'text') priority += 10;
    if (element.type === 'image') priority += 5;
    
    // Size factor
    const area = element.size.width * element.size.height;
    priority += Math.min(area / 10000, 10);

    // Distance from center (lower distance = higher priority)
    const centerX = this.options.viewportWidth / 2;
    const centerY = this.options.viewportHeight / 2;
    const distance = Math.sqrt(
      Math.pow(element.position.x - centerX, 2) + 
      Math.pow(element.position.y - centerY, 2)
    );
    priority += Math.max(0, 20 - distance / 100);

    return priority;
  }

  private scheduleUpdate(): void {
    const now = Date.now();
    if (now - this.lastUpdateTime < this.UPDATE_THROTTLE) {
      return;
    }

    if (this.frameId) {
      cancelAnimationFrame(this.frameId);
    }

    this.frameId = requestAnimationFrame(() => {
      this.update();
      this.lastUpdateTime = Date.now();
      this.frameId = null;
    });
  }

  private update(): void {
    this.updateVisibility();
    this.processQueues();
  }

  private updateVisibility(): void {
    this.virtualizedObjects.forEach((virtualObj, id) => {
      const element = virtualObj.element;
      const wasVisible = virtualObj.isVisible;
      const wasInBuffer = virtualObj.isInBuffer;

      // Check if element intersects with viewport
      const isVisible = this.isElementVisible(element);
      const isInBuffer = this.isElementInBuffer(element);

      virtualObj.isVisible = isVisible;
      virtualObj.isInBuffer = isInBuffer;

      // Queue for rendering if became visible
      if (isInBuffer && !wasInBuffer && !virtualObj.fabricObject) {
        this.renderQueue.push(id);
      }

      // Queue for destruction if no longer in buffer
      if (!isInBuffer && wasInBuffer && virtualObj.fabricObject) {
        this.destroyQueue.push(id);
      }

      // Update LOD if enabled
      if (this.options.enableLOD && virtualObj.fabricObject) {
        this.updateLevelOfDetail(virtualObj, isVisible);
      }
    });
  }

  private isElementVisible(element: SlideElement): boolean {
    if (!this.options.enableCulling) return true;

    const bounds = this.viewportBounds;
    const elementBounds = {
      left: element.position.x,
      top: element.position.y,
      right: element.position.x + element.size.width,
      bottom: element.position.y + element.size.height,
    };

    return !(
      elementBounds.right < bounds.left ||
      elementBounds.left > bounds.right ||
      elementBounds.bottom < bounds.top ||
      elementBounds.top > bounds.bottom
    );
  }

  private isElementInBuffer(element: SlideElement): boolean {
    const bounds = this.viewportBounds;
    const elementBounds = {
      left: element.position.x,
      top: element.position.y,
      right: element.position.x + element.size.width,
      bottom: element.position.y + element.size.height,
    };

    return !(
      elementBounds.right < bounds.left ||
      elementBounds.left > bounds.right ||
      elementBounds.bottom < bounds.top ||
      elementBounds.top > bounds.bottom
    );
  }

  private updateLevelOfDetail(virtualObj: VirtualizedObject, isVisible: boolean): void {
    if (!virtualObj.fabricObject) return;

    const zoom = this.canvas?.getZoom() || 1;
    
    // Reduce detail for distant objects
    if (zoom < 0.5) {
      // Very zoomed out - use low detail
      virtualObj.fabricObject.set({
        strokeWidth: Math.max(1, (virtualObj.element.properties.strokeWidth || 1) * 0.5),
        shadow: undefined, // Remove shadows at low zoom
      });
    } else if (zoom < 1) {
      // Moderately zoomed out - medium detail
      virtualObj.fabricObject.set({
        strokeWidth: (virtualObj.element.properties.strokeWidth || 1) * 0.8,
      });
    } else {
      // Normal or zoomed in - full detail
      virtualObj.fabricObject.set({
        strokeWidth: virtualObj.element.properties.strokeWidth || 1,
      });
    }
  }

  private processQueues(): void {
    if (this.isProcessingQueue) return;
    this.isProcessingQueue = true;

    try {
      // Process destroy queue first to free memory
      this.processDestroyQueue();
      
      // Process render queue
      this.processRenderQueue();
    } finally {
      this.isProcessingQueue = false;
    }
  }

  private processRenderQueue(): void {
    if (!this.canvas || this.renderQueue.length === 0) return;

    // Sort by priority
    const sortedQueue = this.renderQueue
      .map(id => ({ id, priority: this.virtualizedObjects.get(id)?.priority || 0 }))
      .sort((a, b) => b.priority - a.priority)
      .slice(0, this.options.maxObjectsPerFrame);

    for (const { id } of sortedQueue) {
      const virtualObj = this.virtualizedObjects.get(id);
      if (virtualObj && !virtualObj.fabricObject) {
        this.createFabricObject(virtualObj);
      }
    }

    // Remove processed items
    this.renderQueue = this.renderQueue.filter(
      id => !sortedQueue.some(item => item.id === id)
    );
  }

  private processDestroyQueue(): void {
    if (!this.canvas || this.destroyQueue.length === 0) return;

    const itemsToProcess = this.destroyQueue.splice(0, this.options.maxObjectsPerFrame);

    for (const id of itemsToProcess) {
      const virtualObj = this.virtualizedObjects.get(id);
      if (virtualObj && virtualObj.fabricObject) {
        this.canvas.remove(virtualObj.fabricObject);
        virtualObj.fabricObject = null;
      }
    }
  }

  private createFabricObject(virtualObj: VirtualizedObject): void {
    if (!this.canvas) return;

    const element = virtualObj.element;
    let fabricObject: fabric.Object | null = null;

    // Create fabric object based on element type
    switch (element.type) {
      case 'text':
        fabricObject = new fabric.Textbox(element.content || '', {
          left: element.position.x,
          top: element.position.y,
          width: element.size.width,
          height: element.size.height,
          fontSize: element.properties.fontSize || 16,
          fontFamily: element.properties.fontFamily || 'Arial',
          fill: element.properties.textColor ? 
            `rgba(${element.properties.textColor.r}, ${element.properties.textColor.g}, ${element.properties.textColor.b}, ${element.properties.textColor.a || 1})` : 
            '#000000',
        });
        break;

      case 'shape':
        if (element.properties.shapeType === 'rectangle') {
          fabricObject = new fabric.Rect({
            left: element.position.x,
            top: element.position.y,
            width: element.size.width,
            height: element.size.height,
            fill: element.properties.fillColor ? 
              `rgba(${element.properties.fillColor.r}, ${element.properties.fillColor.g}, ${element.properties.fillColor.b}, ${element.properties.fillColor.a || 1})` : 
              'transparent',
            stroke: element.properties.strokeColor ? 
              `rgba(${element.properties.strokeColor.r}, ${element.properties.strokeColor.g}, ${element.properties.strokeColor.b}, ${element.properties.strokeColor.a || 1})` : 
              '#000000',
            strokeWidth: element.properties.strokeWidth || 1,
          });
        }
        break;

      case 'image':
        if (element.content) {
          fabric.Image.fromURL(element.content, (img) => {
            img.set({
              left: element.position.x,
              top: element.position.y,
              scaleX: element.size.width / (img.width || 1),
              scaleY: element.size.height / (img.height || 1),
            });
            img.data = { elementId: element.id };
            this.canvas?.add(img);
            virtualObj.fabricObject = img;
            virtualObj.lastRenderTime = Date.now();
          });
          return; // Early return for async image loading
        }
        break;
    }

    if (fabricObject) {
      fabricObject.data = { elementId: element.id };
      this.canvas.add(fabricObject);
      virtualObj.fabricObject = fabricObject;
      virtualObj.lastRenderTime = Date.now();
    }
  }

  private estimateMemoryUsage(): number {
    let usage = 0;
    
    this.virtualizedObjects.forEach((virtualObj) => {
      // Base object overhead
      usage += 1000; // ~1KB per virtualized object
      
      if (virtualObj.fabricObject) {
        // Fabric object overhead
        usage += 5000; // ~5KB per fabric object
        
        // Additional memory for different types
        switch (virtualObj.element.type) {
          case 'image':
            usage += virtualObj.element.size.width * virtualObj.element.size.height * 4; // RGBA
            break;
          case 'text':
            usage += (virtualObj.element.content?.length || 0) * 2; // UTF-16
            break;
        }
      }
    });
    
    return usage;
  }
}

// Export singleton instance
export const canvasVirtualizationService = new CanvasVirtualizationService();