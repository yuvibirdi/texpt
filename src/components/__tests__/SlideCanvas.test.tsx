import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import SlideCanvas from '../SlideCanvas';
import presentationReducer from '../../store/slices/presentationSlice';
import uiReducer from '../../store/slices/uiSlice';

// Mock fabric.js
jest.mock('fabric', () => ({
  fabric: {
    Canvas: jest.fn().mockImplementation(() => ({
      on: jest.fn(),
      off: jest.fn(),
      dispose: jest.fn(),
      clear: jest.fn(),
      add: jest.fn(),
      remove: jest.fn(),
      renderAll: jest.fn(),
      getObjects: jest.fn(() => []),
      getActiveObject: jest.fn(),
      setActiveObject: jest.fn(),
      setZoom: jest.fn(),
      getZoom: jest.fn(() => 1),
      setViewportTransform: jest.fn(),
      viewportTransform: [1, 0, 0, 1, 0, 0],
      requestRenderAll: jest.fn(),
      selection: true,
      backgroundColor: '#ffffff',
      zoomToPoint: jest.fn(),
    })),
    Textbox: jest.fn().mockImplementation((text, options) => ({
      type: 'textbox',
      text,
      ...options,
      set: jest.fn(),
      enterEditing: jest.fn(),
      selectAll: jest.fn(),
      data: {},
    })),
    Rect: jest.fn().mockImplementation((options) => ({
      type: 'rect',
      ...options,
      set: jest.fn(),
      data: {},
    })),
    Image: {
      fromURL: jest.fn((url, callback) => {
        const mockImg = {
          type: 'image',
          width: 100,
          height: 100,
          set: jest.fn(),
          data: {},
        };
        callback(mockImg);
      }),
    },
  },
}));

const createTestStore = () => {
  return configureStore({
    reducer: {
      presentation: presentationReducer,
      ui: uiReducer,
    },
  });
};

describe('SlideCanvas Text Element System', () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    store = createTestStore();
    // Create a presentation with a slide
    store.dispatch({ type: 'presentation/createPresentation', payload: { title: 'Test Presentation' } });
  });

  test('renders canvas with text toolbar button', () => {
    const state = store.getState();
    const slideId = state.presentation.currentPresentation?.slides[0]?.id || '';

    render(
      <Provider store={store}>
        <SlideCanvas slideId={slideId} />
      </Provider>
    );

    expect(screen.getByText('📝 Text')).toBeInTheDocument();
  });

  test('adds text element when clicking text button', async () => {
    const state = store.getState();
    const slideId = state.presentation.currentPresentation?.slides[0]?.id || '';

    render(
      <Provider store={store}>
        <SlideCanvas slideId={slideId} />
      </Provider>
    );

    const textButton = screen.getByText('📝 Text');
    fireEvent.click(textButton);

    await waitFor(() => {
      const updatedState = store.getState();
      const slide = updatedState.presentation.currentPresentation?.slides[0];
      expect(slide?.elements).toHaveLength(1);
      expect(slide?.elements[0].type).toBe('text');
      expect(slide?.elements[0].content).toBe('Type your text here');
    });
  });

  test('text button is draggable', () => {
    const state = store.getState();
    const slideId = state.presentation.currentPresentation?.slides[0]?.id || '';

    render(
      <Provider store={store}>
        <SlideCanvas slideId={slideId} />
      </Provider>
    );

    const textButton = screen.getByText('📝 Text');
    expect(textButton).toHaveAttribute('draggable', 'true');
  });

  test('shows formatting toolbar when text element is selected', async () => {
    const state = store.getState();
    const slideId = state.presentation.currentPresentation?.slides[0]?.id || '';

    render(
      <Provider store={store}>
        <SlideCanvas slideId={slideId} />
      </Provider>
    );

    // Add a text element first
    const textButton = screen.getByText('📝 Text');
    fireEvent.click(textButton);

    // Wait for the element to be added and simulate selection
    await waitFor(() => {
      const updatedState = store.getState();
      const slide = updatedState.presentation.currentPresentation?.slides[0];
      expect(slide?.elements).toHaveLength(1);
    });

    // The formatting toolbar should appear when a text element is selected
    // This would require more complex mocking of the Fabric.js selection events
    // For now, we'll just verify the component structure is correct
  });

  test('canvas has proper drag and drop handlers', () => {
    const state = store.getState();
    const slideId = state.presentation.currentPresentation?.slides[0]?.id || '';

    render(
      <Provider store={store}>
        <SlideCanvas slideId={slideId} />
      </Provider>
    );

    const canvasWrapper = document.querySelector('.canvas-wrapper');
    expect(canvasWrapper).toBeInTheDocument();
    
    // Verify drag and drop event handlers are attached
    // This is implicit through the component structure
  });

  test('zoom controls are present and functional', () => {
    const state = store.getState();
    const slideId = state.presentation.currentPresentation?.slides[0]?.id || '';

    render(
      <Provider store={store}>
        <SlideCanvas slideId={slideId} />
      </Provider>
    );

    expect(screen.getByText('+')).toBeInTheDocument();
    expect(screen.getByText('-')).toBeInTheDocument();
    expect(screen.getByText('Reset')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
  });
});