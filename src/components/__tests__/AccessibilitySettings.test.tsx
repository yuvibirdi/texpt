import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import AccessibilitySettings from '../AccessibilitySettings';
import uiReducer from '../../store/slices/uiSlice';

// Mock the accessibility service
jest.mock('../../services/accessibilityService', () => ({
  accessibilityService: {
    updateSetting: jest.fn(),
    announce: jest.fn(),
  },
}));

const createMockStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      ui: uiReducer,
    },
    preloadedState: {
      ui: {
        accessibility: {
          keyboardMode: 'default',
          highContrastMode: false,
          screenReaderSupport: true,
          reducedMotion: false,
          focusIndicators: true,
          keyboardNavigation: true,
          announceChanges: true,
          fontSize: 'medium',
        },
        ...initialState,
      },
    },
  });
};

describe('AccessibilitySettings', () => {
  it('renders accessibility settings dialog when open', () => {
    const store = createMockStore();
    
    render(
      <Provider store={store}>
        <AccessibilitySettings isOpen={true} onClose={jest.fn()} />
      </Provider>
    );

    expect(screen.getByText('Accessibility Settings')).toBeInTheDocument();
    expect(screen.getByText('Keyboard Navigation Mode')).toBeInTheDocument();
    expect(screen.getByText('Visual Settings')).toBeInTheDocument();
    expect(screen.getByText('Screen Reader Support')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    const store = createMockStore();
    
    render(
      <Provider store={store}>
        <AccessibilitySettings isOpen={false} onClose={jest.fn()} />
      </Provider>
    );

    expect(screen.queryByText('Accessibility Settings')).not.toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const store = createMockStore();
    const onClose = jest.fn();
    
    render(
      <Provider store={store}>
        <AccessibilitySettings isOpen={true} onClose={onClose} />
      </Provider>
    );

    fireEvent.click(screen.getByLabelText('Close accessibility settings'));
    expect(onClose).toHaveBeenCalled();
  });

  it('displays keyboard shortcuts for different modes', () => {
    const store = createMockStore();
    
    render(
      <Provider store={store}>
        <AccessibilitySettings isOpen={true} onClose={jest.fn()} />
      </Provider>
    );

    expect(screen.getByText('Global Shortcuts')).toBeInTheDocument();
    expect(screen.getByText('Canvas Shortcuts')).toBeInTheDocument();
    
    // Check for some specific shortcuts
    expect(screen.getByText('Ctrl+N')).toBeInTheDocument();
    expect(screen.getByText(/New presentation/)).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
    expect(screen.getByText(/Delete selected element/)).toBeInTheDocument();
  });

  it('shows vim shortcuts when vim mode is selected', () => {
    const store = createMockStore({
      accessibility: {
        keyboardMode: 'vim',
        highContrastMode: false,
        screenReaderSupport: true,
        reducedMotion: false,
        focusIndicators: true,
        keyboardNavigation: true,
        announceChanges: true,
        fontSize: 'medium',
      },
    });
    
    render(
      <Provider store={store}>
        <AccessibilitySettings isOpen={true} onClose={jest.fn()} />
      </Provider>
    );

    expect(screen.getByText('Vim Mode')).toBeInTheDocument();
    expect(screen.getByText('h/j/k/l')).toBeInTheDocument();
    expect(screen.getByText(/Navigate elements/)).toBeInTheDocument();
  });

  it('shows emacs shortcuts when emacs mode is selected', () => {
    const store = createMockStore({
      accessibility: {
        keyboardMode: 'emacs',
        highContrastMode: false,
        screenReaderSupport: true,
        reducedMotion: false,
        focusIndicators: true,
        keyboardNavigation: true,
        announceChanges: true,
        fontSize: 'medium',
      },
    });
    
    render(
      <Provider store={store}>
        <AccessibilitySettings isOpen={true} onClose={jest.fn()} />
      </Provider>
    );

    expect(screen.getByText('Emacs Mode')).toBeInTheDocument();
    expect(screen.getByText('Ctrl+F/B')).toBeInTheDocument();
    expect(screen.getByText(/Navigate left\/right/)).toBeInTheDocument();
  });
});