import { EventEmitter } from 'events';
import { Presentation, Slide } from '../types/presentation';
import { latexCompiler, ILatexCompiler } from './latexCompilerFactory';
import { CompilationResult, CompilationProgress } from './latexCompiler';
import { latexGenerator } from './latexGenerator';
import { compilationCacheService } from './compilationCacheService';

export interface PreviewState {
  isCompiling: boolean;
  progress: number;
  stage: string;
  message: string;
  lastCompiled: Date | null;
  error: string | null;
  pdfUrl: string | null;
  currentSlideIndex: number;
}

export interface PreviewOptions {
  debounceMs?: number;
  autoCompile?: boolean;
  compiler?: 'pdflatex' | 'xelatex' | 'lualatex';
  timeout?: number;
}

/**
 * Preview Service manages real-time compilation and synchronization
 * between the slide editor and PDF preview
 */
export class PreviewService extends EventEmitter {
  private currentJobId: string | null = null;
  private compilationTimeout: NodeJS.Timeout | null = null;
  private currentPdfUrl: string | null = null;
  private options: Required<PreviewOptions>;
  private lastPresentationHash: string | null = null;

  constructor(options: PreviewOptions = {}) {
    super();
    this.options = {
      debounceMs: 500,
      autoCompile: true,
      compiler: 'pdflatex',
      timeout: 30000,
      ...options,
    };

    this.setupCompilerListeners();
  }

  /**
   * Start real-time preview for a presentation
   */
  public startPreview(presentation: Presentation): void {
    if (this.options.autoCompile) {
      this.compilePresentation(presentation);
    }
  }

  /**
   * Update preview when presentation changes
   */
  public updatePreview(presentation: Presentation, forceCompile: boolean = false): void {
    const presentationHash = this.hashPresentation(presentation);
    
    if (!forceCompile && presentationHash === this.lastPresentationHash) {
      return; // No changes detected
    }

    this.lastPresentationHash = presentationHash;

    if (this.options.autoCompile || forceCompile) {
      this.compilePresentation(presentation);
    }
  }

