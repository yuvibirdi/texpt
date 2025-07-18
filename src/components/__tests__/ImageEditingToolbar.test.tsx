import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import ImageEditingToolbar from '../ImageEditingToolbar';
import presentationSlice from '../../store/slices/presentationSlice';
import uiSlice from '../../store/slices/uiSlice';

// Mock the image utilities
jest.mock('../../utils/imageUtils', () => ({
  cropImage: jest.fn().mockResolvedValue('data:image/png;base64,croppedimage'),
}));

const createMockStore = () => {
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
              id: 'slide-1',
              title: 'Test Slide',
              elements: [
                {
                  id: 'element-1',
                  type: 'image' as const,
                  position: { x: 100, y: 100 },
                  size: { width: 200, height: 150 },
                  properties: {
                    src: 'data:image/png;base64,testimage',
                    alt: 'Test Image',
                    opacity: 1,
                    rotation: 0,
                  },
                  content: 'data:image/png;base64,testimage',
                  createdAt: new Date(),
                  updatedAt: new Date(),
                }
              ],
              connections: [],
              layout: {
                name: 'default',
                template: 'title-content',
                regions: {},
              },
              background: { type: 'color' as const, color: { r: 255, g: 255, b: 255 } },
              notes: '',
              createdAt: new Date(),
              updatedAt: new Date(),
            }
          ],
          theme: {
            id: 'default',
            name: 'Default',
            colors: {
              primary: { r: 0, g: 0, b: 255 },
              secondary: { r: 128, g: 128, b: 128 },
              accent: { r: 0, g: 255, b: 0 },
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
        isLoading: false,
        error: null,
      },
      ui: {
        selectedSlideId: 'slide-1',
        selectedElementId: null,
        isPreviewMode: false,
        zoom: 1,
        showGrid: false,
        snapToGrid: true,
      },
    },
  });
};

describe('ImageEditingToolbar', () => {
  const mockOnPropertyChange = jest.fn();
  
  const defaultProps = {
    slideId: 'slide-1',
    elementId: 'element-1',
    currentProperties: {
      src: 'data:image/png;base64,testimage',
      alt: 'Test Image',
      opacity: 1,
      rotation: 0,
    },
    onPropertyChange: mockOnPropertyChange,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderWithStore = (props = defaultProps) => {
    const store = createMockStore();
    return render(
      <Provider store={store}>
        <ImageEditingToolbar {...props} />
      </Provider>
    );
  };

  test('renders image editing controls', () => {
    renderWithStore();
    
    expect(screen.getByText('Opacity')).toBeInTheDocument();
    expect(screen.getByText('Rotation')).toBeInTheDocument();
    expect(screen.getByText('Transform')).toBeInTheDocument();
    expect(screen.getByText('🔄 Reset')).toBeInTheDocument();
  });

  test('displays current opacity value', () => {
    renderWithStore();
    
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  test('displays current rotation value', () => {
    renderWithStore();
    
    expect(screen.getByText('0°')).toBeInTheDocument();
  });

  test('handles opacity change', () => {
    renderWithStore();
    
    const opacitySlider = screen.getByDisplayValue('100');
    fireEvent.change(opacitySlider, { target: { value: '50' } });
    
    expect(mockOnPropertyChange).toHaveBeenCalledWith({ opacity: 0.5 });
  });

  test('handles rotation change', () => {
    renderWithStore();
    
    const rotationSlider = screen.getByDisplayValue('0');
    fireEvent.change(rotationSlider, { target: { value: '45' } });
    
    expect(mockOnPropertyChange).toHaveBeenCalledWith({ rotation: 45 });
  });

  test('handles flip horizontal', () => {
    renderWithStore();
    
    const flipHorizontalButton = screen.getByTitle('Flip Horizontal');
    fireEvent.click(flipHorizontalButton);
    
    expect(mockOnPropertyChange).toHaveBeenCalledWith({ flipX: true });
  });

  test('handles flip vertical', () => {
    renderWithStore();
    
    const flipVerticalButton = screen.getByTitle('Flip Vertical');
    fireEvent.click(flipVerticalButton);
    
    expect(mockOnPropertyChange).toHaveBeenCalledWith({ flipY: true });
  });

  test('opens crop dialog when crop button is clicked', () => {
    renderWithStore();
    
    const cropButton = screen.getByTitle('Crop Image');
    fireEvent.click(cropButton);
    
    expect(screen.getByText('Crop Image')).toBeInTheDocument();
    expect(screen.getByText('Apply Crop')).toBeInTheDocument();
  });

  test('handles reset functionality', () => {
    const propsWithModifications = {
      ...defaultProps,
      currentProperties: {
        ...defaultProps.currentProperties,
        opacity: 0.5,
        rotation: 45,
      },
    };
    
    renderWithStore(propsWithModifications);
    
    const resetButton = screen.getByText('🔄 Reset');
    fireEvent.click(resetButton);
    
    expect(mockOnPropertyChange).toHaveBeenCalledWith({
      opacity: 1,
      rotation: 0,
      crop: undefined,
    });
  });

  test('crop dialog can be closed', () => {
    renderWithStore();
    
    // Open crop dialog
    const cropButton = screen.getByTitle('Crop Image');
    fireEvent.click(cropButton);
    
    // Close crop dialog
    const closeButton = screen.getByText('×');
    fireEvent.click(closeButton);
    
    expect(screen.queryByText('Crop Image')).not.toBeInTheDocument();
  });

  test('crop dialog handles input changes', () => {
    renderWithStore();
    
    // Open crop dialog
    const cropButton = screen.getByTitle('Crop Image');
    fireEvent.click(cropButton);
    
    // Change crop values - use more specific selector
    const xInput = screen.getByLabelText('X Position:');
    fireEvent.change(xInput, { target: { value: '10' } });
    
    // The input should update (we're not testing the actual cropping here)
    expect(xInput).toHaveValue(10);
  });

  test('handles properties with different opacity values', () => {
    const propsWithLowOpacity = {
      ...defaultProps,
      currentProperties: {
        ...defaultProps.currentProperties,
        opacity: 0.3,
      },
    };
    
    renderWithStore(propsWithLowOpacity);
    
    expect(screen.getByText('30%')).toBeInTheDocument();
  });

  test('handles properties with different rotation values', () => {
    const propsWithRotation = {
      ...defaultProps,
      currentProperties: {
        ...defaultProps.currentProperties,
        rotation: -90,
      },
    };
    
    renderWithStore(propsWithRotation);
    
    expect(screen.getByText('-90°')).toBeInTheDocument();
  });
});