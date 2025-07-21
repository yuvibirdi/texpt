import { Slide, SlideElement } from '../types/presentation';

export interface ThumbnailOptions {
  width: number;
  height: number;
  quality: number; // 0-1
  format: 'png' | 'jpeg' | 'webp';
}

export interface LazyLoadingOptions {
  thumbnailSize: { width: number; height: number };
  previewSize: { width: number; height: number };
  cacheSize: number; // Maximum number of cached items
  preloadDistance: number; // Number of slides to preload ahead/behind
  enableIntersectionObserver: boolean;
  debounceMs: number;
}

export interface CachedItem {
  id: string;
  data: string | HTMLCanvasElement | null;
  timestamp: number;
  size: number; // Estimated memory size
  priority: number;
  isLoading: boolean;
}

export interface LoadRequest {
  slideId: string;
  type: 'thumbnail' | 'preview';
  priority: number;
  callback: (data: string | null, error?: Error) => void;
}

/**
 * Lazy Loading Service
 * Manages efficient loading and caching of slide thumbnails and previews
 */
export class LazyLoadingService {
  private options: LazyLoadingOptions;
  private thumbnailCache = new Map<string, CachedItem>();
  private previewCache = new Map<string, CachedItem>();
  private loadQueue: LoadRequest[] = [];
  private isProcessingQueue = false;
  private intersectionObserver: IntersectionObserver | null = null;
  private observedElements = new Map<string, Element>();
  private loadingPromises = new Map<string, Promise<string | null>>();

  constructor(options: Partial<LazyLoadingOptions> = {}) {
    this.options = {
      thumbnailSize: { width: 150, height: 100 },
      previewSize: { width: 800, height: 600 },
      cacheSize: 50, // Max 50 cached items
      preloadDistance: 2,
      enableIntersectionObserver: true,
      debounceMs: 100,
      ...options,
    };

    this.setupIntersectionObserver();
  }

  /**
   * Load thumbnail for a slide
   */
  public async loadThumbnail(slide: Slide, priority: number = 0): Promise<string | null> {
    const cacheKey = `thumb_${slide.id}`;
    
    // Check cache first
    const cached = this.thumbnailCache.get(cacheKey);
    if (cached && cached.data && typeof cached.data === 'string') {
      this.updateCacheAccess(cached);
      return cached.data;
    }

    // Check if already loading
    const existingPromise = this.loadingPromises.get(cacheKey);
    if (existingPromise) {
      return existingPromise;
    }

    // Create loading promise
    const loadingPromise = this.generateThumbnail(slide);
    this.loadingPromises.set(cacheKey, loadingPromise);

    try {
      const result = await loadingPromise;
      
      if (result) {
        // Cache the result
        this.cacheThumbnail(slide.id, result, priority);
      }
      
      return result;
    } finally {
      this.loadingPromises.delete(cacheKey);
    }
  }

  /**
   * Load preview for a slide
   */
  public async loadPreview(slide: Slide, priority: number = 0): Promise<string | null> {
    const cacheKey = `preview_${slide.id}`;
    
    // Check cache first
    const cached = this.previewCache.get(cacheKey);
    if (cached && cached.data && typeof cached.data === 'string') {
      this.updateCacheAccess(cached);
      return cached.data;
    }

    // Check if already loading
    const existingPromise = this.loadingPromises.get(cacheKey);
    if (existingPromise) {
      return existingPromise;
    }

    // Create loading promise
    const loadingPromise = this.generatePreview(slide);
    this.loadingPromises.set(cacheKey, loadingPromise);

    try {
      const result = await loadingPromise;
      
      if (result) {
        // Cache the result
        this.cachePreview(slide.id, result, priority);
      }
      
      return result;
    } finally {
      this.loadingPromises.delete(cacheKey);
    }
  }