  /**
   * Manually trigger compilation
   */
  public compilePresentation(presentation: Presentation): Promise<string> {
    console.log('[Preview Service] Starting compilation for presentation:', presentation.title);
    console.log('[Preview Service] Presentation has', presentation.slides.length, 'slides');
    
    return new Promise((resolve, reject) => {
      // Clear existing timeout
      if (this.compilationTimeout) {
        console.log('[Preview Service] Clearing existing compilation timeout');
        clearTimeout(this.compilationTimeout);
      }

      // Cancel existing compilation
      if (this.currentJobId) {
        console.log('[Preview Service] Cancelling existing job:', this.currentJobId);
        latexCompiler.cancelJob(this.currentJobId);
      }

      // Debounce compilation
      console.log('[Preview Service] Setting compilation timeout with debounce:', this.options.debounceMs, 'ms');
      this.compilationTimeout = setTimeout(async () => {
        try {
          console.log('[Preview Service] Starting actual compilation process');
          this.emit('compilation-started');

          // Process base64 images before LaTeX generation
          console.log('[Preview Service] Processing base64 images...');
          const processedPresentation = await this.processBase64Images(presentation);

          // Generate LaTeX source
          console.log('[Preview Service] Generating LaTeX source...');
          const latexSource = latexGenerator.generateDocument(processedPresentation, {
            includePackages: true,
            includeDocumentClass: true,
            optimizeCode: true,
          });
          console.log('[Preview Service] Generated LaTeX source length:', latexSource.length);
          console.log('[Preview Service] LaTeX source preview:', latexSource.substring(0, 500) + (latexSource.length > 500 ? '...' : ''));

          // Check cache for each slide first
          let cachedResult: CompilationResult | null = null;
          if (presentation.slides.length === 1) {
            console.log('[Preview Service] Checking cache for single slide...');
            cachedResult = compilationCacheService.getCachedResult(
              presentation.slides[0],
              presentation,
              latexSource
            );
            console.log('[Preview Service] Cache result:', cachedResult ? 'found' : 'not found');
          }

          if (cachedResult && cachedResult.success) {
            console.log('[Preview Service] Using cached compilation result');
            this.handleCompilationResult(cachedResult);
            resolve(cachedResult.jobId);
            return;
          }

          // Start compilation
          console.log('[Preview Service] Starting fresh compilation with options:', {
            compiler: this.options.compiler,
            timeout: this.options.timeout,
            synctex: true,
          });
          
          const jobId = await latexCompiler.compile(latexSource, {
            compiler: this.options.compiler,
            timeout: this.options.timeout,
            synctex: true,
          });

          console.log('[Preview Service] Compilation job started with ID:', jobId);
          this.currentJobId = jobId;

          // Set up one-time listeners for this specific job
          const handleCompleted = (result: CompilationResult) => {
            if (result.jobId === jobId) {
              console.log('[Preview Service] Compilation completed for job:', jobId, 'Success:', result.success);
              latexCompiler.off('job-completed', handleCompleted);
              
              // Cache the result if successful
              if (result.success && presentation.slides.length === 1) {
                console.log('[Preview Service] Caching successful compilation result');
                compilationCacheService.cacheResult(
                  presentation.slides[0],
                  presentation,
                  latexSource,
                  result
                );
              }
              
              if (result.success) {
                console.log('[Preview Service] Compilation successful, resolving promise');
                resolve(jobId);
              } else {
                console.error('[Preview Service] Compilation failed with errors:', result.errors);
                reject(new Error(result.errors.map(e => e.message).join('; ')));
              }
            }
          };

          latexCompiler.on('job-completed', handleCompleted);

        } catch (error) {
          console.error('[Preview Service] Compilation error:', error);
          this.emit('compilation-error', error);
          reject(error);
        }
      }, this.options.debounceMs);
    });
  }

  /**
   * Navigate to a specific slide in the preview
   */
  public navigateToSlide(slideIndex: number): void {
    this.emit('slide-navigation', { slideIndex });
  }

  /**
   * Synchronize preview with current slide selection
   */
  public syncWithSlide(slideId: string, presentation: Presentation): void {
    const slideIndex = presentation.slides.findIndex(slide => slide.id === slideId);
    if (slideIndex !== -1) {
      this.navigateToSlide(slideIndex + 1); // PDF pages are 1-indexed
    }
  }

  /**
   * Get current compilation status
   */
  public getCompilationStatus(): {
    isCompiling: boolean;
    queueStatus: { queued: number; active: number; total: number };
  } {
    return {
      isCompiling: this.currentJobId !== null,
      queueStatus: latexCompiler.getQueueStatus(),
    };
  }

  /**
   * Cancel current compilation
   */
  public cancelCompilation(): boolean {
    if (this.currentJobId) {
      const cancelled = latexCompiler.cancelJob(this.currentJobId);
      if (cancelled) {
        this.currentJobId = null;
        this.emit('compilation-cancelled');
      }
      return cancelled;
    }
    return false;
  }

