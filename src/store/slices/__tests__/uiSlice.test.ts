import uiReducer, {
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
  setActiveTool,
  setActiveShapeType,
  startCompilation,
  updateCompilationProgress,
  finishCompilation,
  addNotification,
  removeNotification,
  clearNotifications,
  setError,
  setLoading,
} from '../uiSlice';

describe('uiSlice', () => {
  const initialState = {
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
    
    activeTool: 'select' as const,
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

  describe('element selection', () => {
    it('should select elements', () => {
      const action = selectElements(['element1', 'element2']);
      const state = uiReducer(initialState, action);
      
      expect(state.selectedElementIds).toEqual(['element1', 'element2']);
    });

    it('should add to selection', () => {
      const stateWithSelection = {
        ...initialState,
        selectedElementIds: ['element1'],
      };
      
      const action = addToSelection('element2');
      const state = uiReducer(stateWithSelection, action);
      
      expect(state.selectedElementIds).toEqual(['element1', 'element2']);
    });

    it('should not add duplicate to selection', () => {
      const stateWithSelection = {
        ...initialState,
        selectedElementIds: ['element1'],
      };
      
      const action = addToSelection('element1');
      const state = uiReducer(stateWithSelection, action);
      
      expect(state.selectedElementIds).toEqual(['element1']);
    });

    it('should remove from selection', () => {
      const stateWithSelection = {
        ...initialState,
        selectedElementIds: ['element1', 'element2'],
      };
      
      const action = removeFromSelection('element1');
      const state = uiReducer(stateWithSelection, action);
      
      expect(state.selectedElementIds).toEqual(['element2']);
    });

    it('should clear selection', () => {
      const stateWithSelection = {
        ...initialState,
        selectedElementIds: ['element1', 'element2'],
      };
      
      const action = clearSelection();
      const state = uiReducer(stateWithSelection, action);
      
      expect(state.selectedElementIds).toEqual([]);
    });
  });

  describe('text editing', () => {
    it('should start text editing', () => {
      const action = startTextEditing('element1');
      const state = uiReducer(initialState, action);
      
      expect(state.isTextEditing).toBe(true);
      expect(state.editingElementId).toBe('element1');
    });

    it('should stop text editing', () => {
      const stateWithEditing = {
        ...initialState,
        isTextEditing: true,
        editingElementId: 'element1',
      };
      
      const action = stopTextEditing();
      const state = uiReducer(stateWithEditing, action);
      
      expect(state.isTextEditing).toBe(false);
      expect(state.editingElementId).toBeNull();
    });
  });

  describe('canvas controls', () => {
    it('should set canvas zoom within bounds', () => {
      const action = setCanvasZoom(2.5);
      const state = uiReducer(initialState, action);
      
      expect(state.canvasZoom).toBe(2.5);
    });

    it('should clamp zoom to minimum value', () => {
      const action = setCanvasZoom(0.05);
      const state = uiReducer(initialState, action);
      
      expect(state.canvasZoom).toBe(0.1);
    });

    it('should clamp zoom to maximum value', () => {
      const action = setCanvasZoom(10);
      const state = uiReducer(initialState, action);
      
      expect(state.canvasZoom).toBe(5);
    });

    it('should set canvas offset', () => {
      const action = setCanvasOffset({ x: 100, y: 200 });
      const state = uiReducer(initialState, action);
      
      expect(state.canvasOffset).toEqual({ x: 100, y: 200 });
    });

    it('should toggle grid', () => {
      const action = toggleGrid();
      const state = uiReducer(initialState, action);
      
      expect(state.showGrid).toBe(true);
    });

    it('should toggle snap to grid', () => {
      const action = toggleSnapToGrid();
      const state = uiReducer(initialState, action);
      
      expect(state.snapToGrid).toBe(false);
    });
  });

  describe('tool selection', () => {
    it('should set active tool', () => {
      const action = setActiveTool('text');
      const state = uiReducer(initialState, action);
      
      expect(state.activeTool).toBe('text');
    });

    it('should clear shape type when setting non-shape tool', () => {
      const stateWithShape = {
        ...initialState,
        activeTool: 'shape' as const,
        activeShapeType: 'rectangle' as const,
      };
      
      const action = setActiveTool('text');
      const state = uiReducer(stateWithShape, action);
      
      expect(state.activeTool).toBe('text');
      expect(state.activeShapeType).toBeNull();
    });

    it('should set active shape type and tool', () => {
      const action = setActiveShapeType('circle');
      const state = uiReducer(initialState, action);
      
      expect(state.activeShapeType).toBe('circle');
      expect(state.activeTool).toBe('shape');
    });
  });

  describe('compilation state', () => {
    it('should start compilation', () => {
      const action = startCompilation();
      const state = uiReducer(initialState, action);
      
      expect(state.isCompiling).toBe(true);
      expect(state.compilationProgress).toBe(0);
      expect(state.compilationErrors).toEqual([]);
    });

    it('should update compilation progress', () => {
      const stateWithCompilation = {
        ...initialState,
        isCompiling: true,
      };
      
      const action = updateCompilationProgress(50);
      const state = uiReducer(stateWithCompilation, action);
      
      expect(state.compilationProgress).toBe(50);
    });

    it('should finish compilation successfully', () => {
      const stateWithCompilation = {
        ...initialState,
        isCompiling: true,
        compilationProgress: 50,
      };
      
      const action = finishCompilation({});
      const state = uiReducer(stateWithCompilation, action);
      
      expect(state.isCompiling).toBe(false);
      expect(state.compilationProgress).toBe(100);
      expect(state.compilationErrors).toEqual([]);
      expect(state.lastCompilationTime).toBeInstanceOf(Date);
    });

    it('should finish compilation with errors', () => {
      const stateWithCompilation = {
        ...initialState,
        isCompiling: true,
      };
      
      const errors = ['Error 1', 'Error 2'];
      const action = finishCompilation({ errors });
      const state = uiReducer(stateWithCompilation, action);
      
      expect(state.isCompiling).toBe(false);
      expect(state.compilationErrors).toEqual(errors);
    });
  });

  describe('loading state', () => {
    it('should set loading state', () => {
      const action = setLoading({ isLoading: true, message: 'Loading...' });
      const state = uiReducer(initialState, action);
      
      expect(state.isLoading).toBe(true);
      expect(state.loadingMessage).toBe('Loading...');
    });

    it('should clear loading state', () => {
      const stateWithLoading = {
        ...initialState,
        isLoading: true,
        loadingMessage: 'Loading...',
      };
      
      const action = setLoading({ isLoading: false });
      const state = uiReducer(stateWithLoading, action);
      
      expect(state.isLoading).toBe(false);
      expect(state.loadingMessage).toBe('');
    });
  });

  describe('error handling', () => {
    it('should set error', () => {
      const action = setError('Something went wrong');
      const state = uiReducer(initialState, action);
      
      expect(state.error).toBe('Something went wrong');
    });

    it('should clear error', () => {
      const stateWithError = {
        ...initialState,
        error: 'Something went wrong',
      };
      
      const action = setError(null);
      const state = uiReducer(stateWithError, action);
      
      expect(state.error).toBeNull();
    });
  });

  describe('notifications', () => {
    it('should add notification', () => {
      const action = addNotification({
        type: 'success',
        message: 'Operation completed',
      });
      const state = uiReducer(initialState, action);
      
      expect(state.notifications).toHaveLength(1);
      expect(state.notifications[0].type).toBe('success');
      expect(state.notifications[0].message).toBe('Operation completed');
      expect(state.notifications[0].id).toBeDefined();
      expect(state.notifications[0].timestamp).toBeInstanceOf(Date);
    });

    it('should remove notification', () => {
      const stateWithNotification = {
        ...initialState,
        notifications: [
          {
            id: 'notification1',
            type: 'info' as const,
            message: 'Test notification',
            timestamp: new Date(),
          },
        ],
      };
      
      const action = removeNotification('notification1');
      const state = uiReducer(stateWithNotification, action);
      
      expect(state.notifications).toHaveLength(0);
    });

    it('should clear all notifications', () => {
      const stateWithNotifications = {
        ...initialState,
        notifications: [
          {
            id: 'notification1',
            type: 'info' as const,
            message: 'Test notification 1',
            timestamp: new Date(),
          },
          {
            id: 'notification2',
            type: 'warning' as const,
            message: 'Test notification 2',
            timestamp: new Date(),
          },
        ],
      };
      
      const action = clearNotifications();
      const state = uiReducer(stateWithNotifications, action);
      
      expect(state.notifications).toHaveLength(0);
    });
  });
});