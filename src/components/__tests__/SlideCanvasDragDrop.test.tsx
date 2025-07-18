import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import SlideCanvasDragDrop from '../SlideCanvasDragDrop';
import presentationSlice from '../../store/slices/presentationSlice';
import uiSlice from '../../store/slices/uiSlice';
import { dragDropService } from '../../services/dragDropService';

// Mock fabric.js
jest.mock('fabric', () => ({
  fabric: {
    Canvas: jest.fn().mockImplementation(() => ({
      on: jest.fn(),
      dispose: jest.fn(),
      clear: jest.fn(),
      add: jest.fn(),
      renderAll: jest.fn(),
      getActiveObject: jest.fn(),
      bringToFront: jest.fn(),
      sendToBack: jest.fn(),
      bringForward: jest.fn(),
      sendBackwards: jest.fn(),
      getObjects: jest.fn().mockReturnValue([]),
    })),
    Textbox: jest.fn().mockImplementation(() => ({})),
    Image: {
      fromURL: jest.fn((url, callback) => {
        const mockImg = {
          set: jest.fn(),
          data: {},
          width: 200,
          height: 150,
        };
        callback(mockImg);
      }),
    },
  },
}));

// Mock drag drop service
jest.mock('../../services/dragDropService', () => ({
  dragDropService: {
    setCanvas: jest.fn(),
    updateOptions: jest.fn(),
    createDragPreview: jest.fn().mockImplementation(() => {
      const div = { style: {}, appendChild: jest.fn(), parentNode: { removeChild: jest.fn() } };
      return div;
    }),
    startDrag: jest.fn(),
    endDrag: jest.fn(),
    getDragState: jest.fn().mockReturnValue({
      isDragging: false,
      dragType: null,
      dragData: null,
      dragPreview: null,
    }),
    getDropPosition: jest.fn().mockReturnValue({ x: 100, y: 100 }),
    findSnapPosition: jest.fn().mockReturnValue({
      position: { x: 100, y: 100 },
      guides: [],
    }),
    showSnapGuides: jest.fn(),
    hideSnapGuides: jest.fn(),
    validateDroppedFiles: jest.fn().mockReturnValue({
      valid: [],
      invalid: [],
    }),
    updateDragPreview: jest.fn(),
    bringToFront: jest.fn(),
    sendToBack: jest.fn(),
    bringForward: jest.fn(),
    sendBackwards: jest.fn(),
    getElementZIndex: jest.fn().mockReturnValue(0),
  },
}));

// Mock image utils
jest.mock('../../utils/imageUtils', () => ({
  getImageInfo: jest.fn().mockResolvedValue({
    width: 200,
    height: 150,
  }),
}));