  /**
   * Download current PDF
   */
  public downloadPdf(filename?: string): void {
    if (this.currentPdfUrl) {
      const link = document.createElement('a');
      link.href = this.currentPdfUrl;
      link.download = filename || 'presentation.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  /**
   * Get current PDF URL
   */
  public getPdfUrl(): string | null {
    return this.currentPdfUrl;
  }

  /**
   * Update preview options
   */
  public updateOptions(options: Partial<PreviewOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * Clean up resources
   */
  public cleanup(): void {
    if (this.compilationTimeout) {
      clearTimeout(this.compilationTimeout);
    }

    if (this.currentJobId) {
      latexCompiler.cancelJob(this.currentJobId);
    }

    if (this.currentPdfUrl) {
      URL.revokeObjectURL(this.currentPdfUrl);
      this.currentPdfUrl = null;
    }

    this.removeAllListeners();
  }

  /**
   * Setup compiler event listeners
   */
  private setupCompilerListeners(): void {
    latexCompiler.on('progress', (progress: CompilationProgress) => {
      if (progress.jobId === this.currentJobId) {
        this.emit('compilation-progress', progress);
      }
    });

    latexCompiler.on('job-completed', (result: CompilationResult) => {
      if (result.jobId === this.currentJobId) {
        this.handleCompilationResult(result);
        this.currentJobId = null;
      }
    });

    latexCompiler.on('job-cancelled', ({ jobId }: { jobId: string }) => {
      if (jobId === this.currentJobId) {
        this.currentJobId = null;
        this.emit('compilation-cancelled');
      }
    });
  }

  /**
   * Handle compilation result
   */
  private handleCompilationResult(result: CompilationResult): void {
    if (result.success && result.pdfBuffer) {
      // Clean up previous PDF URL
      if (this.currentPdfUrl) {
        URL.revokeObjectURL(this.currentPdfUrl);
      }

      // Create new PDF URL
      const blob = new Blob([result.pdfBuffer], { type: 'application/pdf' });
      this.currentPdfUrl = URL.createObjectURL(blob);

      this.emit('compilation-success', {
        pdfUrl: this.currentPdfUrl,
        duration: result.duration,
        warnings: result.warnings,
      });
    } else {
      this.emit('compilation-error', {
        errors: result.errors,
        warnings: result.warnings,
        log: result.log,
      });
    }
  }

  /**
   * Generate a hash of the presentation for change detection
   */
  private hashPresentation(presentation: Presentation): string {
    // Simple hash based on presentation structure and content
    const hashData = {
      title: presentation.title,
      slideCount: presentation.slides.length,
      slides: presentation.slides.map(slide => ({
        id: slide.id,
        title: slide.title,
        elementCount: slide.elements.length,
        elements: slide.elements.map(element => ({
          type: element.type,
          content: element.content,
          position: element.position,
          size: element.size,
          // Include key properties that affect rendering
          properties: {
            textColor: element.properties.textColor,
            fontSize: element.properties.fontSize,
            fontWeight: element.properties.fontWeight,
            fillColor: element.properties.fillColor,
            strokeColor: element.properties.strokeColor,
          },
        })),
        connectionCount: slide.connections.length,
      })),
      theme: {
        colors: presentation.theme.colors,
        fonts: presentation.theme.fonts,
      },
      updatedAt: presentation.updatedAt.getTime(),
    };

    return JSON.stringify(hashData);
  }

  /**
   * Check if LaTeX is available
   */
  public async checkLatexAvailability(): Promise<{
    available: boolean;
    compilers: string[];
    version?: string;
  }> {
    console.log('🔧 [Preview Service] ===== STARTING LATEX AVAILABILITY CHECK =====');
    console.log('🔧 [Preview Service] LaTeX compiler instance:', {
      exists: !!latexCompiler,
      type: latexCompiler?.constructor?.name,
      methods: latexCompiler ? Object.getOwnPropertyNames(Object.getPrototypeOf(latexCompiler)) : 'none'
    });
    
    try {
      console.log('🔧 [Preview Service] Calling latexCompiler.checkLatexAvailability()...');
      const startTime = Date.now();
      const result = await latexCompiler.checkLatexAvailability();
      const duration = Date.now() - startTime;
      
      console.log('🔧 [Preview Service] LaTeX availability check completed in', duration, 'ms');
      console.log('🔧 [Preview Service] Result from compiler:', {
        available: result.available,
        compilers: result.compilers,
        compilersCount: result.compilers?.length || 0,
        version: result.version,
        resultType: typeof result,
        resultKeys: Object.keys(result)
      });
      
      // Validate result structure
      if (typeof result !== 'object' || result === null) {
        console.error('❌ [Preview Service] Invalid result type from compiler:', typeof result);
        throw new Error(`Invalid result type: ${typeof result}`);
      }
      
      if (typeof result.available !== 'boolean') {
        console.error('❌ [Preview Service] Invalid available field:', result.available);
        throw new Error(`Invalid available field: ${result.available}`);
      }
      
      if (!Array.isArray(result.compilers)) {
        console.error('❌ [Preview Service] Invalid compilers field:', result.compilers);
        throw new Error(`Invalid compilers field: ${result.compilers}`);
      }
      
      console.log('✅ [Preview Service] LaTeX availability check successful');
      return result;
    } catch (error) {
      console.error('❌ [Preview Service] LaTeX availability check failed:', error);
      console.error('❌ [Preview Service] Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack?.substring(0, 500) : 'No stack trace'
      });
      
      const fallbackResult = {
        available: false,
        compilers: [],
        version: undefined,
      };
      console.log('🔧 [Preview Service] Returning fallback result:', fallbackResult);
      return fallbackResult;
    } finally {
      console.log('🔧 [Preview Service] ===== LATEX AVAILABILITY CHECK COMPLETE =====');
    }
  }

  /**
   * Get compilation statistics
   */
  public getCompilationStats(): {
    totalCompilations: number;
    averageDuration: number;
    successRate: number;
  } {
    // This would be implemented with actual statistics tracking
    return {
      totalCompilations: 0,
      averageDuration: 0,
      successRate: 0,
    };
  }

  /**
   * Process base64 images in presentation by saving them as temporary files
   */
  private async processBase64Images(presentation: Presentation): Promise<Presentation> {
    const processedSlides = await Promise.all(
      presentation.slides.map(async (slide) => {
        const processedElements = await Promise.all(
          slide.elements.map(async (element) => {
            if (element.type === 'image' && element.content?.startsWith('data:image/')) {
              try {
                // Extract image format and data
                const matches = element.content.match(/^data:image\/([a-zA-Z]+);base64,(.+)$/);
                if (matches) {
                  const [, format, base64Data] = matches;
                  
                  // Check size limit (20MB max to prevent crashes)
                  const sizeInBytes = (base64Data.length * 3) / 4; // Approximate base64 decoded size
                  const maxSizeInBytes = 20 * 1024 * 1024; // 20MB
                  
                  if (sizeInBytes > maxSizeInBytes) {
                    console.warn(`Image too large: ${(sizeInBytes / 1024 / 1024).toFixed(1)}MB, max allowed: 20MB`);
                    throw new Error(`Image too large: ${(sizeInBytes / 1024 / 1024).toFixed(1)}MB`);
                  }
                  
                  // Create temporary file using Electron's file system
                  if (window.electronAPI && (window.electronAPI as any).exportWriteFileBase64) {
                    const tempFileName = `temp_image_${element.id}.${format}`;
                    const tempPath = `/tmp/latex-images/${tempFileName}`;
                    
                    console.log(`[Preview Service] Saving image: ${tempFileName} (${(sizeInBytes / 1024).toFixed(1)}KB)`);
                    
                    // Save file using base64 data directly
                    const result = await (window.electronAPI as any).exportWriteFileBase64(tempPath, base64Data);
                    
                    if (result.success) {
                      console.log(`[Preview Service] Image saved successfully: ${result.filePath}`);
                      // Return element with file path instead of base64
                      return {
                        ...element,
                        content: result.filePath
                      };
                    } else {
                      console.error('Failed to save image:', result.error);
                      throw new Error(result.error);
                    }
                  }
                }
              } catch (error) {
                console.error('Failed to process base64 image:', error);
                // Return element with placeholder content for failed images
                return {
                  ...element,
                  content: 'example-image' // LaTeX built-in placeholder
                };
              }
            }
            return element;
          })
        );

        return {
          ...slide,
          elements: processedElements
        };
      })
    );

    return {
      ...presentation,
      slides: processedSlides
    };
  }
}

// Export singleton instance
export const previewService = new PreviewService();

// PreviewState and PreviewOptions are already exported above