  /**
   * Preload thumbnails for slides around the current index
   */
  public preloadThumbnails(slides: Slide[], currentIndex: number): void {
    const start = Math.max(0, currentIndex - this.options.preloadDistance);
    const end = Math.min(slides.length - 1, currentIndex + this.options.preloadDistance);

    for (let i = start; i <= end; i++) {
      const priority = Math.abs(i - currentIndex); // Closer slides have higher priority (lower number)
      this.loadThumbnail(slides[i], priority);
    }
  }

  /**
   * Preload previews for slides around the current index
   */
  public preloadPreviews(slides: Slide[], currentIndex: number): void {
    const start = Math.max(0, currentIndex - 1);
    const end = Math.min(slides.length - 1, currentIndex + 1);

    for (let i = start; i <= end; i++) {
      const priority = Math.abs(i - currentIndex);
      this.loadPreview(slides[i], priority);
    }
  }

  /**
   * Observe element for intersection-based loading
   */
  public observeElement(element: Element, slideId: string, type: 'thumbnail' | 'preview'): void {
    if (!this.options.enableIntersectionObserver || !this.intersectionObserver) {
      return;
    }

    this.observedElements.set(`${type}_${slideId}`, element);
    this.intersectionObserver.observe(element);
  }

  /**
   * Stop observing element
   */
  public unobserveElement(slideId: string, type: 'thumbnail' | 'preview'): void {
    if (!this.intersectionObserver) return;

    const key = `${type}_${slideId}`;
    const element = this.observedElements.get(key);
    if (element) {
      this.intersectionObserver.unobserve(element);
      this.observedElements.delete(key);
    }
  }

  /**
   * Clear cache for a specific slide
   */
  public clearSlideCache(slideId: string): void {
    this.thumbnailCache.delete(`thumb_${slideId}`);
    this.previewCache.delete(`preview_${slideId}`);
  }

  /**
   * Clear all caches
   */
  public clearAllCaches(): void {
    this.thumbnailCache.clear();
    this.previewCache.clear();
    this.loadingPromises.clear();
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): {
    thumbnails: { count: number; size: number };
    previews: { count: number; size: number };
    totalMemory: number;
  } {
    const thumbnailStats = this.getCacheStatsForMap(this.thumbnailCache);
    const previewStats = this.getCacheStatsForMap(this.previewCache);

    return {
      thumbnails: thumbnailStats,
      previews: previewStats,
      totalMemory: thumbnailStats.size + previewStats.size,
    };
  }

  /**
   * Cleanup resources
   */
  public cleanup(): void {
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
      this.intersectionObserver = null;
    }

