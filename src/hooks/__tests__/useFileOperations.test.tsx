import { renderHook, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { useFileOperations } from '../useFileOperations';
import presentationReducer, { markAsModified } from '../../store/slices/presentationSlice';
import uiReducer from '../../store/slices/uiSlice';
import { fileService } from '../../services/fileService';
import { Presentation } from '../../types/presentation';

// Mock the file service
jest.mock('../../services/fileService', () => ({
  fileService: {
    configure: jest.fn(),
    setCallbacks: jest.fn(),
    startAutoSave: jest.fn(),
    cleanup: jest.fn(),
    savePresentation: jest.fn(),
    loadPresentation: jest.fn(),
    getCurrentFilePath: jest.fn(),
    setCurrentFilePath: jest.fn(),
    getIsModified: jest.fn(),
    markAsModified: jest.fn(),
    markAsSaved: jest.fn(),
    getRecentFiles: jest.fn(),
    clearRecentFiles: jest.fn(),
    removeFromRecentFiles: jest.fn(),
    stopAutoSave: jest.fn()
  }
}));

// Mock electron API
const mockElectronAPI = {
  saveFile: jest.fn(),
  openFile: jest.fn(),
  getAppVersion: jest.fn().mockResolvedValue('1.0.0'),
  getPlatform: jest.fn().mockResolvedValue('darwin')
};

Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true
});

const mockFileService = fileService as jest.Mocked<typeof fileService>;

