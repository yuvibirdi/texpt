import { fabric } from 'fabric';

export interface MemoryStats {
  fabricObjects: number;
  canvasMemory: number;
  imageCache: number;
  compilationCache: number;
  totalEstimated: number;
  gcSuggested: boolean;
}

export interface MemoryOptions {
  maxFabricObjects: number;
  maxImageCacheSize: number; // MB
  maxCompilationCacheSize: number; // MB
  cleanupInterval: number; // milliseconds
  gcThreshold: number; // MB - when to suggest garbage collection
  enableAutoCleanup: boolean;
  enablePerformanceMonitoring: boolean;
}

export interface CleanupTask {
  id: string;
  name: string;
  priority: number;
  estimatedMemorySaved: number;
  execute: () => Promise<void>;
}

/**
 * Memory Management Service
 * Manages memory usage during long editing sessions by:
 * - Monitoring memory consumption
 * - Cleaning up unused resources
 * - Managing object lifecycles
 * - Triggering garbage collection when needed
 */
export class MemoryManagementService {
  private options: MemoryOptions;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private performanceObserver: PerformanceObserver | null = null;
  private fabricCanvases = new Set<fabric.Canvas>();
  private imageCache = new Map<string, { data: any; size: number; lastAccessed: number }>();
  private cleanupTasks: CleanupTask[] = [];
  private memoryHistory: number[] = [];
  private lastCleanupTime = 0;

  constructor(options: Partial<MemoryOptions> = {}) {
    this.options = {
      maxFabricObjects: 1000,
      maxImageCacheSize: 100, // 100MB
      maxCompilationCacheSize: 50, // 50MB
      cleanupInterval: 30000, // 30 seconds
      gcThreshold: 200, // 200MB
      enableAutoCleanup: true,
      enablePerformanceMonitoring: true,
      ...options,
    };

    this.initialize();
  }

  /**
   * Register a Fabric.js canvas for memory management
   */
  public registerCanvas(canvas: fabric.Canvas): void {
    this.fabricCanvases.add(canvas);
    this.setupCanvasCleanup(canvas);
  }

  /**
   * Unregister a Fabric.js canvas
   */
  public unregisterCanvas(canvas: fabric.Canvas): void {
    this.fabricCanvases.delete(canvas);
  }

  /**
   * Add an image to the managed cache
   */
  public cacheImage(key: string, data: any, size: number): void {
    this.imageCache.set(key, {
      data,
      size,
      lastAccessed: Date.now(),
    });

    this.enforceImageCacheLimit();
  }

  /**
   * Get an image from the managed cache
   */
  public getCachedImage(key: string): any | null {
    const cached = this.imageCache.get(key);
    if (cached) {
      cached.lastAccessed = Date.now();
      return cached.data;
    }
    return null;
  }

  /**
   * Remove an image from the cache
   */
  public removeCachedImage(key: string): void {
    this.imageCache.delete(key);
  }

  /**
   * Get current memory statistics
   */
  public getMemoryStats(): MemoryStats {
    const fabricObjects = this.countFabricObjects();
    const canvasMemory = this.estimateCanvasMemory();
    const imageCache = this.calculateImageCacheSize();
    const compilationCache = this.estimateCompilationCacheSize();
    const totalEstimated = canvasMemory + imageCache + compilationCache;

    return {
      fabricObjects,
      canvasMemory,
      imageCache,
      compilationCache,
      totalEstimated,
      gcSuggested: totalEstimated > this.options.gcThreshold * 1024 * 1024,
    };
  }

  /**
   * Perform manual cleanup
   */
  public async performCleanup(force: boolean = false): Promise<void> {
    const now = Date.now();
    
    if (!force && now - this.lastCleanupTime < this.options.cleanupInterval) {
      return;
    }

    console.log('Starting memory cleanup...');
    
    // Execute cleanup tasks in priority order
    const sortedTasks = [...this.cleanupTasks].sort((a, b) => b.priority - a.priority);
    
    for (const task of sortedTasks) {
      try {
        await task.execute();
        console.log(`Completed cleanup task: ${task.name}`);
      } catch (error) {
        console.error(`Failed to execute cleanup task ${task.name}:`, error);
      }
    }

    this.lastCleanupTime = now;
    console.log('Memory cleanup completed');
  }

