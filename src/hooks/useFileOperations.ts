import { useCallback, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { 
  loadPresentation, 
  markAsSaved, 
  createPresentation,
  updatePresentationSettings
} from '../store/slices/presentationSlice';
import { 
  addNotification, 
  setIsLoading, 
  setLoadingMessage 
} from '../store/slices/uiSlice';
import { fileService, RecentFile } from '../services/fileService';
import { Presentation } from '../types/presentation';

export interface UseFileOperationsReturn {
  // File operations
  savePresentation: (showDialog?: boolean) => Promise<boolean>;
  loadPresentation: (filePath?: string) => Promise<boolean>;
  createNewPresentation: (title?: string) => void;
  
  // Auto-save
  startAutoSave: () => void;
  stopAutoSave: () => void;
  toggleAutoSave: (enabled: boolean) => void;
  
  // Recent files
  recentFiles: RecentFile[];
  openRecentFile: (filePath: string) => Promise<boolean>;
  clearRecentFiles: () => void;
  removeFromRecentFiles: (filePath: string) => void;
  
  // Status
  currentFilePath: string | null;
  isModified: boolean;
  hasUnsavedChanges: boolean;
  
  // Configuration
  configureAutoSave: (interval: number) => void;
}

export const useFileOperations = (): UseFileOperationsReturn => {
  const dispatch = useDispatch();
  const presentation = useSelector((state: RootState) => state.presentation.currentPresentation);
  const isModified = useSelector((state: RootState) => state.presentation.isModified);
  const autoSaveSettings = useSelector((state: RootState) => 
    state.presentation.currentPresentation?.settings
  );
  
  const recentFilesRef = useRef<RecentFile[]>([]);
  const currentFilePathRef = useRef<string | null>(null);
  const isModifiedRef = useRef<boolean>(false);

  // Update refs when state changes
  useEffect(() => {
    isModifiedRef.current = isModified;
    currentFilePathRef.current = fileService.getCurrentFilePath();
    recentFilesRef.current = fileService.getRecentFiles();
  }, [isModified]);

  // Initialize file service
  useEffect(() => {
    // Configure file service
    if (autoSaveSettings) {
      fileService.configure({
        autoSaveEnabled: autoSaveSettings.autoSave,
        autoSaveInterval: autoSaveSettings.autoSaveInterval,
        maxRecentFiles: 10,
        fileExtension: 'lpe'
      });
    }

    // Set up callbacks
    fileService.setCallbacks(
      // Auto-save callback
      () => {
        if (presentation) {
          return presentation;
        }
        throw new Error('No presentation available for auto-save');
      },
      // Error callback
      (error: string) => {
        dispatch(addNotification({
          id: `file-error-${Date.now()}`,
          type: 'error',
          title: 'File Operation Error',
          message: error,
          duration: 5000
        }));
      }
    );

    // Start auto-save if enabled
    if (autoSaveSettings?.autoSave && presentation) {
      fileService.startAutoSave(() => presentation);
    }

    return () => {
      fileService.cleanup();
    };
  }, [dispatch, presentation, autoSaveSettings]);

  // Track modifications
  useEffect(() => {
    if (isModified) {
      fileService.markAsModified();
    } else {
      fileService.markAsSaved();
    }
  }, [isModified]);

  const savePresentation = useCallback(async (showDialog: boolean = false): Promise<boolean> => {
    if (!presentation) {
      dispatch(addNotification({
        id: `save-error-${Date.now()}`,
        type: 'error',
        title: 'Save Error',
        message: 'No presentation to save',
        duration: 3000
      }));
      return false;
    }

    dispatch(setIsLoading(true));
    dispatch(setLoadingMessage('Saving presentation...'));

    try {
      const currentPath = fileService.getCurrentFilePath();
      const filePath = showDialog ? undefined : currentPath || undefined;
      
      const result = await fileService.savePresentation(presentation, filePath);
      
      if (result.success) {
        dispatch(markAsSaved());
        dispatch(addNotification({
          id: `save-success-${Date.now()}`,
          type: 'success',
          title: 'Saved',
          message: `Presentation saved successfully`,
          duration: 2000
        }));
        
        // Update current file path
        if (result.filePath) {
          fileService.setCurrentFilePath(result.filePath);
        }
        
        return true;
      } else if (!result.canceled) {
        dispatch(addNotification({
          id: `save-error-${Date.now()}`,
          type: 'error',
          title: 'Save Failed',
          message: result.error || 'Unknown error occurred',
          duration: 5000
        }));
      }
      
      return false;
    } catch (error) {
      dispatch(addNotification({
        id: `save-error-${Date.now()}`,
        type: 'error',
        title: 'Save Failed',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        duration: 5000
      }));
      return false;
    } finally {
      dispatch(setIsLoading(false));
      dispatch(setLoadingMessage(''));
    }
  }, [presentation, dispatch]);

  const loadPresentationFile = useCallback(async (filePath?: string): Promise<boolean> => {
    dispatch(setIsLoading(true));
    dispatch(setLoadingMessage('Loading presentation...'));

    try {
      const result = await fileService.loadPresentation(filePath);
      
      if (result.success && result.presentation) {
        dispatch(loadPresentation(result.presentation));
        dispatch(addNotification({
          id: `load-success-${Date.now()}`,
          type: 'success',
          title: 'Loaded',
          message: `Presentation "${result.presentation.title}" loaded successfully`,
          duration: 2000
        }));
        
        return true;
      } else if (!result.canceled) {
        dispatch(addNotification({
          id: `load-error-${Date.now()}`,
          type: 'error',
          title: 'Load Failed',
          message: result.error || 'Unknown error occurred',
          duration: 5000
        }));
      }
      
      return false;
    } catch (error) {
      dispatch(addNotification({
        id: `load-error-${Date.now()}`,
        type: 'error',
        title: 'Load Failed',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        duration: 5000
      }));
      return false;
    } finally {
      dispatch(setIsLoading(false));
      dispatch(setLoadingMessage(''));
    }
  }, [dispatch]);

  const createNewPresentation = useCallback((title?: string) => {
    // Check for unsaved changes
    if (isModifiedRef.current) {
      const shouldContinue = window.confirm(
        'You have unsaved changes. Creating a new presentation will lose these changes. Continue?'
      );
      if (!shouldContinue) {
        return;
      }
    }

    dispatch(createPresentation({ title }));
    fileService.setCurrentFilePath(null);
    fileService.markAsSaved();
    
    dispatch(addNotification({
      id: `new-presentation-${Date.now()}`,
      type: 'success',
      title: 'New Presentation',
      message: 'New presentation created',
      duration: 2000
    }));
  }, [dispatch]);

  const startAutoSave = useCallback(() => {
    if (presentation) {
      fileService.startAutoSave(() => presentation);
    }
  }, [presentation]);

  const stopAutoSave = useCallback(() => {
    fileService.stopAutoSave();
  }, []);

  const toggleAutoSave = useCallback((enabled: boolean) => {
    if (presentation) {
      dispatch(updatePresentationSettings({ autoSave: enabled }));
      
      if (enabled) {
        fileService.startAutoSave(() => presentation);
      } else {
        fileService.stopAutoSave();
      }
    }
  }, [presentation, dispatch]);

  const openRecentFile = useCallback(async (filePath: string): Promise<boolean> => {
    return await loadPresentationFile(filePath);
  }, [loadPresentationFile]);

  const clearRecentFiles = useCallback(() => {
    fileService.clearRecentFiles();
    recentFilesRef.current = [];
  }, []);

  const removeFromRecentFiles = useCallback((filePath: string) => {
    fileService.removeFromRecentFiles(filePath);
    recentFilesRef.current = fileService.getRecentFiles();
  }, []);

  const configureAutoSave = useCallback((interval: number) => {
    if (presentation) {
      dispatch(updatePresentationSettings({ autoSaveInterval: interval }));
      fileService.configure({ autoSaveInterval: interval });
    }
  }, [presentation, dispatch]);

  return {
    // File operations
    savePresentation,
    loadPresentation: loadPresentationFile,
    createNewPresentation,
    
    // Auto-save
    startAutoSave,
    stopAutoSave,
    toggleAutoSave,
    
    // Recent files
    recentFiles: fileService.getRecentFiles(),
    openRecentFile,
    clearRecentFiles,
    removeFromRecentFiles,
    
    // Status
    currentFilePath: fileService.getCurrentFilePath(),
    isModified: fileService.getIsModified(),
    hasUnsavedChanges: isModified,
    
    // Configuration
    configureAutoSave
  };
};