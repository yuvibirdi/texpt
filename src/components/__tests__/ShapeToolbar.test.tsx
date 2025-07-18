import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import ShapeToolbar from '../ShapeToolbar';
import presentationSlice from '../../store/slices/presentationSlice';
import uiSlice from '../../store/slices/uiSlice';
import { createDefaultSlideLayout, createDefaultBackground } from '../../types/presentation';

// Mock CSS imports
jest.mock('../ShapeToolbar.css', () => ({}));

describe('ShapeToolbar', () => {
  let store: any;
  const mockOnPropertyChange = jest.fn();

  beforeEach(() => {
    store = configureStore({
      reducer: {
        presentation: presentationSlice,
        ui: uiSlice,
      },
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
          serializableCheck: false,
        }),
    });

    // Create a test presentation with a slide
    store.dispatch({
      type: 'presentation/createPresentation',
      payload: { title: 'Test Presentation' }
    });

    mockOnPropertyChange.mockClear();
  });

  const renderShapeToolbar = (elementId: string | null = null) => {
    const slideId = store.getState().presentation.currentPresentation.slides[0].id;
    
    return render(
      <Provider store={store}>
        <ShapeToolbar
          slideId={slideId}
          elementId={elementId}
          currentProperties={{}}
          onPropertyChange={mockOnPropertyChange}
        />
      </Provider>
    );
  };

  test('renders shape type buttons', () => {
    renderShapeToolbar();

    expect(screen.getByTitle('Rectangle')).toBeInTheDocument();
    expect(screen.getByTitle('Circle')).toBeInTheDocument();
    expect(screen.getByTitle('Line')).toBeInTheDocument();
    expect(screen.getByTitle('Arrow')).toBeInTheDocument();
  });

  test('shows shape selection buttons', () => {
    renderShapeToolbar();

    const rectangleButton = screen.getByTitle('Rectangle');
    const circleButton = screen.getByTitle('Circle');
    const lineButton = screen.getByTitle('Line');
    const arrowButton = screen.getByTitle('Arrow');

    expect(rectangleButton).toBeInTheDocument();
    expect(circleButton).toBeInTheDocument();
    expect(lineButton).toBeInTheDocument();
    expect(arrowButton).toBeInTheDocument();
  });

  test('dispatches setActiveShapeType when shape button is clicked', () => {
    renderShapeToolbar();

    const rectangleButton = screen.getByTitle('Rectangle');
    fireEvent.click(rectangleButton);

    const state = store.getState();
    expect(state.ui.activeShapeType).toBe('rectangle');
    expect(state.ui.activeTool).toBe('shape');
  });

  test('shows shape properties when element is selected', () => {
    // First add a shape element
    const slideId = store.getState().presentation.currentPresentation.slides[0].id;
    store.dispatch({
      type: 'presentation/addElement',
      payload: {
        slideId,
        element: {
          type: 'shape',
          position: { x: 100, y: 100 },
          size: { width: 100, height: 100 },
          properties: {
            shapeType: 'rectangle',
            fillColor: { r: 200, g: 200, b: 200 },
            strokeColor: { r: 0, g: 0, b: 0 },
            strokeWidth: 2,
          },
        },
      },
    });

    const elementId = store.getState().presentation.currentPresentation.slides[0].elements[0].id;
    renderShapeToolbar(elementId);

    // Should show fill and stroke controls
    expect(screen.getByTitle('Fill Color')).toBeInTheDocument();
    expect(screen.getByTitle('Stroke Color')).toBeInTheDocument();
  });

  test('shows instructions when no shape is selected', () => {
    renderShapeToolbar();

    expect(screen.getByText('Select a shape tool to start drawing')).toBeInTheDocument();
  });

  test('shows drawing instructions when shape tool is active', () => {
    // Set active shape type
    store.dispatch({
      type: 'ui/setActiveShapeType',
      payload: 'rectangle'
    });

    renderShapeToolbar();

    expect(screen.getByText('Click and drag on canvas to draw rectangle')).toBeInTheDocument();
  });

  test('handles fill color change', () => {
    // Add a shape element
    const slideId = store.getState().presentation.currentPresentation.slides[0].id;
    store.dispatch({
      type: 'presentation/addElement',
      payload: {
        slideId,
        element: {
          type: 'shape',
          position: { x: 100, y: 100 },
          size: { width: 100, height: 100 },
          properties: {
            shapeType: 'rectangle',
            fillColor: { r: 200, g: 200, b: 200 },
            strokeColor: { r: 0, g: 0, b: 0 },
            strokeWidth: 2,
          },
        },
      },
    });

    const elementId = store.getState().presentation.currentPresentation.slides[0].elements[0].id;
    renderShapeToolbar(elementId);

    const fillColorButton = screen.getByTitle('Fill Color');
    fireEvent.click(fillColorButton);

    // Should show color picker
    expect(screen.getByText('Fill Color')).toBeInTheDocument();
  });

  test('handles stroke width change', () => {
    // Add a shape element
    const slideId = store.getState().presentation.currentPresentation.slides[0].id;
    store.dispatch({
      type: 'presentation/addElement',
      payload: {
        slideId,
        element: {
          type: 'shape',
          position: { x: 100, y: 100 },
          size: { width: 100, height: 100 },
          properties: {
            shapeType: 'rectangle',
            fillColor: { r: 200, g: 200, b: 200 },
            strokeColor: { r: 0, g: 0, b: 0 },
            strokeWidth: 2,
          },
        },
      },
    });

    const elementId = store.getState().presentation.currentPresentation.slides[0].elements[0].id;
    renderShapeToolbar(elementId);

    const strokeWidthSelect = screen.getByRole('combobox');
    fireEvent.change(strokeWidthSelect, { target: { value: '5' } });

    expect(mockOnPropertyChange).toHaveBeenCalledWith({ strokeWidth: 5 });
  });
});