  /**
   * Force garbage collection (if available)
   */
  public forceGarbageCollection(): void {
    // In browser environments, we can't directly trigger GC
    // But we can help by nullifying references and creating memory pressure
    
    // Clear temporary references
    this.clearTemporaryReferences();
    
    // Create memory pressure to encourage GC
    if (typeof window !== 'undefined' && 'gc' in window) {
      // @ts-ignore - gc is not in standard Window interface
      window.gc();
    } else {
      // Fallback: create and release memory pressure
      this.createMemoryPressure();
    }
  }

  /**
   * Monitor memory usage over time
   */
  public startMemoryMonitoring(): void {
    if (!this.options.enablePerformanceMonitoring) return;

    const monitor = () => {
      const stats = this.getMemoryStats();
      this.memoryHistory.push(stats.totalEstimated);
      
      // Keep only last 100 measurements
      if (this.memoryHistory.length > 100) {
        this.memoryHistory.shift();
      }

      // Check for memory leaks (consistently increasing memory)
      if (this.memoryHistory.length >= 10) {
        const recent = this.memoryHistory.slice(-10);
        const isIncreasing = recent.every((val, i) => i === 0 || val >= recent[i - 1]);
        
        if (isIncreasing && stats.totalEstimated > this.options.gcThreshold * 1024 * 1024) {
          console.warn('Potential memory leak detected, performing cleanup');
          this.performCleanup(true);
        }
      }
    };

    // Monitor every 10 seconds
    setInterval(monitor, 10000);
  }

  /**
   * Add a custom cleanup task
   */
  public addCleanupTask(task: CleanupTask): void {
    this.cleanupTasks.push(task);
  }

  /**
   * Remove a cleanup task
   */
  public removeCleanupTask(taskId: string): void {
    this.cleanupTasks = this.cleanupTasks.filter(task => task.id !== taskId);
  }

  /**
   * Get memory usage trend
   */
  public getMemoryTrend(): 'increasing' | 'decreasing' | 'stable' {
    if (this.memoryHistory.length < 5) return 'stable';

    const recent = this.memoryHistory.slice(-5);
    const first = recent[0];
    const last = recent[recent.length - 1];
    const threshold = first * 0.1; // 10% threshold

    if (last > first + threshold) return 'increasing';
    if (last < first - threshold) return 'decreasing';
    return 'stable';
  }