const createTestStore = () => {
  return configureStore({
    reducer: {
      presentation: presentationSlice,
      ui: uiSlice,
    },
    preloadedState: {
      presentation: {
        currentPresentation: {
          id: 'test-presentation',
          title: 'Test Presentation',
          slides: [
            {
              id: 'test-slide',
              title: 'Test Slide',
              elements: [],
              connections: [],
              layout: {
                name: 'default',
                template: 'title-content',
                regions: {},
              },
              background: { type: 'color', color: { r: 255, g: 255, b: 255 } },
              notes: '',
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
          theme: {
            id: 'default',
            name: 'Default',
            colors: {
              primary: { r: 0, g: 0, b: 0 },
              secondary: { r: 128, g: 128, b: 128 },
              accent: { r: 255, g: 0, b: 0 },
              background: { r: 255, g: 255, b: 255 },
              text: { r: 0, g: 0, b: 0 },
            },
            fonts: {
              heading: 'Arial',
              body: 'Arial',
              monospace: 'Courier',
            },
          },
          metadata: {
            author: 'Test Author',
            title: 'Test Presentation',
          },
          settings: {
            slideSize: { width: 800, height: 600, aspectRatio: '4:3' as const },
            autoSave: true,
            autoSaveInterval: 30,
            latexEngine: 'pdflatex' as const,
            compilationTimeout: 30,
            showGrid: false,
            snapToGrid: true,
            gridSize: 10,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
          version: '1.0.0',
        },
        presentations: [],
        currentSlideId: 'test-slide',
        isModified: false,
        lastSaved: null,
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
      },
    },
  });
};

const renderWithProvider = (store = createTestStore()) => {
  return render(
    <Provider store={store}>
      <SlideCanvasDragDrop slideId="test-slide" />
    </Provider>
  );
};

describe('SlideCanvasDragDrop', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders canvas and toolbar', () => {
    renderWithProvider();
    
    expect(screen.getByText('📝 Text')).toBeInTheDocument();
    expect(screen.getByText('🖼️ Image')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /bring to front/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send to back/i })).toBeInTheDocument();
  });

  it('initializes drag-drop service with canvas', () => {
    renderWithProvider();
    
    expect(dragDropService.setCanvas).toHaveBeenCalled();
    expect(dragDropService.updateOptions).toHaveBeenCalledWith({
      snapToGrid: true,
      gridSize: 10,
      snapThreshold: 5,
      showSnapGuides: true,
      enableZIndexManagement: true,
    });
  });

  it('handles text element drag start', () => {
    renderWithProvider();
    
    const textButton = screen.getByText('📝 Text');
    const mockEvent = {
      target: textButton,
      dataTransfer: {
        setData: jest.fn(),
        effectAllowed: '',
      },
    } as any;
    
    fireEvent.dragStart(textButton, mockEvent);
    
    expect(dragDropService.createDragPreview).toHaveBeenCalledWith(textButton, 'text');
    expect(dragDropService.startDrag).toHaveBeenCalledWith('toolbar', { elementType: 'text' }, expect.any(Object));
  });

  it('handles image element drag start', () => {
    renderWithProvider();
    
    const imageButton = screen.getByText('🖼️ Image');
    const mockEvent = {
      target: imageButton,
      dataTransfer: {
        setData: jest.fn(),
        effectAllowed: '',
      },
    } as any;
    
    fireEvent.dragStart(imageButton, mockEvent);
    
    expect(dragDropService.createDragPreview).toHaveBeenCalledWith(imageButton, 'image');
    expect(dragDropService.startDrag).toHaveBeenCalledWith('toolbar', { elementType: 'image' }, expect.any(Object));
  });

  it('handles drag over canvas', () => {
    renderWithProvider();
    
    const canvasWrapper = screen.getByText(/drag elements from toolbar/i).parentElement;
    const mockEvent = {
      preventDefault: jest.fn(),
      dataTransfer: { dropEffect: '' },
      clientX: 200,
      clientY: 300,
    } as any;
    
    fireEvent.dragOver(canvasWrapper!, mockEvent);
    
    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(dragDropService.updateDragPreview).toHaveBeenCalledWith(200, 300);
  });

  it('handles drop on canvas for toolbar elements', async () => {
    // Mock drag state to simulate toolbar drag
    (dragDropService.getDragState as jest.Mock).mockReturnValue({
      isDragging: true,
      dragType: 'toolbar',
      dragData: { elementType: 'text' },
      dragPreview: document.createElement('div'),
    });

    const store = createTestStore();
    renderWithProvider(store);
    
    const canvasWrapper = screen.getByText(/drag elements from toolbar/i).parentElement;
    const mockEvent = {
      preventDefault: jest.fn(),
      dataTransfer: { files: [] },
      clientX: 200,
      clientY: 300,
    } as any;
    
    fireEvent.drop(canvasWrapper!, mockEvent);
    
    await waitFor(() => {
      expect(dragDropService.getDropPosition).toHaveBeenCalled();
      expect(dragDropService.findSnapPosition).toHaveBeenCalled();
      expect(dragDropService.endDrag).toHaveBeenCalled();
    });
    
    // Check that element was added to store
    const state = store.getState();
    expect(state.presentation.currentPresentation?.slides[0].elements).toHaveLength(1);
  });

  it('handles file drop on canvas', async () => {
    // Mock drag state for file drop
    (dragDropService.getDragState as jest.Mock).mockReturnValue({
      isDragging: true,
      dragType: 'file',
      dragData: null,
      dragPreview: null,
    });

    // Mock file validation
    const mockFile = new File([''], 'test.jpg', { type: 'image/jpeg' });
    (dragDropService.validateDroppedFiles as jest.Mock).mockReturnValue({
      valid: [mockFile],
      invalid: [],
    });

    const store = createTestStore();
    renderWithProvider(store);
    
    const canvasWrapper = screen.getByText(/drag elements from toolbar/i).parentElement;
    const mockEvent = {
      preventDefault: jest.fn(),
      dataTransfer: { files: [mockFile] },
      clientX: 200,
      clientY: 300,
    } as any;
    
    fireEvent.drop(canvasWrapper!, mockEvent);
    
    await waitFor(() => {
      expect(dragDropService.validateDroppedFiles).toHaveBeenCalledWith([mockFile]);
    });
  });

  it('handles z-index management buttons', () => {
    const store = createTestStore();
    renderWithProvider(store);
    
    // Mock active object
    const mockActiveObject = { data: { elementId: 'test-element' } };
    const mockCanvas = { getActiveObject: jest.fn().mockReturnValue(mockActiveObject) };
    (dragDropService as any).canvas = mockCanvas;
    
    // Test bring to front
    const bringToFrontButton = screen.getByRole('button', { name: /bring to front/i });
    fireEvent.click(bringToFrontButton);
    
    expect(dragDropService.bringToFront).toHaveBeenCalledWith(mockActiveObject);
    
    // Test send to back
    const sendToBackButton = screen.getByRole('button', { name: /send to back/i });
    fireEvent.click(sendToBackButton);
    
    expect(dragDropService.sendToBack).toHaveBeenCalledWith(mockActiveObject);
  });

  it('disables z-index buttons when no element is selected', () => {
    renderWithProvider();
    
    const bringToFrontButton = screen.getByRole('button', { name: /bring to front/i });
    const sendToBackButton = screen.getByRole('button', { name: /send to back/i });
    
    expect(bringToFrontButton).toBeDisabled();
    expect(sendToBackButton).toBeDisabled();
  });

  it('adds text element when clicking text button', () => {
    const store = createTestStore();
    renderWithProvider(store);
    
    const textButton = screen.getByText('📝 Text');
    fireEvent.click(textButton);
    
    const state = store.getState();
    expect(state.presentation.currentPresentation?.slides[0].elements).toHaveLength(1);
    expect(state.presentation.currentPresentation?.slides[0].elements[0].type).toBe('text');
  });

  it('adds image element when clicking image button', () => {
    const store = createTestStore();
    renderWithProvider(store);
    
    const imageButton = screen.getByText('🖼️ Image');
    fireEvent.click(imageButton);
    
    const state = store.getState();
    expect(state.presentation.currentPresentation?.slides[0].elements).toHaveLength(1);
    expect(state.presentation.currentPresentation?.slides[0].elements[0].type).toBe('image');
  });

  it('shows snap guides when enabled', async () => {
    // Mock snap result with guides
    (dragDropService.findSnapPosition as jest.Mock).mockReturnValue({
      position: { x: 100, y: 100 },
      guides: [{ type: 'horizontal', position: 100, elements: ['test'] }],
    });

    (dragDropService.getDragState as jest.Mock).mockReturnValue({
      isDragging: true,
      dragType: 'toolbar',
      dragData: { elementType: 'text' },
      dragPreview: document.createElement('div'),
    });

    renderWithProvider();
    
    const canvasWrapper = screen.getByText(/drag elements from toolbar/i).parentElement;
    const mockEvent = {
      preventDefault: jest.fn(),
      dataTransfer: { files: [] },
      clientX: 200,
      clientY: 300,
    } as any;
    
    fireEvent.drop(canvasWrapper!, mockEvent);
    
    await waitFor(() => {
      expect(dragDropService.showSnapGuides).toHaveBeenCalled();
    });
  });
});