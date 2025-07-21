import { Slide, Presentation } from '../types/presentation';
import { CompilationResult } from './latexCompiler';

export interface CacheEntry {
  id: string;
  slideHash: string;
  presentationHash: string;
  latexCode: string;
  compilationResult: CompilationResult;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
  size: number; // Estimated memory size in bytes
}

export interface CacheOptions {
  maxEntries: number;
  maxMemoryMB: number;
  maxAge: number; // Maximum age in milliseconds
  enablePersistence: boolean;
  compressionLevel: number; // 0-9, 0 = no compression
}

export interface CacheStats {
  totalEntries: number;
  memoryUsage: number;
  hitRate: number;
  oldestEntry: number;
  newestEntry: number;
  averageSize: number;
}

/**
 * Compilation Cache Service
 * Caches LaTeX compilation results to avoid recompiling unchanged slides
 */
export class CompilationCacheService {
  private cache = new Map<string, CacheEntry>();
  private options: CacheOptions;
  private hitCount = 0;
  private missCount = 0;
  private persistenceKey = 'latex-compilation-cache';

  constructor(options: Partial<CacheOptions> = {}) {
    this.options = {
      maxEntries: 100,
      maxMemoryMB: 50,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      enablePersistence: true,
      compressionLevel: 6,
      ...options,
    };

    this.loadFromPersistence();
    this.startCleanupTimer();
  }

