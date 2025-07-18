import { EventEmitter } from 'events';
import { Presentation, Slide } from '../types/presentation';
import { latexCompiler, ILatexCompiler } from './latexCompilerFactory';
import { CompilationResult, CompilationProgress } from './latexCompiler';
import { latexGenerator } from './latexGenerator';

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
    return new Promise((resolve, reject) => {
      // Clear existing timeout
      if (this.compilationTimeout) {
        clearTimeout(this.compilationTimeout);
      }

      // Cancel existing compilation
      if (this.currentJobId) {
        latexCompiler.cancelJob(this.currentJobId);
      }

      // Debounce compilation
      this.compilationTimeout = setTimeout(async () => {
        try {
          this.emit('compilation-started');

          // Generate LaTeX source
          const latexSource = latexGenerator.generateDocument(presentation, {
            includePackages: true,
            includeDocumentClass: true,
            optimizeCode: true,
          });

          // Start compilation
          const jobId = await latexCompiler.compile(latexSource, {
            compiler: this.options.compiler,
            timeout: this.options.timeout,
            synctex: true,
          });

          this.currentJobId = jobId;

          // Set up one-time listeners for this specific job
          const handleCompleted = (result: CompilationResult) => {
            if (result.jobId === jobId) {
              latexCompiler.off('job-completed', handleCompleted);
              if (result.success) {
                resolve(jobId);
              } else {
                reject(new Error(result.errors.map(e => e.message).join('; ')));
              }
            }
          };

          latexCompiler.on('job-completed', handleCompleted);

        } catch (error) {
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
    return latexCompiler.checkLatexAvailability();
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
}

// Export singleton instance
export const previewService = new PreviewService();

// PreviewState and PreviewOptions are already exported above