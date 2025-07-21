import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { useUndoRedo } from '../useUndoRedo';
import presentationReducer from '../../store/slices/presentationSlice';
import undoRedoReducer from '../../store/slices/undoRedoSlice';
import uiReducer from '../../store/slices/uiSlice';
import themeReducer from '../../store/slices/themeSlice';
import { 
  Presentation, 
  createDefaultTheme, 
  createDefaultPresentationSettings, 
  createDefaultPresentationMetadata 
} from '../../types/presentation';

// Create a test store
const createTestStore = () => configureStore({
  reducer: {
    presentation: presentationReducer,
    undoRedo: undoRedoReducer,
    ui: uiReducer,
    theme: themeReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActionsPaths: ['payload.presentationState', 'payload.timestamp'],
        ignoredPaths: ['undoRedo.undoStack', 'undoRedo.redoStack'],
      },
    }),
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <Provider store={createTestStore()}>{children}</Provider>
);

// Helper function to create a test presentation
const createDefaultPresentation = (): Presentation => ({
  id: `presentation-${Date.now()}`,
  title: 'Test Presentation',
  slides: [],
  theme: createDefaultTheme(),
  metadata: createDefaultPresentationMetadata(),
  settings: createDefaultPresentationSettings(),
  createdAt: new Date(),
  updatedAt: new Date(),
  version: '1.0.0',
});

describe('useUndoRedo', () => {
  it('should initialize with empty stacks', () => {
    const { result } = renderHook(() => useUndoRedo(), { wrapper });
    
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
    expect(result.current.undoStackSize).toBe(0);
    expect(result.current.redoStackSize).toBe(0);
  });

  it('should record actions', () => {
    const { result } = renderHook(() => useUndoRedo(), { wrapper });
    const presentation = createDefaultPresentation();
    
    act(() => {
      result.current.recordAction('test-action', 'Test action description', presentation);
    });
    
    expect(result.current.canUndo).toBe(true);
    expect(result.current.undoStackSize).toBe(1);
    expect(result.current.getUndoDescription()).toBe('Test action description');
  });

  it('should clear redo stack when new action is recorded', () => {
    const { result } = renderHook(() => useUndoRedo(), { wrapper });
    const presentation = createDefaultPresentation();
    
    act(() => {
      // Record first action
      result.current.recordAction('action-1', 'Action 1', presentation);
      // Record second action
      result.current.recordAction('action-2', 'Action 2', presentation);
      // Undo to populate redo stack
      result.current.undo();
    });
    
    expect(result.current.canRedo).toBe(true);
    
    act(() => {
      // Record new action should clear redo stack
      result.current.recordAction('action-3', 'Action 3', presentation);
    });
    
    expect(result.current.canRedo).toBe(false);
    expect(result.current.redoStackSize).toBe(0);
  });

  it('should provide correct descriptions', () => {
    const { result } = renderHook(() => useUndoRedo(), { wrapper });
    const presentation = createDefaultPresentation();
    
    act(() => {
      result.current.recordAction('test-action', 'Test description', presentation);
      result.current.undo();
    });
    
    expect(result.current.getRedoDescription()).toBe('Test description');
    expect(result.current.getUndoDescription()).toBeNull();
  });

  it('should clear history', () => {
    const { result } = renderHook(() => useUndoRedo(), { wrapper });
    const presentation = createDefaultPresentation();
    
    act(() => {
      result.current.recordAction('test-action', 'Test action', presentation);
      result.current.clearUndoHistory();
    });
    
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
    expect(result.current.undoStackSize).toBe(0);
    expect(result.current.redoStackSize).toBe(0);
  });
});