  /**
   * Cleanup resources
   */
  public cleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
      this.performanceObserver = null;
    }

    this.fabricCanvases.clear();
    this.imageCache.clear();
    this.cleanupTasks = [];
    this.memoryHistory = [];
  }

  private initialize(): void {
    this.setupDefaultCleanupTasks();
    
    if (this.options.enableAutoCleanup) {
      this.startAutoCleanup();
    }

    if (this.options.enablePerformanceMonitoring) {
      this.startMemoryMonitoring();
      this.setupPerformanceObserver();
    }
  }

  private setupDefaultCleanupTasks(): void {
    // Fabric.js object cleanup
    this.addCleanupTask({
      id: 'fabric-objects',
      name: 'Clean up unused Fabric.js objects',
      priority: 8,
      estimatedMemorySaved: 10 * 1024 * 1024, // 10MB
      execute: async () => {
        this.fabricCanvases.forEach((canvas) => {
          this.cleanupCanvasObjects(canvas);
        });
      },
    });

    // Image cache cleanup
    this.addCleanupTask({
      id: 'image-cache',
      name: 'Clean up old cached images',
      priority: 7,
      estimatedMemorySaved: 20 * 1024 * 1024, // 20MB
      execute: async () => {
        this.cleanupImageCache();
      },
    });

    // Browser cache cleanup
    this.addCleanupTask({
      id: 'browser-cache',
      name: 'Clear browser caches',
      priority: 5,
      estimatedMemorySaved: 5 * 1024 * 1024, // 5MB
      execute: async () => {
        this.clearBrowserCaches();
      },
    });

    // Event listener cleanup
    this.addCleanupTask({
      id: 'event-listeners',
      name: 'Remove unused event listeners',
      priority: 6,
      estimatedMemorySaved: 1 * 1024 * 1024, // 1MB
      execute: async () => {
        this.cleanupEventListeners();
      },
    });
  }

  private startAutoCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.performCleanup();
    }, this.options.cleanupInterval);
  }

  private setupPerformanceObserver(): void {
    if (typeof PerformanceObserver === 'undefined') return;

    try {
      this.performanceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        
        for (const entry of entries) {
          if (entry.entryType === 'measure' && entry.name.includes('memory')) {
            // Handle memory-related performance entries
            console.log(`Memory performance: ${entry.name} took ${entry.duration}ms`);
          }
        }
      });

      this.performanceObserver.observe({ entryTypes: ['measure', 'navigation'] });
    } catch (error) {
      console.warn('Failed to setup performance observer:', error);
    }
  }

  private setupCanvasCleanup(canvas: fabric.Canvas): void {
    // Monitor canvas object count
    const originalAdd = canvas.add.bind(canvas);
    const originalRemove = canvas.remove.bind(canvas);

    canvas.add = (...objects: fabric.Object[]) => {
      const result = originalAdd(...objects);
      this.checkCanvasObjectLimit(canvas);
      return result;
    };

    canvas.remove = (...objects: fabric.Object[]) => {
      const result = originalRemove(...objects);
      // Clean up object references
      objects.forEach(obj => this.cleanupFabricObject(obj));
      return result;
    };
  }

  private checkCanvasObjectLimit(canvas: fabric.Canvas): void {
    const objectCount = canvas.getObjects().length;
    
    if (objectCount > this.options.maxFabricObjects) {
      console.warn(`Canvas has ${objectCount} objects, exceeding limit of ${this.options.maxFabricObjects}`);
      this.cleanupCanvasObjects(canvas);
    }
  }

  private cleanupCanvasObjects(canvas: fabric.Canvas): void {
    const objects = canvas.getObjects();
    
    // Remove objects that are far outside the viewport
    const viewport = canvas.viewportTransform;
    if (viewport) {
      const visibleBounds = {
        left: -viewport[4] / canvas.getZoom() - 1000,
        top: -viewport[5] / canvas.getZoom() - 1000,
        right: (-viewport[4] + canvas.getWidth()) / canvas.getZoom() + 1000,
        bottom: (-viewport[5] + canvas.getHeight()) / canvas.getZoom() + 1000,
      };

      const objectsToRemove = objects.filter(obj => {
        const bounds = obj.getBoundingRect();
        return (
          bounds.left > visibleBounds.right ||
          bounds.left + bounds.width < visibleBounds.left ||
          bounds.top > visibleBounds.bottom ||
          bounds.top + bounds.height < visibleBounds.top
        );
      });

      // Only remove if we have too many objects
      if (objects.length > this.options.maxFabricObjects * 0.8) {
        objectsToRemove.forEach(obj => {
          canvas.remove(obj);
          this.cleanupFabricObject(obj);
        });
      }
    }
  }

  private cleanupFabricObject(obj: fabric.Object): void {
    // Clean up object-specific resources
    if (obj.type === 'image') {
      const imageObj = obj as fabric.Image;
      const element = imageObj.getElement();
      if (element && element instanceof HTMLImageElement) {
        element.src = '';
      }
    }

    // Clear object data
    obj.data = null;
    
    // Remove event listeners
    obj.off();
  }

  private enforceImageCacheLimit(): void {
    const maxSize = this.options.maxImageCacheSize * 1024 * 1024;
    let currentSize = this.calculateImageCacheSize();

    if (currentSize <= maxSize) return;

    // Sort by last accessed time (LRU)
    const entries = Array.from(this.imageCache.entries())
      .sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed);

    // Remove oldest entries until under limit
    for (const [key, entry] of entries) {
      if (currentSize <= maxSize) break;
      
      this.imageCache.delete(key);
      currentSize -= entry.size;
    }
  }

  private cleanupImageCache(): void {
    const now = Date.now();
    const maxAge = 30 * 60 * 1000; // 30 minutes

    this.imageCache.forEach((entry, key) => {
      if (now - entry.lastAccessed > maxAge) {
        this.imageCache.delete(key);
      }
    });
  }

  private clearBrowserCaches(): void {
    // Clear various browser caches that might accumulate
    try {
      // Clear URL object cache
      if (typeof URL !== 'undefined') {
        // This is handled elsewhere, but we could track and clean up URLs
      }

      // Clear any temporary DOM elements
      const tempElements = document.querySelectorAll('[data-temp="true"]');
      tempElements.forEach(el => el.remove());

      // Clear any temporary canvases
      const tempCanvases = document.querySelectorAll('canvas[data-temp="true"]');
      tempCanvases.forEach(canvas => {
        const canvasElement = canvas as HTMLCanvasElement;
        const ctx = canvasElement.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);
        }
        canvas.remove();
      });
    } catch (error) {
      console.warn('Error clearing browser caches:', error);
    }
  }

  private cleanupEventListeners(): void {
    // This is a placeholder for cleaning up event listeners
    // In practice, this would track and remove unused listeners
    console.log('Cleaning up event listeners');
  }

  private clearTemporaryReferences(): void {
    // Clear any temporary references that might prevent GC
    if (typeof window !== 'undefined') {
      // Clear any temporary properties on window
      Object.keys(window).forEach(key => {
        if (key.startsWith('temp_') || key.startsWith('_temp')) {
          try {
            delete (window as any)[key];
          } catch (error) {
            // Ignore errors for non-configurable properties
          }
        }
      });
    }
  }

  private createMemoryPressure(): void {
    // Create temporary memory pressure to encourage GC
    const arrays: number[][] = [];
    
    try {
      // Create some large arrays
      for (let i = 0; i < 10; i++) {
        arrays.push(new Array(100000).fill(Math.random()));
      }
      
      // Process them briefly
      arrays.forEach(arr => arr.sort());
      
    } finally {
      // Clear references
      arrays.length = 0;
    }
  }

  private countFabricObjects(): number {
    let count = 0;
    this.fabricCanvases.forEach((canvas) => {
      count += canvas.getObjects().length;
    });
    return count;
  }

  private estimateCanvasMemory(): number {
    let memory = 0;
    
    this.fabricCanvases.forEach((canvas) => {
      // Base canvas memory
      memory += canvas.getWidth() * canvas.getHeight() * 4; // RGBA
      
      // Object memory
      const objects = canvas.getObjects();
      memory += objects.length * 5000; // ~5KB per object estimate
      
      // Image object memory
      objects.forEach(obj => {
        if (obj.type === 'image') {
          const imageObj = obj as fabric.Image;
          memory += (imageObj.width || 0) * (imageObj.height || 0) * 4;
        }
      });
    });
    
    return memory;
  }

  private calculateImageCacheSize(): number {
    let size = 0;
    this.imageCache.forEach((entry) => {
      size += entry.size;
    });
    return size;
  }

  private estimateCompilationCacheSize(): number {
    // This would integrate with the compilation cache service
    // For now, return a placeholder estimate
    return 10 * 1024 * 1024; // 10MB estimate
  }
}

// Export singleton instance
export const memoryManagementService = new MemoryManagementService();