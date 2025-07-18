import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux';
import type { RootState, AppDispatch } from './index';

// Use throughout your app instead of plain `useDispatch` and `useSelector`
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

// Convenience selectors for common state access patterns
export const useCurrentPresentation = () => 
  useAppSelector(state => state.presentation.currentPresentation);

export const useCurrentSlide = () => {
  const presentation = useAppSelector(state => state.presentation.currentPresentation);
  const currentSlideId = useAppSelector(state => state.presentation.currentSlideId);
  
  return presentation?.slides.find(slide => slide.id === currentSlideId) || null;
};

export const useSlides = () => 
  useAppSelector(state => state.presentation.currentPresentation?.slides || []);

export const useSelectedElements = () => {
  const selectedElementIds = useAppSelector(state => state.ui.selectedElementIds);
  const currentSlide = useCurrentSlide();
  
  if (!currentSlide) return [];
  
  return currentSlide.elements.filter(element => 
    selectedElementIds.includes(element.id)
  );
};

export const useIsModified = () => 
  useAppSelector(state => state.presentation.isModified);

export const useCompilationState = () => 
  useAppSelector(state => ({
    isCompiling: state.ui.isCompiling,
    progress: state.ui.compilationProgress,
    errors: state.ui.compilationErrors,
    lastCompilationTime: state.ui.lastCompilationTime,
  }));

export const useCanvasState = () => 
  useAppSelector(state => ({
    zoom: state.ui.canvasZoom,
    offset: state.ui.canvasOffset,
    showGrid: state.ui.showGrid,
    snapToGrid: state.ui.snapToGrid,
  }));

export const useActiveTool = () => 
  useAppSelector(state => ({
    tool: state.ui.activeTool,
    shapeType: state.ui.activeShapeType,
  }));

export const usePanelVisibility = () => 
  useAppSelector(state => ({
    slideNavigation: state.ui.showSlideNavigation,
    properties: state.ui.showPropertiesPanel,
    preview: state.ui.showPreviewPanel,
    notes: state.ui.showNotesPanel,
  }));