import { useEffect, useRef, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { previewService, PreviewState } from '../services/previewService';
import { CompilationProgress } from '../services/latexCompiler';
import { latexGenerationService } from '../services/latexGenerationService';

interface UsePreviewOptions {
  autoCompile?: boolean;
  debounceMs?: number;
}

interface UsePreviewReturn {
  previewState: PreviewState;
  compilePresentation: () => Promise<void>;
  cancelCompilation: () => void;
  downloadPdf: (filename?: string) => void;
  navigateToSlide: (slideIndex: number) => void;
  isLatexAvailable: boolean;
  checkLatexAvailability: () => Promise<void>;
}

export const usePreview = (options: UsePreviewOptions = {}): UsePreviewReturn => {
  const presentation = useSelector((state: RootState) => state.presentation.currentPresentation);
  const currentSlideId = useSelector((state: RootState) => state.presentation.currentSlideId);
  const isModified = useSelector((state: RootState) => state.presentation.isModified);
  
  const [previewState, setPreviewState] = useState<PreviewState>({
    isCompiling: false,
    progress: 0,
    stage: 'idle',
    message: 'Ready to compile',
    lastCompiled: null,
    error: null,
    pdfUrl: null,
    currentSlideIndex: 0,
  });
  
  const [isLatexAvailable, setIsLatexAvailable] = useState(false);
  const hasInitialized = useRef(false);

  // Initialize preview service options
  useEffect(() => {
    if (options.autoCompile !== undefined || options.debounceMs !== undefined) {
      previewService.updateOptions({
        autoCompile: options.autoCompile,
        debounceMs: options.debounceMs,
      });
    }
  }, [options.autoCompile, options.debounceMs]);

  // Setup event listeners
  useEffect(() => {
    const handleCompilationStarted = () => {
      setPreviewState(prev => ({
        ...prev,
        isCompiling: true,
        progress: 0,
        stage: 'preparing',
        message: 'Starting compilation...',
        error: null,
      }));
    };

    const handleCompilationProgress = (progress: CompilationProgress) => {
      setPreviewState(prev => ({
        ...prev,
        progress: progress.progress,
        stage: progress.stage,
        message: progress.message,
      }));
    };

    const handleCompilationSuccess = ({ pdfUrl, duration, warnings }: {
      pdfUrl: string;
      duration: number;
      warnings: any[];
    }) => {
      setPreviewState(prev => ({
        ...prev,
        isCompiling: false,
        progress: 100,
        stage: 'completed',
        message: `Compilation successful (${duration}ms)`,
        lastCompiled: new Date(),
        error: null,
        pdfUrl,
      }));
    };

    const handleCompilationError = ({ errors, warnings, log }: {
      errors: any[];
      warnings: any[];
      log: string;
    }) => {
      const errorMessage = errors.length > 0 
        ? errors.map(e => e.message).join('; ')
        : 'Compilation failed';

      setPreviewState(prev => ({
        ...prev,
        isCompiling: false,
        error: errorMessage,
        message: 'Compilation failed',
      }));
    };

    const handleCompilationCancelled = () => {
      setPreviewState(prev => ({
        ...prev,
        isCompiling: false,
        message: 'Compilation cancelled',
      }));
    };

    const handleSlideNavigation = ({ slideIndex }: { slideIndex: number }) => {
      setPreviewState(prev => ({
        ...prev,
        currentSlideIndex: slideIndex,
      }));
    };

    // Add event listeners
    previewService.on('compilation-started', handleCompilationStarted);
    previewService.on('compilation-progress', handleCompilationProgress);
    previewService.on('compilation-success', handleCompilationSuccess);
    previewService.on('compilation-error', handleCompilationError);
    previewService.on('compilation-cancelled', handleCompilationCancelled);
    previewService.on('slide-navigation', handleSlideNavigation);

    return () => {
      // Remove event listeners
      previewService.off('compilation-started', handleCompilationStarted);
      previewService.off('compilation-progress', handleCompilationProgress);
      previewService.off('compilation-success', handleCompilationSuccess);
      previewService.off('compilation-error', handleCompilationError);
      previewService.off('compilation-cancelled', handleCompilationCancelled);
      previewService.off('slide-navigation', handleSlideNavigation);
    };
  }, []);

  // Check LaTeX availability on mount
  const checkLatexAvailability = useCallback(async () => {
    console.log('🎣 [usePreview] ===== STARTING LATEX AVAILABILITY CHECK =====');
    console.log('🎣 [usePreview] Current state:', {
      isLatexAvailable,
      hasPresentation: !!presentation,
      presentationTitle: presentation?.title,
      previewError: previewState.error
    });
    
    try {
      console.log('🎣 [usePreview] Calling previewService.checkLatexAvailability()...');
      const startTime = Date.now();
      const availability = await previewService.checkLatexAvailability();
      const duration = Date.now() - startTime;
      
      console.log('🎣 [usePreview] LaTeX availability check completed in', duration, 'ms');
      console.log('🎣 [usePreview] Availability result:', {
        available: availability.available,
        compilers: availability.compilers,
        version: availability.version,
        compilersCount: availability.compilers?.length || 0
      });
      
      setIsLatexAvailable(availability.available);
      
      if (!availability.available) {
        console.warn('❌ [usePreview] LaTeX not available, setting error state');
        setPreviewState(prev => ({
          ...prev,
          error: 'LaTeX not found. Please install TeX Live or MiKTeX.',
          message: 'LaTeX not available',
        }));
      } else {
        console.log('✅ [usePreview] LaTeX is available with compilers:', availability.compilers);
        const message = `LaTeX available (${availability.compilers.join(', ')})${availability.version ? ` v${availability.version}` : ''}`;
        setPreviewState(prev => ({
          ...prev,
          error: null,
          message,
        }));
      }
    } catch (error) {
      console.error('❌ [usePreview] LaTeX availability check failed:', error);
      console.error('❌ [usePreview] Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack?.substring(0, 300) : 'No stack trace'
      });
      
      setIsLatexAvailable(false);
      setPreviewState(prev => ({
        ...prev,
        error: `Failed to check LaTeX availability: ${error instanceof Error ? error.message : String(error)}`,
        message: 'LaTeX check failed',
      }));
    } finally {
      console.log('🎣 [usePreview] ===== LATEX AVAILABILITY CHECK COMPLETE =====');
    }
  }, [isLatexAvailable, presentation, previewState.error]);

  useEffect(() => {
    if (!hasInitialized.current) {
      checkLatexAvailability();
      hasInitialized.current = true;
    }
  }, [checkLatexAvailability]);

  // Auto-compile when presentation changes (but not during text editing)
  useEffect(() => {
    if (presentation && isModified && isLatexAvailable && options.autoCompile !== false) {
      // Check if any text elements are currently being edited
      // Check if LaTeX generation is in progress (but allow movement updates)
      const hasEditingText = latexGenerationService.isGenerationInProgress();
      
      if (!hasEditingText) {
        console.log('🎣 [usePreview] Triggering LaTeX compilation (no text being edited)');
        // Add a small delay to ensure UI updates are complete
        setTimeout(() => {
          previewService.updatePreview(presentation);
        }, 100);
      } else {
        console.log('🎣 [usePreview] Skipping LaTeX compilation (text being edited)');
      }
    }
  }, [presentation, isModified, isLatexAvailable, options.autoCompile]);

  // Sync preview with current slide
  useEffect(() => {
    if (presentation && currentSlideId) {
      previewService.syncWithSlide(currentSlideId, presentation);
    }
  }, [presentation, currentSlideId]);

  // Manual compilation
  const compilePresentation = useCallback(async () => {
    if (!presentation) {
      throw new Error('No presentation to compile');
    }
    
    if (!isLatexAvailable) {
      throw new Error('LaTeX is not available');
    }

    try {
      await previewService.compilePresentation(presentation);
    } catch (error) {
      throw error;
    }
  }, [presentation, isLatexAvailable]);

  // Cancel compilation
  const cancelCompilation = useCallback(() => {
    previewService.cancelCompilation();
  }, []);

  // Download PDF
  const downloadPdf = useCallback((filename?: string) => {
    const finalFilename = filename || `${presentation?.title || 'presentation'}.pdf`;
    previewService.downloadPdf(finalFilename);
  }, [presentation?.title]);

  // Navigate to slide
  const navigateToSlide = useCallback((slideIndex: number) => {
    previewService.navigateToSlide(slideIndex);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      previewService.cleanup();
    };
  }, []);

  return {
    previewState,
    compilePresentation,
    cancelCompilation,
    downloadPdf,
    navigateToSlide,
    isLatexAvailable,
    checkLatexAvailability,
  };
};

export default usePreview;