import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import TextFormattingToolbar from '../TextFormattingToolbar';
import presentationReducer from '../../store/slices/presentationSlice';
import uiReducer from '../../store/slices/uiSlice';
import { ElementProperties } from '../../types/presentation';

// Mock store setup
const createTestStore = () => {
  return configureStore({
    reducer: {
      presentation: presentationReducer,
      ui: uiReducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: false, // Disable for testing
      }),
  });
};

describe('TextFormattingToolbar', () => {
  let store: ReturnType<typeof createTestStore>;
  let mockOnPropertyChange: jest.Mock;

  beforeEach(() => {
    store = createTestStore();
    mockOnPropertyChange = jest.fn();
  });

  test('shows message when no element is selected', () => {
    render(
      <Provider store={store}>
        <TextFormattingToolbar
          slideId="test-slide"
          elementId={null}
          currentProperties={{}}
          onPropertyChange={mockOnPropertyChange}
        />
      </Provider>
    );

    expect(screen.getByText('Select a text element to format')).toBeInTheDocument();
    expect(screen.getByText(/Ctrl\/Cmd \+ T to add text/)).toBeInTheDocument();
  });

  test('renders all formatting controls when element is selected', () => {
    const currentProperties: ElementProperties = {
      fontSize: 16,
      fontFamily: 'Arial',
      fontWeight: 'normal',
      fontStyle: 'normal',
      textAlign: 'left',
      textColor: { r: 0, g: 0, b: 0 },
      opacity: 1,
    };

    render(
      <Provider store={store}>
        <TextFormattingToolbar
          slideId="test-slide"
          elementId="test-element"
          currentProperties={currentProperties}
          onPropertyChange={mockOnPropertyChange}
        />
      </Provider>
    );

    // Check for font controls
    expect(screen.getByDisplayValue('Arial')).toBeInTheDocument();
    expect(screen.getByDisplayValue('16')).toBeInTheDocument();

    // Check for style buttons
    expect(screen.getByTitle(/Bold/)).toBeInTheDocument();
    expect(screen.getByTitle(/Italic/)).toBeInTheDocument();
    expect(screen.getByTitle(/Underline/)).toBeInTheDocument();
    expect(screen.getByTitle(/Strikethrough/)).toBeInTheDocument();

    // Check for alignment buttons
    expect(screen.getByTitle('Left')).toBeInTheDocument();
    expect(screen.getByTitle('Center')).toBeInTheDocument();
    expect(screen.getByTitle('Right')).toBeInTheDocument();
    expect(screen.getByTitle('Justify')).toBeInTheDocument();

    // Check for color buttons
    expect(screen.getByTitle('Text Color')).toBeInTheDocument();
    expect(screen.getByTitle('Background Color')).toBeInTheDocument();

    // Check for preset buttons
    expect(screen.getByTitle('Heading Style')).toBeInTheDocument();
    expect(screen.getByTitle('Subheading Style')).toBeInTheDocument();
    expect(screen.getByTitle('Body Text Style')).toBeInTheDocument();

    // Check for opacity control
    expect(screen.getByTitle(/Opacity:/)).toBeInTheDocument();
  });

  test('font family change triggers property update', () => {
    const currentProperties: ElementProperties = {
      fontFamily: 'Arial',
    };

    render(
      <Provider store={store}>
        <TextFormattingToolbar
          slideId="test-slide"
          elementId="test-element"
          currentProperties={currentProperties}
          onPropertyChange={mockOnPropertyChange}
        />
      </Provider>
    );

    const fontSelect = screen.getByDisplayValue('Arial');
    fireEvent.change(fontSelect, { target: { value: 'Times New Roman' } });

    expect(mockOnPropertyChange).toHaveBeenCalledWith({
      fontFamily: 'Times New Roman',
    });
  });

  test('font size change triggers property update', () => {
    const currentProperties: ElementProperties = {
      fontSize: 16,
    };

    render(
      <Provider store={store}>
        <TextFormattingToolbar
          slideId="test-slide"
          elementId="test-element"
          currentProperties={currentProperties}
          onPropertyChange={mockOnPropertyChange}
        />
      </Provider>
    );

    const sizeSelect = screen.getByDisplayValue('16');
    fireEvent.change(sizeSelect, { target: { value: '24' } });

    expect(mockOnPropertyChange).toHaveBeenCalledWith({
      fontSize: 24,
    });
  });

  test('bold toggle works correctly', () => {
    const currentProperties: ElementProperties = {
      fontWeight: 'normal',
    };

    render(
      <Provider store={store}>
        <TextFormattingToolbar
          slideId="test-slide"
          elementId="test-element"
          currentProperties={currentProperties}
          onPropertyChange={mockOnPropertyChange}
        />
      </Provider>
    );

    const boldButton = screen.getByTitle(/Bold/);
    fireEvent.click(boldButton);

    expect(mockOnPropertyChange).toHaveBeenCalledWith({
      fontWeight: 'bold',
    });
  });

  test('italic toggle works correctly', () => {
    const currentProperties: ElementProperties = {
      fontStyle: 'normal',
    };

    render(
      <Provider store={store}>
        <TextFormattingToolbar
          slideId="test-slide"
          elementId="test-element"
          currentProperties={currentProperties}
          onPropertyChange={mockOnPropertyChange}
        />
      </Provider>
    );

    const italicButton = screen.getByTitle(/Italic/);
    fireEvent.click(italicButton);

    expect(mockOnPropertyChange).toHaveBeenCalledWith({
      fontStyle: 'italic',
    });
  });

  test('text alignment changes work correctly', () => {
    const currentProperties: ElementProperties = {
      textAlign: 'left',
    };

    render(
      <Provider store={store}>
        <TextFormattingToolbar
          slideId="test-slide"
          elementId="test-element"
          currentProperties={currentProperties}
          onPropertyChange={mockOnPropertyChange}
        />
      </Provider>
    );

    const centerButton = screen.getByTitle('Center');
    fireEvent.click(centerButton);

    expect(mockOnPropertyChange).toHaveBeenCalledWith({
      textAlign: 'center',
    });
  });

  test('opacity slider works correctly', () => {
    const currentProperties: ElementProperties = {
      opacity: 1,
    };

    render(
      <Provider store={store}>
        <TextFormattingToolbar
          slideId="test-slide"
          elementId="test-element"
          currentProperties={currentProperties}
          onPropertyChange={mockOnPropertyChange}
        />
      </Provider>
    );

    const opacitySlider = screen.getByTitle(/Opacity:/);
    fireEvent.change(opacitySlider, { target: { value: '50' } });

    expect(mockOnPropertyChange).toHaveBeenCalledWith({
      opacity: 0.5,
    });
  });

  test('preset buttons apply correct styles', () => {
    const currentProperties: ElementProperties = {};

    render(
      <Provider store={store}>
        <TextFormattingToolbar
          slideId="test-slide"
          elementId="test-element"
          currentProperties={currentProperties}
          onPropertyChange={mockOnPropertyChange}
        />
      </Provider>
    );

    const headingButton = screen.getByTitle('Heading Style');
    fireEvent.click(headingButton);

    expect(mockOnPropertyChange).toHaveBeenCalledWith({
      fontSize: 24,
      fontWeight: 'bold',
      textColor: { r: 0, g: 0, b: 0 },
    });
  });

  test('line height control works correctly', () => {
    const currentProperties: ElementProperties = {};

    render(
      <Provider store={store}>
        <TextFormattingToolbar
          slideId="test-slide"
          elementId="test-element"
          currentProperties={currentProperties}
          onPropertyChange={mockOnPropertyChange}
        />
      </Provider>
    );

    const lineHeightSelect = screen.getByDisplayValue('1.2');
    fireEvent.change(lineHeightSelect, { target: { value: '1.6' } });

    expect(mockOnPropertyChange).toHaveBeenCalledWith({
      lineHeight: 1.6,
    });
  });

  test('shows active state for current formatting', () => {
    const currentProperties: ElementProperties = {
      fontWeight: 'bold',
      fontStyle: 'italic',
      textAlign: 'center',
    };

    render(
      <Provider store={store}>
        <TextFormattingToolbar
          slideId="test-slide"
          elementId="test-element"
          currentProperties={currentProperties}
          onPropertyChange={mockOnPropertyChange}
        />
      </Provider>
    );

    const boldButton = screen.getByTitle(/Bold/);
    const italicButton = screen.getByTitle(/Italic/);
    const centerButton = screen.getByTitle('Center');

    expect(boldButton).toHaveClass('active');
    expect(italicButton).toHaveClass('active');
    expect(centerButton).toHaveClass('active');
  });

  test('shows math button and opens math input modal', () => {
    const currentProperties: ElementProperties = {};

    render(
      <Provider store={store}>
        <TextFormattingToolbar
          slideId="test-slide"
          elementId="test-element"
          currentProperties={currentProperties}
          onPropertyChange={mockOnPropertyChange}
        />
      </Provider>
    );

    const mathButton = screen.getByTitle(/Insert Math Expression/);
    expect(mathButton).toBeInTheDocument();
    expect(mathButton).toHaveTextContent('∑');

    fireEvent.click(mathButton);

    // Check if MathInput modal is opened
    expect(screen.getByText('Math Expression Editor')).toBeInTheDocument();
  });

  test('shows math indicator when element has math', () => {
    const currentProperties: ElementProperties = {
      hasMath: true,
    } as any;

    render(
      <Provider store={store}>
        <TextFormattingToolbar
          slideId="test-slide"
          elementId="test-element"
          currentProperties={currentProperties}
          onPropertyChange={mockOnPropertyChange}
        />
      </Provider>
    );

    const mathButton = screen.getByTitle(/Insert Math Expression/);
    expect(mathButton).toHaveClass('active');
    
    const mathIndicator = screen.getByTitle('This element contains math expressions');
    expect(mathIndicator).toBeInTheDocument();
    expect(mathIndicator).toHaveTextContent('📐');
  });

  test('math button keyboard shortcut hint', () => {
    const currentProperties: ElementProperties = {};

    render(
      <Provider store={store}>
        <TextFormattingToolbar
          slideId="test-slide"
          elementId="test-element"
          currentProperties={currentProperties}
          onPropertyChange={mockOnPropertyChange}
        />
      </Provider>
    );

    const mathButton = screen.getByTitle(/Insert Math Expression \(Ctrl\+M\)/);
    expect(mathButton).toBeInTheDocument();
  });
});