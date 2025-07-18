import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from './store';
import {
  addSlide,
  deleteSlide,
  selectSlide,
  duplicateSlide
} from './store/slices/presentationSlice';
import { useFileOperations } from './hooks/useFileOperations';
import SlideNavigation from './components/SlideNavigation';
import SlideCanvas from './components/SlideCanvas';
import PreviewPane from './components/PreviewPane';
import './App.css';

function App() {
  const dispatch = useDispatch();
  const presentation = useSelector((state: RootState) => state.presentation.currentPresentation);
  const currentSlideId = useSelector((state: RootState) => state.presentation.currentSlideId);
  const currentSlide = presentation?.slides.find((slide) => slide.id === currentSlideId);
  
  // File operations hook
  const {
    savePresentation: saveFile,
    loadPresentation: loadFile,
    createNewPresentation,
    startAutoSave,
    hasUnsavedChanges
  } = useFileOperations();

  useEffect(() => {
    // Start auto-save when app loads
    startAutoSave();
    
    // Check if we're running in Electron
    if (window.electronAPI) {
      const handleMenuAction = (action: string) => {
        switch (action) {
          case 'new-presentation':
            createNewPresentation('New Presentation');
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
          default:
            console.log('Unknown menu action:', action);
        }
      };

      window.electronAPI.onMenuAction(handleMenuAction);

      // Cleanup listener on unmount
      return () => {
        window.electronAPI.removeAllListeners('menu-action');
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, startAutoSave]);

  const handleOpenPresentation = async () => {
    await loadFile();
  };

  const handleSavePresentation = async () => {
    await saveFile(false);
  };

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
      dispatch(addSlide({}));
    }
  };

  const handleDuplicateSlide = () => {
    if (presentation && currentSlideId) {
      dispatch(duplicateSlide(currentSlideId));
    }
  };

  const handleDeleteSlide = () => {
    if (presentation && currentSlideId && presentation.slides.length > 1) {
      dispatch(deleteSlide(currentSlideId));
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

  return (
    <div className="App">
      <SlideNavigation />
      <div className="main-content">
        <header className="app-header">
          <h1>LaTeX Presentation Editor</h1>
          <div className="presentation-info">
            {presentation && (
              <span>{presentation.title} - {presentation.slides.length} slides</span>
            )}
          </div>
        </header>
        <div className="editor-area">
          <div className="editor-content">
            {currentSlide ? (
              <div className="slide-editor">
                <SlideCanvas 
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
    </div>
  );
}

export default App;