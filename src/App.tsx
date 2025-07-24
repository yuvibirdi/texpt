import { useEffect, useState, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fabric } from 'fabric';
import { RootState } from './store';
import {
  addSlide,
  deleteSlide,
  selectSlide,
  duplicateSlide
} from './store/slices/presentationSlice';
import {
  showSettingsDialog,
  hideSettingsDialog
} from './store/slices/uiSlice';
import { useFileOperations } from './hooks/useFileOperations';
import { useUndoRedo, useActionRecorder } from './hooks/useUndoRedo';
import { crashRecoveryService, RecoveryData } from './services/crashRecoveryService';
import { accessibilityService } from './services/accessibilityService';
import SlideNavigation from './components/SlideNavigation';
import SlideCanvas from './components/SlideCanvas';
import SimpleTextCanvas from './components/SimpleTextCanvas';
import PreviewPane from './components/PreviewPane';
import { PPTXImportDialog } from './components/PPTXImportDialog';

import CrashRecoveryDialog from './components/CrashRecoveryDialog';
import CompilationErrorDisplay, { CompilationError } from './components/CompilationErrorDisplay';
import AccessibilitySettings from './components/AccessibilitySettings';
import './App.css';

function App() {
  console.log('🚀 [App] ===== APP COMPONENT RENDERING =====');
  console.log('🚀 [App] Fabric.js version check:', {
    hasFabric: typeof fabric !== 'undefined',
    fabricVersion: typeof fabric !== 'undefined' ? fabric.version : 'not loaded'
  });
  console.log('🚀 [App] ===== APP COMPONENT RENDERING =====');
  console.log('🚀 [App] Environment info:', {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    onLine: navigator.onLine,
    cookieEnabled: navigator.cookieEnabled,
    location: window.location.href,
    hasElectronAPI: !!window.electronAPI,
    electronAPIKeys: window.electronAPI ? Object.keys(window.electronAPI) : 'none'
  });
  
  const dispatch = useDispatch();
  const presentation = useSelector((state: RootState) => state.presentation.currentPresentation);
  const currentSlideId = useSelector((state: RootState) => state.presentation.currentSlideId);
  const currentSlide = presentation?.slides.find((slide) => slide.id === currentSlideId);
  const showSettings = useSelector((state: RootState) => state.ui.showSettingsDialog);
  const accessibilitySettings = useSelector((state: RootState) => state.ui.accessibility);
  
  console.log('📊 [App] Redux state:', {
    hasPresentation: !!presentation,
    presentationTitle: presentation?.title,
    slideCount: presentation?.slides.length || 0,
    currentSlideId,
    hasCurrentSlide: !!currentSlide,
    currentSlideTitle: currentSlide?.title,
    showSettings,
    accessibilitySettings: {
      announceChanges: accessibilitySettings.announceChanges,
      highContrastMode: accessibilitySettings.highContrastMode,
      keyboardNavigation: accessibilitySettings.keyboardNavigation,
      screenReaderSupport: accessibilitySettings.screenReaderSupport
    }
  });
  
  // State for dialogs
  const [isPPTXImportDialogOpen, setIsPPTXImportDialogOpen] = useState(false);
  const [isCrashRecoveryDialogOpen, setIsCrashRecoveryDialogOpen] = useState(false);
  
  // State for compilation errors
  const [compilationErrors, setCompilationErrors] = useState<CompilationError[]>([]);
  
  // Undo/Redo functionality
  const { canUndo, canRedo, undo, redo } = useUndoRedo();
  const { withUndo } = useActionRecorder();
  
  // File operations hook
  const {
    savePresentation: saveFile,
    loadPresentation: loadFile,
    createNewPresentation,
    startAutoSave
  } = useFileOperations();

  useEffect(() => {
    // Initialize accessibility service with current settings
    accessibilityService.updateSettings(accessibilitySettings);
    
    // Register application-specific keyboard shortcuts
    accessibilityService.registerShortcut('global', {
      key: ',',
      ctrlKey: true,
      description: 'Open accessibility settings',
      action: () => dispatch(showSettingsDialog())
    });

    accessibilityService.registerShortcut('global', {
      key: 't',
      ctrlKey: true,
      description: 'Add new text element',
      action: handleAddTextElement
    });

    accessibilityService.registerShortcut('canvas', {
      key: 'Delete',
      description: 'Delete selected element',
      action: handleDeleteSelectedElement
    });

    accessibilityService.registerShortcut('navigation', {
      key: 'ArrowUp',
      description: 'Previous slide',
      action: handlePreviousSlide
    });

    accessibilityService.registerShortcut('navigation', {
      key: 'ArrowDown',
      description: 'Next slide',
      action: handleNextSlide
    });

    // Completely disable crash recovery to prevent dialog issues
    crashRecoveryService.clearAllBackups();

    // Start auto-save when app loads
    startAutoSave();
    
    // Disable auto-backup to prevent constant recovery dialogs
    // crashRecoveryService.startAutoBackup(presentation);

    // Set up crash recovery event listeners
    const handleFinalBackup = () => {
      if (presentation) {
        crashRecoveryService.createBackup(presentation, false);
      }
    };

    const handleVisibilityBackup = () => {
      if (presentation) {
        crashRecoveryService.createBackup(presentation, true);
      }
    };

    window.addEventListener('create-final-backup', handleFinalBackup);
    window.addEventListener('create-visibility-backup', handleVisibilityBackup);
    
    // Check if we're running in Electron
    if (window.electronAPI) {
      const handleMenuAction = (action: string) => {
        switch (action) {
          case 'new-presentation':
            withUndo('new-presentation', 'Create new presentation', () => {
              createNewPresentation('New Presentation');
            });
            break;
          case 'open-presentation':
            handleOpenPresentation();
            break;
          case 'save-presentation':
            handleSavePresentation();
            break;
          case 'save-presentation-as':
            handleSavePresentationAs();
            break;
          case 'export-pdf':
            handleExportPDF();
            break;
          case 'new-slide':
            handleNewSlide();
            break;
          case 'duplicate-slide':
            handleDuplicateSlide();
            break;
          case 'delete-slide':
            handleDeleteSlide();
            break;
          case 'previous-slide':
            handlePreviousSlide();
            break;
          case 'next-slide':
            handleNextSlide();
            break;
          case 'import-pptx':
            handleImportPPTX();
            break;
          case 'undo':
            undo();
            break;
          case 'redo':
            redo();
            break;
          default:
            console.log('Unknown menu action:', action);
        }
      };

      window.electronAPI.onMenuAction(handleMenuAction);

      // Cleanup listener on unmount
      return () => {
        window.electronAPI?.removeAllListeners('menu-action');
        window.removeEventListener('create-final-backup', handleFinalBackup);
        window.removeEventListener('create-visibility-backup', handleVisibilityBackup);
        crashRecoveryService.stopAutoBackup();
      };
    }

    return () => {
      window.removeEventListener('create-final-backup', handleFinalBackup);
      window.removeEventListener('create-visibility-backup', handleVisibilityBackup);
      crashRecoveryService.stopAutoBackup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, startAutoSave, presentation, withUndo, undo, redo]);

  const handleOpenPresentation = useCallback(async () => {
    await loadFile();
  }, [loadFile]);

  const handleSavePresentation = useCallback(async () => {
    await saveFile(false);
  }, [saveFile]);

  const handleSavePresentationAs = async () => {
    await saveFile(true);
  };

  const handleExportPDF = async () => {
    if (window.electronAPI && presentation) {
      try {
        // TODO: Generate LaTeX source from presentation
        const latexSource = '% LaTeX source will be generated here';
        const result = await window.electronAPI.compileLatex(latexSource);
        console.log('PDF export result:', result);
      } catch (error) {
        console.error('Failed to export PDF:', error);
      }
    }
  };

  const handleNewSlide = () => {
    if (presentation) {
      withUndo('add-slide', 'Add new slide', () => {
        dispatch(addSlide({}));
      });
    }
  };

  const handleDuplicateSlide = () => {
    if (presentation && currentSlideId) {
      withUndo('duplicate-slide', 'Duplicate slide', () => {
        dispatch(duplicateSlide(currentSlideId));
      });
    }
  };

  const handleDeleteSlide = () => {
    if (presentation && currentSlideId && presentation.slides.length > 1) {
      withUndo('delete-slide', 'Delete slide', () => {
        dispatch(deleteSlide(currentSlideId));
      });
    }
  };

  const handlePreviousSlide = () => {
    if (presentation && currentSlideId) {
      const currentIndex = presentation.slides.findIndex(slide => slide.id === currentSlideId);
      if (currentIndex > 0) {
        dispatch(selectSlide(presentation.slides[currentIndex - 1].id));
      }
    }
  };

  const handleNextSlide = () => {
    if (presentation && currentSlideId) {
      const currentIndex = presentation.slides.findIndex(slide => slide.id === currentSlideId);
      if (currentIndex < presentation.slides.length - 1) {
        dispatch(selectSlide(presentation.slides[currentIndex + 1].id));
      }
    }
  };

  const handleImportPPTX = () => {
    setIsPPTXImportDialogOpen(true);
  };

  const handleClosePPTXImportDialog = () => {
    setIsPPTXImportDialogOpen(false);
  };

  // Crash recovery handlers
  const handleCrashRecovery = (recoveryData: RecoveryData) => {
    console.log('Recovered presentation:', recoveryData.presentation.title);
    // The presentation is already loaded by the dialog
    setIsCrashRecoveryDialogOpen(false);
  };

  const handleDismissCrashRecovery = () => {
    setIsCrashRecoveryDialogOpen(false);
  };

  const handleCloseCrashRecoveryDialog = () => {
    setIsCrashRecoveryDialogOpen(false);
  };

  // Compilation error handlers
  const handleCompilationErrorClick = (error: CompilationError) => {
    // Navigate to the error location
    if (error.slideId && error.slideId !== currentSlideId) {
      dispatch(selectSlide(error.slideId));
    }
    
    // If there's an element ID, we could highlight it in the canvas
    if (error.elementId) {
      // TODO: Implement element highlighting in SlideCanvas
      console.log('Navigate to element:', error.elementId);
    }
  };

  const handleDismissCompilationError = (errorId: string) => {
    setCompilationErrors(errors => errors.filter(e => e.id !== errorId));
  };

  const handleDismissAllCompilationErrors = () => {
    setCompilationErrors([]);
  };

  // Accessibility handler functions
  const handleAddTextElement = useCallback(() => {
    console.log('🎯 [App] ===== HANDLE ADD TEXT ELEMENT =====');
    console.log('🎯 [App] Text element handler called from accessibility service');
    // This will be called by the accessibility service
    // For now, we'll trigger the same action as Ctrl+T in SlideCanvas
    accessibilityService.announce('Add text element shortcut triggered');
  }, []);

  const handleDeleteSelectedElement = useCallback(() => {
    // This will be handled by the SlideCanvas component
    accessibilityService.announce('Delete element shortcut triggered');
  }, []);

  const handleCloseAccessibilitySettings = () => {
    dispatch(hideSettingsDialog());
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for modifier keys (Ctrl/Cmd)
      const isCtrlOrCmd = event.ctrlKey || event.metaKey;
      
      if (isCtrlOrCmd) {
        switch (event.key.toLowerCase()) {
          case 'z':
            if (event.shiftKey) {
              // Ctrl+Shift+Z or Cmd+Shift+Z for redo
              event.preventDefault();
              redo();
            } else {
              // Ctrl+Z or Cmd+Z for undo
              event.preventDefault();
              undo();
            }
            break;
          case 'y':
            // Ctrl+Y for redo (Windows style)
            if (!event.shiftKey) {
              event.preventDefault();
              redo();
            }
            break;
          case 's':
            // Ctrl+S or Cmd+S for save
            event.preventDefault();
            handleSavePresentation();
            break;
          case 'n':
            // Ctrl+N or Cmd+N for new presentation
            event.preventDefault();
            withUndo('new-presentation', 'Create new presentation', () => {
              createNewPresentation('New Presentation');
            });
            break;
          case 'o':
            // Ctrl+O or Cmd+O for open
            event.preventDefault();
            handleOpenPresentation();
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, handleSavePresentation, handleOpenPresentation, withUndo, createNewPresentation]);

  return (
    <div className="App" role="application" aria-label="LaTeX Presentation Editor">
      <SlideNavigation />
      <div className="main-content">
        <header className="app-header" role="banner">
          <h1>LaTeX Presentation Editor</h1>
          <div className="presentation-info" aria-live="polite">
            {presentation && (
              <span aria-label={`Current presentation: ${presentation.title}, ${presentation.slides.length} slides`}>
                {presentation.title} - {presentation.slides.length} slides
              </span>
            )}
            {/* Undo/Redo indicators */}
            <div className="undo-redo-info" role="toolbar" aria-label="Undo and Redo actions">
              <button 
                onClick={undo} 
                disabled={!canUndo}
                title={`Undo${canUndo ? '' : ' (nothing to undo)'}`}
                aria-label={`Undo${canUndo ? '' : ' (nothing to undo)'}`}
                className="undo-redo-button"
                type="button"
              >
                ↶
              </button>
              <button 
                onClick={redo} 
                disabled={!canRedo}
                title={`Redo${canRedo ? '' : ' (nothing to redo)'}`}
                aria-label={`Redo${canRedo ? '' : ' (nothing to redo)'}`}
                className="undo-redo-button"
                type="button"
              >
                ↷
              </button>
              <button
                onClick={() => dispatch(showSettingsDialog())}
                title="Accessibility Settings (Ctrl+,)"
                aria-label="Open accessibility settings"
                className="accessibility-button"
                type="button"
              >
                ⚙️
              </button>
            </div>
          </div>
        </header>
        
        {/* Compilation Errors Display */}
        {compilationErrors.length > 0 && (
          <CompilationErrorDisplay
            errors={compilationErrors}
            onErrorClick={handleCompilationErrorClick}
            onDismiss={handleDismissCompilationError}
            onDismissAll={handleDismissAllCompilationErrors}
            className="compilation-errors-panel"
          />
        )}
        
        <div className="editor-area">
          <div className="editor-content">
            {currentSlide ? (
              <div className="slide-editor">
                <SimpleTextCanvas 
                  slideId={currentSlide.id}
                  width={presentation?.settings.slideSize.width || 800}
                  height={presentation?.settings.slideSize.height || 600}
                />
              </div>
            ) : (
              <div className="no-slide-selected">
                <p>No slide selected</p>
              </div>
            )}
          </div>
          <PreviewPane className="preview-panel" />
        </div>
      </div>
      
      {/* PPTX Import Dialog */}
      <PPTXImportDialog
        isOpen={isPPTXImportDialogOpen}
        onClose={handleClosePPTXImportDialog}
      />
      
      {/* Crash Recovery Dialog */}
      <CrashRecoveryDialog
        isOpen={isCrashRecoveryDialogOpen}
        onClose={handleCloseCrashRecoveryDialog}
        onRecover={handleCrashRecovery}
        onDismiss={handleDismissCrashRecovery}
      />
      
      {/* Accessibility Settings Dialog */}
      <AccessibilitySettings
        isOpen={showSettings}
        onClose={handleCloseAccessibilitySettings}
      />
    </div>
  );
}

export default App;