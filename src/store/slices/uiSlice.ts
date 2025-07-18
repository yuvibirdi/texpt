import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface UIState {
  // Editor state
  selectedElementIds: string[];
  isTextEditing: boolean;
  editingElementId: string | null;
  
  // Canvas state
  canvasZoom: number;
  canvasOffset: { x: number; y: number };
  showGrid: boolean;
  snapToGrid: boolean;
  
  // Panel visibility
  showSlideNavigation: boolean;
  showPropertiesPanel: boolean;
  showPreviewPanel: boolean;
  showNotesPanel: boolean;
  
  // Tool state
  activeTool: 'select' | 'text' | 'shape' | 'image' | 'draw';
  activeShapeType: 'rectangle' | 'circle' | 'line' | 'arrow' | null;
  
  // Compilation state
  isCompiling: boolean;
  compilationProgress: number;
  compilationErrors: string[];
  lastCompilationTime: Date | null;
  
  // Modal and dialog state
  showTemplateGallery: boolean;
  showExportDialog: boolean;
  showSettingsDialog: boolean;
  
  // Loading states
  isLoading: boolean;
  loadingMessage: string;
  
  // Error handling
  error: string | null;
  notifications: Array<{
    id: string;
    type: 'info' | 'success' | 'warning' | 'error';
    title: string;
    message: string;
    duration?: number;
    timestamp: Date;
  }>;
}

const initialState: UIState = {
  selectedElementIds: [],
  isTextEditing: false,
  editingElementId: null,
  
  canvasZoom: 1,
  canvasOffset: { x: 0, y: 0 },
  showGrid: false,
  snapToGrid: true,
  
  showSlideNavigation: true,
  showPropertiesPanel: true,
  showPreviewPanel: true,
  showNotesPanel: false,
  
  activeTool: 'select',
  activeShapeType: null,
  
  isCompiling: false,
  compilationProgress: 0,
  compilationErrors: [],
  lastCompilationTime: null,
  
  showTemplateGallery: false,
  showExportDialog: false,
  showSettingsDialog: false,
  
  isLoading: false,
  loadingMessage: '',
  
  error: null,
  notifications: [],
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    // Element selection
    selectElements: (state, action: PayloadAction<string[]>) => {
      state.selectedElementIds = action.payload;
    },
    
    addToSelection: (state, action: PayloadAction<string>) => {
      if (!state.selectedElementIds.includes(action.payload)) {
        state.selectedElementIds.push(action.payload);
      }
    },
    
    removeFromSelection: (state, action: PayloadAction<string>) => {
      state.selectedElementIds = state.selectedElementIds.filter(
        id => id !== action.payload
      );
    },
    
    clearSelection: (state) => {
      state.selectedElementIds = [];
    },
    
    // Text editing
    startTextEditing: (state, action: PayloadAction<string>) => {
      state.isTextEditing = true;
      state.editingElementId = action.payload;
    },
    
    stopTextEditing: (state) => {
      state.isTextEditing = false;
      state.editingElementId = null;
    },
    
    // Canvas controls
    setCanvasZoom: (state, action: PayloadAction<number>) => {
      state.canvasZoom = Math.max(0.1, Math.min(5, action.payload));
    },
    
    setCanvasOffset: (state, action: PayloadAction<{ x: number; y: number }>) => {
      state.canvasOffset = action.payload;
    },
    
    toggleGrid: (state) => {
      state.showGrid = !state.showGrid;
    },
    
    toggleSnapToGrid: (state) => {
      state.snapToGrid = !state.snapToGrid;
    },
    
    // Panel visibility
    toggleSlideNavigation: (state) => {
      state.showSlideNavigation = !state.showSlideNavigation;
    },
    
    togglePropertiesPanel: (state) => {
      state.showPropertiesPanel = !state.showPropertiesPanel;
    },
    
    togglePreviewPanel: (state) => {
      state.showPreviewPanel = !state.showPreviewPanel;
    },
    
    toggleNotesPanel: (state) => {
      state.showNotesPanel = !state.showNotesPanel;
    },
    
    // Tool selection
    setActiveTool: (state, action: PayloadAction<UIState['activeTool']>) => {
      state.activeTool = action.payload;
      if (action.payload !== 'shape') {
        state.activeShapeType = null;
      }
    },
    
    setActiveShapeType: (state, action: PayloadAction<UIState['activeShapeType']>) => {
      state.activeShapeType = action.payload;
      if (action.payload) {
        state.activeTool = 'shape';
      }
    },
    
    // Compilation state
    startCompilation: (state) => {
      state.isCompiling = true;
      state.compilationProgress = 0;
      state.compilationErrors = [];
    },
    
    updateCompilationProgress: (state, action: PayloadAction<number>) => {
      state.compilationProgress = action.payload;
    },
    
    finishCompilation: (state, action: PayloadAction<{ errors?: string[] }>) => {
      state.isCompiling = false;
      state.compilationProgress = 100;
      state.compilationErrors = action.payload.errors || [];
      state.lastCompilationTime = new Date();
    },
    
    // Modal dialogs
    showTemplateGallery: (state) => {
      state.showTemplateGallery = true;
    },
    
    hideTemplateGallery: (state) => {
      state.showTemplateGallery = false;
    },
    
    showExportDialog: (state) => {
      state.showExportDialog = true;
    },
    
    hideExportDialog: (state) => {
      state.showExportDialog = false;
    },
    
    showSettingsDialog: (state) => {
      state.showSettingsDialog = true;
    },
    
    hideSettingsDialog: (state) => {
      state.showSettingsDialog = false;
    },
    
    // Loading state
    setLoading: (state, action: PayloadAction<{ isLoading: boolean; message?: string }>) => {
      state.isLoading = action.payload.isLoading;
      state.loadingMessage = action.payload.message || '';
    },
    
    setIsLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    
    setLoadingMessage: (state, action: PayloadAction<string>) => {
      state.loadingMessage = action.payload;
    },
    
    // Error handling
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    
    addNotification: (state, action: PayloadAction<Omit<UIState['notifications'][0], 'id' | 'timestamp'>>) => {
      const notification = {
        ...action.payload,
        id: Date.now().toString(),
        timestamp: new Date(),
      };
      state.notifications.push(notification);
    },
    
    removeNotification: (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.filter(
        notification => notification.id !== action.payload
      );
    },
    
    clearNotifications: (state) => {
      state.notifications = [];
    },
  },
});

export const {
  selectElements,
  addToSelection,
  removeFromSelection,
  clearSelection,
  startTextEditing,
  stopTextEditing,
  setCanvasZoom,
  setCanvasOffset,
  toggleGrid,
  toggleSnapToGrid,
  toggleSlideNavigation,
  togglePropertiesPanel,
  togglePreviewPanel,
  toggleNotesPanel,
  setActiveTool,
  setActiveShapeType,
  startCompilation,
  updateCompilationProgress,
  finishCompilation,
  showTemplateGallery,
  hideTemplateGallery,
  showExportDialog,
  hideExportDialog,
  showSettingsDialog,
  hideSettingsDialog,
  setLoading,
  setIsLoading,
  setLoadingMessage,
  setError,
  addNotification,
  removeNotification,
  clearNotifications,
} = uiSlice.actions;

export default uiSlice.reducer;