    this.clearAllCaches();
    this.observedElements.clear();
    this.loadQueue = [];
  }

  private setupIntersectionObserver(): void {
    if (!this.options.enableIntersectionObserver || typeof IntersectionObserver === 'undefined') {
      return;
    }

    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Find the corresponding slide and type
            this.observedElements.forEach((element, key) => {
              if (element === entry.target) {
                const [type, slideId] = key.split('_');
                this.handleIntersection(slideId, type as 'thumbnail' | 'preview');
              }
            });
          }
        });
      },
      {
        rootMargin: '50px', // Start loading 50px before element comes into view
        threshold: 0.1,
      }
    );
  }

  private handleIntersection(slideId: string, type: 'thumbnail' | 'preview'): void {
    // This would trigger loading based on intersection
    // Implementation depends on how slides are structured
    console.log(`Intersection detected for ${type} of slide ${slideId}`);
  }

  private async generateThumbnail(slide: Slide): Promise<string | null> {
    try {
      // Create a small canvas for thumbnail generation
      const canvas = document.createElement('canvas');
      canvas.width = this.options.thumbnailSize.width;
      canvas.height = this.options.thumbnailSize.height;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) return null;

      // Set background
      const bgColor = slide.background.color;
      if (typeof bgColor === 'string') {
        ctx.fillStyle = bgColor;
      } else if (bgColor) {
        ctx.fillStyle = `rgba(${bgColor.r}, ${bgColor.g}, ${bgColor.b}, ${bgColor.a || 1})`;
      } else {
        ctx.fillStyle = '#ffffff';
      }
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Render elements at thumbnail scale
      const scaleX = canvas.width / 800; // Assuming slide width is 800
      const scaleY = canvas.height / 600; // Assuming slide height is 600

      for (const element of slide.elements) {
        await this.renderElementToCanvas(ctx, element, scaleX, scaleY, true);
      }

      // Convert to data URL
      return canvas.toDataURL('image/jpeg', 0.7); // Lower quality for thumbnails
    } catch (error) {
      console.error('Error generating thumbnail:', error);
      return null;
    }
  }

  private async generatePreview(slide: Slide): Promise<string | null> {
    try {
      // Create a full-size canvas for preview generation
      const canvas = document.createElement('canvas');
      canvas.width = this.options.previewSize.width;
      canvas.height = this.options.previewSize.height;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) return null;

      // Set background
      const bgColor = slide.background.color;
      if (typeof bgColor === 'string') {
        ctx.fillStyle = bgColor;
      } else if (bgColor) {
        ctx.fillStyle = `rgba(${bgColor.r}, ${bgColor.g}, ${bgColor.b}, ${bgColor.a || 1})`;
      } else {
        ctx.fillStyle = '#ffffff';
      }
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Render elements at full scale
      for (const element of slide.elements) {
        await this.renderElementToCanvas(ctx, element, 1, 1, false);
      }

      // Convert to data URL
      return canvas.toDataURL('image/png', 0.9); // Higher quality for previews
    } catch (error) {
      console.error('Error generating preview:', error);
      return null;
    }
  }

  private async renderElementToCanvas(
    ctx: CanvasRenderingContext2D,
    element: SlideElement,
    scaleX: number,
    scaleY: number,
    isLowDetail: boolean
  ): Promise<void> {
    const x = element.position.x * scaleX;
    const y = element.position.y * scaleY;
    const width = element.size.width * scaleX;
    const height = element.size.height * scaleY;

    switch (element.type) {
      case 'text':
        this.renderTextElement(ctx, element, x, y, width, height, isLowDetail);
        break;
      case 'shape':
        this.renderShapeElement(ctx, element, x, y, width, height, isLowDetail);
        break;
      case 'image':
        await this.renderImageElement(ctx, element, x, y, width, height, isLowDetail);
        break;
    }
  }

  private renderTextElement(
    ctx: CanvasRenderingContext2D,
    element: SlideElement,
    x: number,
    y: number,
    width: number,
    height: number,
    isLowDetail: boolean
  ): void {
    const fontSize = (element.properties.fontSize || 16) * (isLowDetail ? 0.8 : 1);
    const fontFamily = element.properties.fontFamily || 'Arial';
    const textColor = element.properties.textColor;

    ctx.font = `${fontSize}px ${fontFamily}`;
    ctx.fillStyle = textColor ? 
      `rgba(${textColor.r}, ${textColor.g}, ${textColor.b}, ${textColor.a || 1})` : 
      '#000000';

    // Simple text rendering (could be enhanced for better text layout)
    const text = element.content || '';
    const lines = this.wrapText(ctx, text, width);
    
    lines.forEach((line, index) => {
      ctx.fillText(line, x, y + (index + 1) * fontSize * 1.2);
    });
  }

  private renderShapeElement(
    ctx: CanvasRenderingContext2D,
    element: SlideElement,
    x: number,
    y: number,
    width: number,
    height: number,
    isLowDetail: boolean
  ): void {
    const fillColor = element.properties.fillColor;
    const strokeColor = element.properties.strokeColor;
    const strokeWidth = (element.properties.strokeWidth || 1) * (isLowDetail ? 0.5 : 1);

    // Set fill style
    if (fillColor) {
      ctx.fillStyle = `rgba(${fillColor.r}, ${fillColor.g}, ${fillColor.b}, ${fillColor.a || 1})`;
    }

    // Set stroke style
    if (strokeColor) {
      ctx.strokeStyle = `rgba(${strokeColor.r}, ${strokeColor.g}, ${strokeColor.b}, ${strokeColor.a || 1})`;
      ctx.lineWidth = strokeWidth;
    }

    // Render based on shape type
    const shapeType = element.properties.shapeType || 'rectangle';
    
    switch (shapeType) {
      case 'rectangle':
        if (fillColor) ctx.fillRect(x, y, width, height);
        if (strokeColor) ctx.strokeRect(x, y, width, height);
        break;
      case 'circle':
        ctx.beginPath();
        ctx.ellipse(x + width/2, y + height/2, width/2, height/2, 0, 0, 2 * Math.PI);
        if (fillColor) ctx.fill();
        if (strokeColor) ctx.stroke();
        break;
      case 'line':
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + width, y + height);
        if (strokeColor) ctx.stroke();
        break;
    }
  }

  private async renderImageElement(
    ctx: CanvasRenderingContext2D,
    element: SlideElement,
    x: number,
    y: number,
    width: number,
    height: number,
    isLowDetail: boolean
  ): Promise<void> {
    if (!element.content) return;

    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = element.content!;
      });

      // Draw image with appropriate quality
      if (isLowDetail) {
        // Use lower quality rendering for thumbnails
        ctx.imageSmoothingEnabled = false;
      }
      
      ctx.drawImage(img, x, y, width, height);
      
      if (isLowDetail) {
        ctx.imageSmoothingEnabled = true;
      }
    } catch (error) {
      // Draw placeholder rectangle if image fails to load
      ctx.fillStyle = '#f0f0f0';
      ctx.fillRect(x, y, width, height);
      ctx.strokeStyle = '#ccc';
      ctx.strokeRect(x, y, width, height);
    }
  }

  private wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine + (currentLine ? ' ' : '') + word;
      const metrics = ctx.measureText(testLine);
      
      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    
    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  }

  private cacheThumbnail(slideId: string, data: string, priority: number): void {
    const cacheKey = `thumb_${slideId}`;
    const size = this.estimateDataSize(data);
    
    const item: CachedItem = {
      id: slideId,
      data,
      timestamp: Date.now(),
      size,
      priority,
      isLoading: false,
    };

    this.thumbnailCache.set(cacheKey, item);
    this.enforceCache(this.thumbnailCache);
  }

  private cachePreview(slideId: string, data: string, priority: number): void {
    const cacheKey = `preview_${slideId}`;
    const size = this.estimateDataSize(data);
    
    const item: CachedItem = {
      id: slideId,
      data,
      timestamp: Date.now(),
      size,
      priority,
      isLoading: false,
    };

    this.previewCache.set(cacheKey, item);
    this.enforceCache(this.previewCache);
  }

  private enforceCache(cache: Map<string, CachedItem>): void {
    if (cache.size <= this.options.cacheSize) return;

    // Sort by priority and timestamp (LRU with priority)
    const entries = Array.from(cache.entries()).sort((a, b) => {
      const [, itemA] = a;
      const [, itemB] = b;
      
      // Higher priority items are kept longer
      if (itemA.priority !== itemB.priority) {
        return itemA.priority - itemB.priority;
      }
      
      // Among same priority, keep more recently accessed
      return itemA.timestamp - itemB.timestamp;
    });

    // Remove oldest, lowest priority items
    const itemsToRemove = entries.slice(0, cache.size - this.options.cacheSize);
    itemsToRemove.forEach(([key]) => cache.delete(key));
  }

  private updateCacheAccess(item: CachedItem): void {
    item.timestamp = Date.now();
  }

  private estimateDataSize(data: string): number {
    // Rough estimate: base64 data URL size
    return data.length * 0.75; // Base64 is ~33% larger than binary
  }

  private getCacheStatsForMap(cache: Map<string, CachedItem>): { count: number; size: number } {
    let totalSize = 0;
    cache.forEach((item) => {
      totalSize += item.size;
    });
    return { count: cache.size, size: totalSize };
  }
}

// Export singleton instance
export const lazyLoadingService = new LazyLoadingService();