describe('useFileOperations', () => {
  let store: any;
  let wrapper: React.FC<{ children: React.ReactNode }>;

  const mockPresentation: Presentation = {
    id: 'test-presentation',
    title: 'Test Presentation',
    slides: [{
      id: 'slide-1',
      title: 'Slide 1',
      elements: [],
      connections: [],
      layout: {
        name: 'default',
        template: 'title-content',
        regions: {}
      },
      background: { type: 'color', color: { r: 255, g: 255, b: 255 } },
      notes: '',
      createdAt: new Date(),
      updatedAt: new Date()
    }],
    theme: {
      id: 'default',
      name: 'Default',
      colors: {
        primary: { r: 0, g: 0, b: 0 },
        secondary: { r: 0, g: 0, b: 0 },
        accent: { r: 0, g: 0, b: 0 },
        background: { r: 255, g: 255, b: 255 },
        text: { r: 0, g: 0, b: 0 }
      },
      fonts: {
        heading: 'Arial',
        body: 'Arial',
        monospace: 'Courier'
      }
    },
    metadata: {
      author: 'Test Author',
      title: 'Test Presentation',
      date: new Date()
    },
    settings: {
      slideSize: { width: 800, height: 600, aspectRatio: '4:3' },
      autoSave: true,
      autoSaveInterval: 30,
      latexEngine: 'pdflatex',
      compilationTimeout: 30,
      showGrid: false,
      snapToGrid: true,
      gridSize: 10
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    version: '1.0.0'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    store = configureStore({
      reducer: {
        presentation: presentationReducer,
        ui: uiReducer
      },
      preloadedState: {
        presentation: {
          currentPresentation: mockPresentation,
          presentations: [],
          currentSlideId: 'slide-1',
          isModified: false,
          lastSaved: null
        },
        ui: {
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
          notifications: []
        }
      }
    });

    wrapper = ({ children }) => (
      <Provider store={store}>{children}</Provider>
    );

    // Setup default mock returns
    mockFileService.getRecentFiles.mockReturnValue([]);
    mockFileService.getCurrentFilePath.mockReturnValue(null);
    mockFileService.getIsModified.mockReturnValue(false);
  });

  describe('Initialization', () => {
    it('should configure file service on mount', () => {
      renderHook(() => useFileOperations(), { wrapper });

      expect(mockFileService.configure).toHaveBeenCalledWith({
        autoSaveEnabled: true,
        autoSaveInterval: 30,
        maxRecentFiles: 10,
        fileExtension: 'lpe'
      });
    });

    it('should set up callbacks', () => {
      renderHook(() => useFileOperations(), { wrapper });

      expect(mockFileService.setCallbacks).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function)
      );
    });

    it('should start auto-save if enabled', () => {
      renderHook(() => useFileOperations(), { wrapper });

      expect(mockFileService.startAutoSave).toHaveBeenCalledWith(
        expect.any(Function)
      );
    });
  });

  describe('Save Presentation', () => {
    it('should save presentation successfully', async () => {
      mockFileService.savePresentation.mockResolvedValue({
        success: true,
        filePath: '/path/to/presentation.lpe'
      });

      const { result } = renderHook(() => useFileOperations(), { wrapper });

      let saveResult: boolean;
      await act(async () => {
        saveResult = await result.current.savePresentation();
      });

      expect(saveResult!).toBe(true);
      expect(mockFileService.savePresentation).toHaveBeenCalledWith(
        mockPresentation,
        undefined
      );
    });

    it('should save presentation with dialog when requested', async () => {
      mockFileService.savePresentation.mockResolvedValue({
        success: true,
        filePath: '/path/to/presentation.lpe'
      });

      const { result } = renderHook(() => useFileOperations(), { wrapper });

      await act(async () => {
        await result.current.savePresentation(true);
      });

      expect(mockFileService.savePresentation).toHaveBeenCalledWith(
        mockPresentation,
        undefined
      );
    });

    it('should handle save errors', async () => {
      mockFileService.savePresentation.mockResolvedValue({
        success: false,
        error: 'Permission denied'
      });

      const { result } = renderHook(() => useFileOperations(), { wrapper });

      let saveResult: boolean;
      await act(async () => {
        saveResult = await result.current.savePresentation();
      });

      expect(saveResult!).toBe(false);
    });

    it('should handle no presentation error', async () => {
      // Create store with no presentation
      const emptyStore = configureStore({
        reducer: {
          presentation: presentationReducer,
          ui: uiReducer
        },
        preloadedState: {
          presentation: {
            currentPresentation: null,
            presentations: [],
            currentSlideId: null,
            isModified: false,
            lastSaved: null
          },
          ui: {
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
            notifications: []
          }
        }
      });

      const emptyWrapper = ({ children }: { children: React.ReactNode }) => (
        <Provider store={emptyStore}>{children}</Provider>
      );

      const { result } = renderHook(() => useFileOperations(), { 
        wrapper: emptyWrapper 
      });

      let saveResult: boolean;
      await act(async () => {
        saveResult = await result.current.savePresentation();
      });

      expect(saveResult!).toBe(false);
      expect(mockFileService.savePresentation).not.toHaveBeenCalled();
    });
  });

  describe('Load Presentation', () => {
    it('should load presentation successfully', async () => {
      mockFileService.loadPresentation.mockResolvedValue({
        success: true,
        presentation: mockPresentation,
        filePath: '/path/to/presentation.lpe'
      });

      const { result } = renderHook(() => useFileOperations(), { wrapper });

      let loadResult: boolean;
      await act(async () => {
        loadResult = await result.current.loadPresentation();
      });

      expect(loadResult!).toBe(true);
      expect(mockFileService.loadPresentation).toHaveBeenCalledWith(undefined);
    });

    it('should load presentation from specific path', async () => {
      mockFileService.loadPresentation.mockResolvedValue({
        success: true,
        presentation: mockPresentation,
        filePath: '/specific/path.lpe'
      });

      const { result } = renderHook(() => useFileOperations(), { wrapper });

      await act(async () => {
        await result.current.loadPresentation('/specific/path.lpe');
      });

      expect(mockFileService.loadPresentation).toHaveBeenCalledWith('/specific/path.lpe');
    });

    it('should handle load errors', async () => {
      mockFileService.loadPresentation.mockResolvedValue({
        success: false,
        error: 'File not found'
      });

      const { result } = renderHook(() => useFileOperations(), { wrapper });

      let loadResult: boolean;
      await act(async () => {
        loadResult = await result.current.loadPresentation();
      });

      expect(loadResult!).toBe(false);
    });
  });

  describe('Create New Presentation', () => {
    it('should create new presentation', () => {
      const { result } = renderHook(() => useFileOperations(), { wrapper });

      act(() => {
        result.current.createNewPresentation('New Test Presentation');
      });

      expect(mockFileService.setCurrentFilePath).toHaveBeenCalledWith(null);
      expect(mockFileService.markAsSaved).toHaveBeenCalled();
    });

    it('should prompt for unsaved changes', () => {
      // Mock window.confirm
      const originalConfirm = window.confirm;
      window.confirm = jest.fn().mockReturnValue(false);

      // Create store with modified state
      const modifiedStore = configureStore({
        reducer: {
          presentation: presentationReducer,
          ui: uiReducer
        },
        preloadedState: {
          presentation: {
            currentPresentation: mockPresentation,
            presentations: [],
            currentSlideId: 'slide-1',
            isModified: true, // Set as modified
            lastSaved: null
          },
          ui: {
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
            notifications: []
          }
        }
      });

      const modifiedWrapper = ({ children }: { children: React.ReactNode }) => (
        <Provider store={modifiedStore}>{children}</Provider>
      );

      mockFileService.getIsModified.mockReturnValue(true);

      const { result } = renderHook(() => useFileOperations(), { 
        wrapper: modifiedWrapper 
      });

      act(() => {
        result.current.createNewPresentation();
      });

      expect(window.confirm).toHaveBeenCalled();
      
      // Restore original confirm
      window.confirm = originalConfirm;
    });
  });

  describe('Auto-save', () => {
    it('should start auto-save', () => {
      const { result } = renderHook(() => useFileOperations(), { wrapper });

      act(() => {
        result.current.startAutoSave();
      });

      expect(mockFileService.startAutoSave).toHaveBeenCalledWith(
        expect.any(Function)
      );
    });

    it('should stop auto-save', () => {
      const { result } = renderHook(() => useFileOperations(), { wrapper });

      act(() => {
        result.current.stopAutoSave();
      });

      expect(mockFileService.stopAutoSave).toHaveBeenCalled();
    });

    it('should toggle auto-save', () => {
      const { result } = renderHook(() => useFileOperations(), { wrapper });

      act(() => {
        result.current.toggleAutoSave(false);
      });

      expect(mockFileService.stopAutoSave).toHaveBeenCalled();

      act(() => {
        result.current.toggleAutoSave(true);
      });

      expect(mockFileService.startAutoSave).toHaveBeenCalledWith(
        expect.any(Function)
      );
    });

    it('should configure auto-save interval', () => {
      const { result } = renderHook(() => useFileOperations(), { wrapper });

      act(() => {
        result.current.configureAutoSave(60);
      });

      expect(mockFileService.configure).toHaveBeenCalledWith({
        autoSaveInterval: 60
      });
    });
  });

  describe('Recent Files', () => {
    const mockRecentFiles = [
      {
        id: 'recent-1',
        filePath: '/path/to/recent1.lpe',
        fileName: 'recent1.lpe',
        lastOpened: new Date(),
        title: 'Recent Presentation 1'
      },
      {
        id: 'recent-2',
        filePath: '/path/to/recent2.lpe',
        fileName: 'recent2.lpe',
        lastOpened: new Date(),
        title: 'Recent Presentation 2'
      }
    ];

    it('should return recent files', () => {
      mockFileService.getRecentFiles.mockReturnValue(mockRecentFiles);

      const { result } = renderHook(() => useFileOperations(), { wrapper });

      expect(result.current.recentFiles).toEqual(mockRecentFiles);
    });

    it('should open recent file', async () => {
      mockFileService.loadPresentation.mockResolvedValue({
        success: true,
        presentation: mockPresentation,
        filePath: '/path/to/recent1.lpe'
      });

      const { result } = renderHook(() => useFileOperations(), { wrapper });

      let openResult: boolean;
      await act(async () => {
        openResult = await result.current.openRecentFile('/path/to/recent1.lpe');
      });

      expect(openResult!).toBe(true);
      expect(mockFileService.loadPresentation).toHaveBeenCalledWith('/path/to/recent1.lpe');
    });

    it('should clear recent files', () => {
      const { result } = renderHook(() => useFileOperations(), { wrapper });

      act(() => {
        result.current.clearRecentFiles();
      });

      expect(mockFileService.clearRecentFiles).toHaveBeenCalled();
    });

    it('should remove from recent files', () => {
      const { result } = renderHook(() => useFileOperations(), { wrapper });

      act(() => {
        result.current.removeFromRecentFiles('/path/to/recent1.lpe');
      });

      expect(mockFileService.removeFromRecentFiles).toHaveBeenCalledWith('/path/to/recent1.lpe');
    });
  });

  describe('Status', () => {
    it('should return current file path', () => {
      mockFileService.getCurrentFilePath.mockReturnValue('/current/path.lpe');

      const { result } = renderHook(() => useFileOperations(), { wrapper });

      expect(result.current.currentFilePath).toBe('/current/path.lpe');
    });

    it('should return modification status', () => {
      mockFileService.getIsModified.mockReturnValue(true);

      const { result } = renderHook(() => useFileOperations(), { wrapper });

      expect(result.current.isModified).toBe(true);
    });

    it('should return unsaved changes status', () => {
      // Set up modified state in store
      store.dispatch(markAsModified());

      const { result } = renderHook(() => useFileOperations(), { wrapper });

      expect(result.current.hasUnsavedChanges).toBe(true);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup on unmount', () => {
      const { unmount } = renderHook(() => useFileOperations(), { wrapper });

      unmount();

      expect(mockFileService.cleanup).toHaveBeenCalled();
    });
  });
});