  /**
   * Get cached compilation result for a slide
   */
  public getCachedResult(
    slide: Slide,
    presentation: Presentation,
    latexCode: string
  ): CompilationResult | null {
    const slideHash = this.hashSlide(slide);
    const presentationHash = this.hashPresentation(presentation);
    const cacheKey = this.generateCacheKey(slide.id, slideHash, presentationHash);

    const entry = this.cache.get(cacheKey);
    
    if (!entry) {
      this.missCount++;
      return null;
    }

    // Check if entry is still valid
    if (!this.isEntryValid(entry, slideHash, presentationHash, latexCode)) {
      this.cache.delete(cacheKey);
      this.missCount++;
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.hitCount++;

    return entry.compilationResult;
  }

  /**
   * Cache a compilation result
   */
  public cacheResult(
    slide: Slide,
    presentation: Presentation,
    latexCode: string,
    result: CompilationResult
  ): void {
    const slideHash = this.hashSlide(slide);
    const presentationHash = this.hashPresentation(presentation);
    const cacheKey = this.generateCacheKey(slide.id, slideHash, presentationHash);

    const entry: CacheEntry = {
      id: slide.id,
      slideHash,
      presentationHash,
      latexCode,
      compilationResult: result,
      timestamp: Date.now(),
      accessCount: 1,
      lastAccessed: Date.now(),
      size: this.estimateEntrySize(result, latexCode),
    };

    this.cache.set(cacheKey, entry);
    this.enforceConstraints();
    this.saveToPersistence();
  }

  /**
   * Invalidate cache entries for a specific slide
   */
  public invalidateSlide(slideId: string): void {
    const keysToDelete: string[] = [];
    
    this.cache.forEach((entry, key) => {
      if (entry.id === slideId) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => this.cache.delete(key));
    this.saveToPersistence();
  }

  /**
   * Invalidate cache entries for an entire presentation
   */
  public invalidatePresentation(presentationId: string): void {
    const presentationHash = this.hashString(presentationId);
    const keysToDelete: string[] = [];
    
    this.cache.forEach((entry, key) => {
      if (entry.presentationHash.includes(presentationHash)) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => this.cache.delete(key));
    this.saveToPersistence();
  }

  /**
   * Clear all cache entries
   */
  public clearCache(): void {
    this.cache.clear();
    this.hitCount = 0;
    this.missCount = 0;
    this.saveToPersistence();
  }

  /**
   * Get cache statistics
   */
  public getStats(): CacheStats {
    const entries = Array.from(this.cache.values());
    const totalRequests = this.hitCount + this.missCount;
    
    return {
      totalEntries: this.cache.size,
      memoryUsage: entries.reduce((sum, entry) => sum + entry.size, 0),
      hitRate: totalRequests > 0 ? this.hitCount / totalRequests : 0,
      oldestEntry: entries.length > 0 ? Math.min(...entries.map(e => e.timestamp)) : 0,
      newestEntry: entries.length > 0 ? Math.max(...entries.map(e => e.timestamp)) : 0,
      averageSize: entries.length > 0 ? entries.reduce((sum, e) => sum + e.size, 0) / entries.length : 0,
    };
  }

  /**
   * Preload cache with commonly used slides
   */
  public preloadSlides(slides: Slide[], presentation: Presentation): void {
    // This would trigger compilation for slides that aren't cached
    // Implementation depends on compilation service integration
    slides.forEach(slide => {
      const slideHash = this.hashSlide(slide);
      const presentationHash = this.hashPresentation(presentation);
      const cacheKey = this.generateCacheKey(slide.id, slideHash, presentationHash);
      
      if (!this.cache.has(cacheKey)) {
        // Mark for preloading (actual compilation would be handled by compilation service)
        console.log(`Slide ${slide.id} marked for preloading`);
      }
    });
  }

  /**
   * Optimize cache by removing least useful entries
   */
  public optimizeCache(): void {
    const entries = Array.from(this.cache.entries());
    
    // Sort by usefulness score (access count, recency, size)
    entries.sort(([, a], [, b]) => {
      const scoreA = this.calculateUsefulnessScore(a);
      const scoreB = this.calculateUsefulnessScore(b);
      return scoreB - scoreA; // Higher score first
    });

    // Keep only the most useful entries
    const targetSize = Math.floor(this.options.maxEntries * 0.8);
    const entriesToKeep = entries.slice(0, targetSize);
    
    this.cache.clear();
    entriesToKeep.forEach(([key, entry]) => {
      this.cache.set(key, entry);
    });

    this.saveToPersistence();
  }

  /**
   * Export cache data for backup
   */
  public exportCache(): string {
    const cacheData = {
      entries: Array.from(this.cache.entries()),
      stats: { hitCount: this.hitCount, missCount: this.missCount },
      timestamp: Date.now(),
    };

    return JSON.stringify(cacheData);
  }

  /**
   * Import cache data from backup
   */
  public importCache(data: string): boolean {
    try {
      const cacheData = JSON.parse(data);
      
      if (!cacheData.entries || !Array.isArray(cacheData.entries)) {
        return false;
      }

      this.cache.clear();
      cacheData.entries.forEach(([key, entry]: [string, CacheEntry]) => {
        // Validate entry structure
        if (this.isValidCacheEntry(entry)) {
          this.cache.set(key, entry);
        }
      });

      if (cacheData.stats) {
        this.hitCount = cacheData.stats.hitCount || 0;
        this.missCount = cacheData.stats.missCount || 0;
      }

      this.enforceConstraints();
      this.saveToPersistence();
      return true;
    } catch (error) {
      console.error('Failed to import cache data:', error);
      return false;
    }
  }

  /**
   * Cleanup resources
   */
  public cleanup(): void {
    this.clearCache();
  }

  private hashSlide(slide: Slide): string {
    // Create a hash based on slide content that affects compilation
    const hashData = {
      title: slide.title,
      elements: slide.elements.map(element => ({
        type: element.type,
        content: element.content,
        position: element.position,
        size: element.size,
        properties: element.properties,
      })),
      connections: slide.connections,
      layout: slide.layout,
      background: slide.background,
      updatedAt: slide.updatedAt.getTime(),
    };

    return this.hashString(JSON.stringify(hashData));
  }

  private hashPresentation(presentation: Presentation): string {
    // Create a hash based on presentation-wide settings that affect compilation
    const hashData = {
      theme: presentation.theme,
      settings: presentation.settings,
      metadata: {
        title: presentation.metadata.title,
        author: presentation.metadata.author,
        subtitle: presentation.metadata.subtitle,
      },
      updatedAt: presentation.updatedAt.getTime(),
    };

    return this.hashString(JSON.stringify(hashData));
  }

  private hashString(str: string): string {
    // Simple hash function (could be replaced with a more robust one)
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  private generateCacheKey(slideId: string, slideHash: string, presentationHash: string): string {
    return `${slideId}_${slideHash}_${presentationHash}`;
  }

  private isEntryValid(
    entry: CacheEntry,
    currentSlideHash: string,
    currentPresentationHash: string,
    currentLatexCode: string
  ): boolean {
    // Check if entry has expired
    if (Date.now() - entry.timestamp > this.options.maxAge) {
      return false;
    }

    // Check if slide content has changed
    if (entry.slideHash !== currentSlideHash) {
      return false;
    }

    // Check if presentation settings have changed
    if (entry.presentationHash !== currentPresentationHash) {
      return false;
    }

    // Check if LaTeX code has changed
    if (entry.latexCode !== currentLatexCode) {
      return false;
    }

    return true;
  }

  private estimateEntrySize(result: CompilationResult, latexCode: string): number {
    let size = 0;
    
    // LaTeX code size
    size += latexCode.length * 2; // UTF-16
    
    // Compilation result size
    size += result.log.length * 2;
    size += result.errors.reduce((sum, error) => sum + error.message.length * 2, 0);
    size += result.warnings.reduce((sum, warning) => sum + warning.message.length * 2, 0);
    
    // PDF buffer size (if present)
    if (result.pdfBuffer) {
      size += result.pdfBuffer.length;
    }
    
    // Base object overhead
    size += 1000;
    
    return size;
  }

  private enforceConstraints(): void {
    this.enforceMaxEntries();
    this.enforceMaxMemory();
    this.removeExpiredEntries();
  }

  private enforceMaxEntries(): void {
    if (this.cache.size <= this.options.maxEntries) return;

    const entries = Array.from(this.cache.entries());
    
    // Sort by last accessed time (LRU)
    entries.sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed);
    
    // Remove oldest entries
    const entriesToRemove = entries.slice(0, this.cache.size - this.options.maxEntries);
    entriesToRemove.forEach(([key]) => this.cache.delete(key));
  }

  private enforceMaxMemory(): void {
    const maxBytes = this.options.maxMemoryMB * 1024 * 1024;
    let currentMemory = 0;
    
    // Calculate current memory usage
    this.cache.forEach((entry) => {
      currentMemory += entry.size;
    });

    if (currentMemory <= maxBytes) return;

    // Remove entries until under memory limit
    const entries = Array.from(this.cache.entries());
    entries.sort(([, a], [, b]) => this.calculateUsefulnessScore(a) - this.calculateUsefulnessScore(b));

    for (const [key, entry] of entries) {
      if (currentMemory <= maxBytes) break;
      
      this.cache.delete(key);
      currentMemory -= entry.size;
    }
  }

  private removeExpiredEntries(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    this.cache.forEach((entry, key) => {
      if (now - entry.timestamp > this.options.maxAge) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => this.cache.delete(key));
  }

  private calculateUsefulnessScore(entry: CacheEntry): number {
    const now = Date.now();
    const age = now - entry.timestamp;
    const recency = now - entry.lastAccessed;
    
    // Higher score = more useful
    let score = 0;
    
    // Access frequency
    score += entry.accessCount * 10;
    
    // Recency (more recently accessed = higher score)
    score += Math.max(0, 1000 - recency / 1000);
    
    // Age penalty (older entries get lower scores)
    score -= age / 10000;
    
    // Size penalty (larger entries get lower scores)
    score -= entry.size / 10000;
    
    return score;
  }

  private isValidCacheEntry(entry: any): entry is CacheEntry {
    return (
      typeof entry === 'object' &&
      typeof entry.id === 'string' &&
      typeof entry.slideHash === 'string' &&
      typeof entry.presentationHash === 'string' &&
      typeof entry.latexCode === 'string' &&
      typeof entry.compilationResult === 'object' &&
      typeof entry.timestamp === 'number' &&
      typeof entry.accessCount === 'number' &&
      typeof entry.lastAccessed === 'number' &&
      typeof entry.size === 'number'
    );
  }

  private startCleanupTimer(): void {
    // Run cleanup every 5 minutes
    setInterval(() => {
      this.removeExpiredEntries();
      this.saveToPersistence();
    }, 5 * 60 * 1000);
  }

  private loadFromPersistence(): void {
    if (!this.options.enablePersistence || typeof localStorage === 'undefined') {
      return;
    }

    try {
      const data = localStorage.getItem(this.persistenceKey);
      if (data) {
        this.importCache(data);
      }
    } catch (error) {
      console.warn('Failed to load cache from persistence:', error);
    }
  }

  private saveToPersistence(): void {
    if (!this.options.enablePersistence || typeof localStorage === 'undefined') {
      return;
    }

    try {
      const data = this.exportCache();
      localStorage.setItem(this.persistenceKey, data);
    } catch (error) {
      console.warn('Failed to save cache to persistence:', error);
    }
  }
}

// Export singleton instance
export const compilationCacheService = new CompilationCacheService();