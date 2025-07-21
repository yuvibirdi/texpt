import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Presentation } from '../../types/presentation';

export interface UndoRedoAction {
  id: string;
  type: string;
  timestamp: Date;
  description: string;
  presentationState: Presentation;
}

interface UndoRedoState {
  undoStack: UndoRedoAction[];
  redoStack: UndoRedoAction[];
  maxHistorySize: number;
  isUndoing: boolean;
  isRedoing: boolean;
}

const initialState: UndoRedoState = {
  undoStack: [],
  redoStack: [],
  maxHistorySize: 50,
  isUndoing: false,
  isRedoing: false,
};

const undoRedoSlice = createSlice({
  name: 'undoRedo',
  initialState,
  reducers: {
    pushAction: (state, action: PayloadAction<{
      type: string;
      description: string;
      presentationState: Presentation;
    }>) => {
      // Don't record actions while undoing/redoing to prevent infinite loops
      if (state.isUndoing || state.isRedoing) {
        return;
      }

      const undoAction: UndoRedoAction = {
        id: `undo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: action.payload.type,
        timestamp: new Date(),
        description: action.payload.description,
        presentationState: JSON.parse(JSON.stringify(action.payload.presentationState)),
      };

      // Add to undo stack
      state.undoStack.push(undoAction);

      // Limit stack size
      if (state.undoStack.length > state.maxHistorySize) {
        state.undoStack.shift();
      }

      // Clear redo stack when new action is performed
      state.redoStack = [];
    },

    undo: (state) => {
      if (state.undoStack.length === 0) {
        return;
      }

      state.isUndoing = true;
      
      // Move action from undo to redo stack
      const actionToUndo = state.undoStack.pop()!;
      state.redoStack.push(actionToUndo);

      // Limit redo stack size
      if (state.redoStack.length > state.maxHistorySize) {
        state.redoStack.shift();
      }
    },

    redo: (state) => {
      if (state.redoStack.length === 0) {
        return;
      }

      state.isRedoing = true;
      
      // Move action from redo to undo stack
      const actionToRedo = state.redoStack.pop()!;
      state.undoStack.push(actionToRedo);

      // Limit undo stack size
      if (state.undoStack.length > state.maxHistorySize) {
        state.undoStack.shift();
      }
    },

    finishUndo: (state) => {
      state.isUndoing = false;
    },

    finishRedo: (state) => {
      state.isRedoing = false;
    },

    clearHistory: (state) => {
      state.undoStack = [];
      state.redoStack = [];
    },

    setMaxHistorySize: (state, action: PayloadAction<number>) => {
      state.maxHistorySize = Math.max(1, action.payload);
      
      // Trim stacks if they exceed new limit
      if (state.undoStack.length > state.maxHistorySize) {
        state.undoStack = state.undoStack.slice(-state.maxHistorySize);
      }
      if (state.redoStack.length > state.maxHistorySize) {
        state.redoStack = state.redoStack.slice(-state.maxHistorySize);
      }
    },
  },
});

export const {
  pushAction,
  undo,
  redo,
  finishUndo,
  finishRedo,
  clearHistory,
  setMaxHistorySize,
} = undoRedoSlice.actions;

export default undoRedoSlice.reducer;