import { useCallback, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { 
  addNotification, 
  setIsLoading, 
  setLoadingMessage 
} from '../store/slices/uiSlice';
import { exportService, ExportOptions, ExportResult, ExportProgress } from '../services/exportService';
import { Presentation } from '../types/presentation';

export interface UseExportOperationsReturn {
  // Export operations
  exportPresentation: (format: string, options?: Partial<ExportOptions>) => Promise<boolean>;
  
  // Export status
  isExporting: boolean;
  exportProgress: ExportProgress | null;
  
  // Supported formats
  getSupportedFormats: () => Array<{
    id: string;
    name: string;
    extension: string;
    description: string;
    features: string[];
  }>;
  
  // Quick export methods
  exportToPDF: (options?: Partial<ExportOptions>) => Promise<boolean>;
  exportToHTML: (options?: Partial<ExportOptions>) => Promise<boolean>;
  exportToLaTeX: (options?: Partial<ExportOptions>) => Promise<boolean>;
  exportToMarkdown: (options?: Partial<ExportOptions>) => Promise<boolean>;
  exportToJSON: (options?: Partial<ExportOptions>) => Promise<boolean>;
}

export const useExportOperations = (): UseExportOperationsReturn => {
  const dispatch = useDispatch();
  const presentation = useSelector((state: RootState) => state.presentation.currentPresentation);
  
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null);

  // Set up progress callback
  const handleExportProgress = useCallback((progress: ExportProgress) => {
    setExportProgress(progress);
    
    // Update loading state based on progress
    if (progress.stage === 'preparing') {
      dispatch(setIsLoading(true));
      dispatch(setLoadingMessage(progress.message));
    } else if (progress.stage === 'completed') {
      dispatch(setIsLoading(false));
      dispatch(setLoadingMessage(''));
      setIsExporting(false);
      setExportProgress(null);
    } else {
      dispatch(setLoadingMessage(progress.message));
    }
  }, [dispatch]);

  // Main export function
  const exportPresentation = useCallback(async (
    format: string,
    options: Partial<ExportOptions> = {}
  ): Promise<boolean> => {
    if (!presentation) {
      dispatch(addNotification({
        type: 'error',
        title: 'Export Error',
        message: 'No presentation to export',
        duration: 3000
      }));
      return false;
    }

    // Validate format
    const supportedFormats = exportService.getSupportedFormats();
    const formatInfo = supportedFormats.find(f => f.id === format);
    
    if (!formatInfo) {
      dispatch(addNotification({
        type: 'error',
        title: 'Export Error',
        message: `Unsupported export format: ${format}`,
        duration: 3000
      }));
      return false;
    }

    const exportOptions: ExportOptions = {
      format: format as any,
      quality: 'high',
      includeNotes: false,
      embedFonts: true,
      optimizeImages: true,
      standalone: true,
      theme: 'light',
      slideTransitions: true,
      ...options
    };

    // Validate export options
    const validation = exportService.validateExportOptions(exportOptions);
    if (!validation.valid) {
      dispatch(addNotification({
        type: 'error',
        title: 'Export Error',
        message: `Invalid export options: ${validation.errors.join(', ')}`,
        duration: 5000
      }));
      return false;
    }

    setIsExporting(true);
    setExportProgress(null);
    
    // Set up progress callback
    exportService.setProgressCallback(handleExportProgress);

    try {
      const result: ExportResult = await exportService.exportPresentation(presentation, exportOptions);
      
      if (result.success) {
        dispatch(addNotification({
          type: 'success',
          title: 'Export Successful',
          message: `${formatInfo.name} export completed successfully${result.outputPath ? ` at ${result.outputPath}` : ''}`,
          duration: 4000
        }));

        // Show additional metadata if available
        if (result.metadata) {
          const { slideCount, fileSize, format: resultFormat } = result.metadata;
          const fileSizeKB = Math.round(fileSize / 1024);
          
          dispatch(addNotification({
            type: 'info',
            title: 'Export Details',
            message: `Exported ${slideCount} slides to ${resultFormat.toUpperCase()} (${fileSizeKB} KB)`,
            duration: 3000
          }));
        }

        return true;
      } else {
        // Handle export failure
        dispatch(addNotification({
          type: 'error',
          title: 'Export Failed',
          message: result.error || 'Unknown error occurred during export',
          duration: 5000
        }));

        // Show warnings if available
        if (result.warnings && result.warnings.length > 0) {
          result.warnings.forEach((warning, index) => {
            dispatch(addNotification({
              type: 'warning',
              title: 'Export Warning',
              message: warning,
              duration: 4000
            }));
          });
        }

        return false;
      }
    } catch (error) {
      dispatch(addNotification({
        type: 'error',
        title: 'Export Failed',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        duration: 5000
      }));
      return false;
    } finally {
      setIsExporting(false);
      setExportProgress(null);
      dispatch(setIsLoading(false));
      dispatch(setLoadingMessage(''));
    }
  }, [presentation, dispatch, handleExportProgress]);

  // Quick export methods
  const exportToPDF = useCallback(async (options: Partial<ExportOptions> = {}): Promise<boolean> => {
    return await exportPresentation('pdf', {
      quality: 'high',
      embedFonts: true,
      optimizeImages: true,
      ...options
    });
  }, [exportPresentation]);

  const exportToHTML = useCallback(async (options: Partial<ExportOptions> = {}): Promise<boolean> => {
    return await exportPresentation('html', {
      standalone: true,
      slideTransitions: true,
      theme: 'light',
      ...options
    });
  }, [exportPresentation]);

  const exportToLaTeX = useCallback(async (options: Partial<ExportOptions> = {}): Promise<boolean> => {
    return await exportPresentation('latex', {
      quality: 'high',
      ...options
    });
  }, [exportPresentation]);

  const exportToMarkdown = useCallback(async (options: Partial<ExportOptions> = {}): Promise<boolean> => {
    return await exportPresentation('markdown', {
      includeNotes: true,
      ...options
    });
  }, [exportPresentation]);

  const exportToJSON = useCallback(async (options: Partial<ExportOptions> = {}): Promise<boolean> => {
    return await exportPresentation('json', options);
  }, [exportPresentation]);

  const getSupportedFormats = useCallback(() => {
    return exportService.getSupportedFormats();
  }, []);

  return {
    // Export operations
    exportPresentation,
    
    // Export status
    isExporting,
    exportProgress,
    
    // Supported formats
    getSupportedFormats,
    
    // Quick export methods
    exportToPDF,
    exportToHTML,
    exportToLaTeX,
    exportToMarkdown,
    exportToJSON
  };
};