import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import TextFormattingToolbar from '../TextFormattingToolbar';
import presentationReducer from '../../store/slices/presentationSlice';
import uiReducer from '../../store/slices/uiSlice';
import { ElementProperties } from '../../types/presentation';

// Mock store setup
const createMockStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      presentation: presentationReducer,
      ui: uiReducer,
    },
    preloadedState: {
      presentation: {
        currentPresentation: {
          id: 'test-presentation',
          slides: [
            {
              id: 'test-slide',
              elements: [
                {
                  id: 'test-element',
                  type: 'text',
                  content: 'Test content',
                  properties: {},
                }
              ]
            }
          ]
        },
        ...initialState.presentation,
      },
      ui: {
        ...initialState.ui,
      },
    },
  });
};

const defaultProps = {
  slideId: 'test-slide',
  elementId: 'test-element',
  currentProperties: {} as ElementProperties,
  onPropertyChange: jest.fn(),
};

describe('TextFormattingToolbar - List Functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders list controls when element is selected', () => {
    const store = createMockStore();
    render(
      <Provider store={store}>
        <TextFormattingToolbar {...defaultProps} />
      </Provider>
    );

    expect(screen.getByTitle('Bullet List')).toBeInTheDocument();
    expect(screen.getByTitle('Numbered List')).toBeInTheDocument();
    expect(screen.getByTitle('List Style')).toBeInTheDocument();
    expect(screen.getByTitle('Decrease Indent')).toBeInTheDocument();
    expect(screen.getByTitle('Increase Indent')).toBeInTheDocument();
  });

  it('activates bullet list when clicked', () => {
    const mockOnPropertyChange = jest.fn();
    const store = createMockStore();
    
    render(
      <Provider store={store}>
        <TextFormattingToolbar 
          {...defaultProps} 
          onPropertyChange={mockOnPropertyChange}
        />
      </Provider>
    );

    const bulletButton = screen.getByTitle('Bullet List');
    fireEvent.click(bulletButton);

    expect(mockOnPropertyChange).toHaveBeenCalledWith({
      listType: 'bullet',
      listStyle: 'disc',
      listIndentLevel: 0,
    });
  });

  it('activates numbered list when clicked', () => {
    const mockOnPropertyChange = jest.fn();
    const store = createMockStore();
    
    render(
      <Provider store={store}>
        <TextFormattingToolbar 
          {...defaultProps} 
          onPropertyChange={mockOnPropertyChange}
        />
      </Provider>
    );

    const numberedButton = screen.getByTitle('Numbered List');
    fireEvent.click(numberedButton);

    expect(mockOnPropertyChange).toHaveBeenCalledWith({
      listType: 'numbered',
      listStyle: 'decimal',
      listIndentLevel: 0,
    });
  });

  it('shows active state for bullet list', () => {
    const store = createMockStore();
    const propsWithBulletList = {
      ...defaultProps,
      currentProperties: {
        listType: 'bullet',
        listStyle: 'disc',
        listIndentLevel: 0,
      } as ElementProperties,
    };

    render(
      <Provider store={store}>
        <TextFormattingToolbar {...propsWithBulletList} />
      </Provider>
    );

    const bulletButton = screen.getByTitle('Bullet List');
    expect(bulletButton).toHaveClass('active');
  });

  it('shows active state for numbered list', () => {
    const store = createMockStore();
    const propsWithNumberedList = {
      ...defaultProps,
      currentProperties: {
        listType: 'numbered',
        listStyle: 'decimal',
        listIndentLevel: 0,
      } as ElementProperties,
    };

    render(
      <Provider store={store}>
        <TextFormattingToolbar {...propsWithNumberedList} />
      </Provider>
    );

    const numberedButton = screen.getByTitle('Numbered List');
    expect(numberedButton).toHaveClass('active');
  });

  it('changes list style when dropdown is changed', () => {
    const mockOnPropertyChange = jest.fn();
    const store = createMockStore();
    const propsWithBulletList = {
      ...defaultProps,
      currentProperties: {
        listType: 'bullet',
        listStyle: 'disc',
        listIndentLevel: 0,
      } as ElementProperties,
      onPropertyChange: mockOnPropertyChange,
    };

    render(
      <Provider store={store}>
        <TextFormattingToolbar {...propsWithBulletList} />
      </Provider>
    );

    const styleSelect = screen.getByTitle('List Style');
    fireEvent.change(styleSelect, { target: { value: 'circle' } });

    expect(mockOnPropertyChange).toHaveBeenCalledWith({
      listStyle: 'circle',
    });
  });

  it('opens custom bullet dialog when custom is selected', async () => {
    const mockOnPropertyChange = jest.fn();
    const store = createMockStore();
    const propsWithBulletList = {
      ...defaultProps,
      currentProperties: {
        listType: 'bullet',
        listStyle: 'disc',
        listIndentLevel: 0,
      } as ElementProperties,
      onPropertyChange: mockOnPropertyChange,
    };

    render(
      <Provider store={store}>
        <TextFormattingToolbar {...propsWithBulletList} />
      </Provider>
    );

    const styleSelect = screen.getByTitle('List Style');
    fireEvent.change(styleSelect, { target: { value: 'custom' } });

    await waitFor(() => {
      expect(screen.getByText('Custom Bullet Symbol')).toBeInTheDocument();
    });
  });

  it('increases indent level when increase indent is clicked', () => {
    const mockOnPropertyChange = jest.fn();
    const store = createMockStore();
    const propsWithBulletList = {
      ...defaultProps,
      currentProperties: {
        listType: 'bullet',
        listStyle: 'disc',
        listIndentLevel: 0,
      } as ElementProperties,
      onPropertyChange: mockOnPropertyChange,
    };

    render(
      <Provider store={store}>
        <TextFormattingToolbar {...propsWithBulletList} />
      </Provider>
    );

    const increaseIndentButton = screen.getByTitle('Increase Indent');
    fireEvent.click(increaseIndentButton);

    expect(mockOnPropertyChange).toHaveBeenCalledWith({
      listIndentLevel: 1,
    });
  });

  it('decreases indent level when decrease indent is clicked', () => {
    const mockOnPropertyChange = jest.fn();
    const store = createMockStore();
    const propsWithBulletList = {
      ...defaultProps,
      currentProperties: {
        listType: 'bullet',
        listStyle: 'disc',
        listIndentLevel: 2,
      } as ElementProperties,
      onPropertyChange: mockOnPropertyChange,
    };

    render(
      <Provider store={store}>
        <TextFormattingToolbar {...propsWithBulletList} />
      </Provider>
    );

    const decreaseIndentButton = screen.getByTitle('Decrease Indent');
    fireEvent.click(decreaseIndentButton);

    expect(mockOnPropertyChange).toHaveBeenCalledWith({
      listIndentLevel: 1,
    });
  });

  it('disables indent controls when no list is active', () => {
    const store = createMockStore();
    
    render(
      <Provider store={store}>
        <TextFormattingToolbar {...defaultProps} />
      </Provider>
    );

    const increaseIndentButton = screen.getByTitle('Increase Indent');
    const decreaseIndentButton = screen.getByTitle('Decrease Indent');

    expect(increaseIndentButton).toBeDisabled();
    expect(decreaseIndentButton).toBeDisabled();
  });

  it('prevents indent level from going below 0', () => {
    const mockOnPropertyChange = jest.fn();
    const store = createMockStore();
    const propsWithBulletList = {
      ...defaultProps,
      currentProperties: {
        listType: 'bullet',
        listStyle: 'disc',
        listIndentLevel: 0,
      } as ElementProperties,
      onPropertyChange: mockOnPropertyChange,
    };

    render(
      <Provider store={store}>
        <TextFormattingToolbar {...propsWithBulletList} />
      </Provider>
    );

    const decreaseIndentButton = screen.getByTitle('Decrease Indent');
    expect(decreaseIndentButton).toBeDisabled();
  });

  it('prevents indent level from going above 5', () => {
    const mockOnPropertyChange = jest.fn();
    const store = createMockStore();
    const propsWithBulletList = {
      ...defaultProps,
      currentProperties: {
        listType: 'bullet',
        listStyle: 'disc',
        listIndentLevel: 5,
      } as ElementProperties,
      onPropertyChange: mockOnPropertyChange,
    };

    render(
      <Provider store={store}>
        <TextFormattingToolbar {...propsWithBulletList} />
      </Provider>
    );

    const increaseIndentButton = screen.getByTitle('Increase Indent');
    expect(increaseIndentButton).toBeDisabled();
  });

  it('shows list level indicator when list is active', () => {
    const store = createMockStore();
    const propsWithBulletList = {
      ...defaultProps,
      currentProperties: {
        listType: 'bullet',
        listStyle: 'disc',
        listIndentLevel: 2,
      } as ElementProperties,
    };

    render(
      <Provider store={store}>
        <TextFormattingToolbar {...propsWithBulletList} />
      </Provider>
    );

    expect(screen.getByText('L3')).toBeInTheDocument(); // Level 2 + 1 = L3
  });

  it('applies custom bullet symbol from preset buttons', async () => {
    const mockOnPropertyChange = jest.fn();
    const store = createMockStore();
    const propsWithBulletList = {
      ...defaultProps,
      currentProperties: {
        listType: 'bullet',
        listStyle: 'disc',
        listIndentLevel: 0,
      } as ElementProperties,
      onPropertyChange: mockOnPropertyChange,
    };

    render(
      <Provider store={store}>
        <TextFormattingToolbar {...propsWithBulletList} />
      </Provider>
    );

    // Open custom bullet dialog
    const styleSelect = screen.getByTitle('List Style');
    fireEvent.change(styleSelect, { target: { value: 'custom' } });

    await waitFor(() => {
      expect(screen.getByText('Custom Bullet Symbol')).toBeInTheDocument();
    });

    // Click on a preset button
    const starButton = screen.getByText('★');
    fireEvent.click(starButton);

    expect(mockOnPropertyChange).toHaveBeenCalledWith({
      listStyle: 'custom',
      customBulletSymbol: '★',
    });
  });

  it('applies custom bullet symbol from text input', async () => {
    const mockOnPropertyChange = jest.fn();
    const store = createMockStore();
    const propsWithBulletList = {
      ...defaultProps,
      currentProperties: {
        listType: 'bullet',
        listStyle: 'disc',
        listIndentLevel: 0,
      } as ElementProperties,
      onPropertyChange: mockOnPropertyChange,
    };

    render(
      <Provider store={store}>
        <TextFormattingToolbar {...propsWithBulletList} />
      </Provider>
    );

    // Open custom bullet dialog
    const styleSelect = screen.getByTitle('List Style');
    fireEvent.change(styleSelect, { target: { value: 'custom' } });

    await waitFor(() => {
      expect(screen.getByText('Custom Bullet Symbol')).toBeInTheDocument();
    });

    // Type in custom symbol and press Enter
    const input = screen.getByPlaceholderText('e.g., ★, ►, ✓, →');
    fireEvent.change(input, { target: { value: '→' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(mockOnPropertyChange).toHaveBeenCalledWith({
      listStyle: 'custom',
      customBulletSymbol: '→',
    });
  });

  it('closes custom bullet dialog when Cancel is clicked', async () => {
    const store = createMockStore();
    const propsWithBulletList = {
      ...defaultProps,
      currentProperties: {
        listType: 'bullet',
        listStyle: 'disc',
        listIndentLevel: 0,
      } as ElementProperties,
    };

    render(
      <Provider store={store}>
        <TextFormattingToolbar {...propsWithBulletList} />
      </Provider>
    );

    // Open custom bullet dialog
    const styleSelect = screen.getByTitle('List Style');
    fireEvent.change(styleSelect, { target: { value: 'custom' } });

    await waitFor(() => {
      expect(screen.getByText('Custom Bullet Symbol')).toBeInTheDocument();
    });

    // Click Cancel
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    await waitFor(() => {
      expect(screen.queryByText('Custom Bullet Symbol')).not.toBeInTheDocument();
    });
  });

  it('closes custom bullet dialog when Escape is pressed', async () => {
    const store = createMockStore();
    const propsWithBulletList = {
      ...defaultProps,
      currentProperties: {
        listType: 'bullet',
        listStyle: 'disc',
        listIndentLevel: 0,
      } as ElementProperties,
    };

    render(
      <Provider store={store}>
        <TextFormattingToolbar {...propsWithBulletList} />
      </Provider>
    );

    // Open custom bullet dialog
    const styleSelect = screen.getByTitle('List Style');
    fireEvent.change(styleSelect, { target: { value: 'custom' } });

    await waitFor(() => {
      expect(screen.getByText('Custom Bullet Symbol')).toBeInTheDocument();
    });

    // Press Escape
    const input = screen.getByPlaceholderText('e.g., ★, ►, ✓, →');
    fireEvent.keyDown(input, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByText('Custom Bullet Symbol')).not.toBeInTheDocument();
    });
  });
});