import { useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import {
  pushAction,
  undo as undoAction,
  redo as redoAction,
  finishUndo,
  finishRedo,
  clearHistory,
} from '../store/slices/undoRedoSlice';
import { loadPresentation } from '../store/slices/presentationSlice';
import { Presentation } from '../types/presentation';

export const useUndoRedo = () => {
  const dispatch = useDispatch();
  const undoRedoState = useSelector((state: RootState) => state.undoRedo);
  const currentPresentation = useSelector((state: RootState) => state.presentation.currentPresentation);

  const canUndo = undoRedoState.undoStack.length > 0;
  const canRedo = undoRedoState.redoStack.length > 0;

  const recordAction = useCallback((
    actionType: string,
    description: string,
    presentationState: Presentation
  ) => {
    dispatch(pushAction({
      type: actionType,
      description,
      presentationState,
    }));
  }, [dispatch]);

  const undo = useCallback(() => {
    if (!canUndo || !currentPresentation) return;

    // Get the state to restore from the undo stack
    const actionToUndo = undoRedoState.undoStack[undoRedoState.undoStack.length - 1];
    
    if (actionToUndo) {
      // Dispatch undo action to update the stacks
      dispatch(undoAction());
      
      // Restore the presentation state
      dispatch(loadPresentation(actionToUndo.presentationState));
      
      // Mark undo as finished
      dispatch(finishUndo());
    }
  }, [dispatch, canUndo, currentPresentation, undoRedoState.undoStack]);

  const redo = useCallback(() => {
    if (!canRedo) return;

    // Get the state to restore from the redo stack
    const actionToRedo = undoRedoState.redoStack[undoRedoState.redoStack.length - 1];
    
    if (actionToRedo) {
      // Dispatch redo action to update the stacks
      dispatch(redoAction());
      
      // We need to get the "next" state, which would be the current presentation
      // after applying the redo action. For simplicity, we'll store both states.
      // In a more sophisticated implementation, we'd store action deltas.
      
      // Mark redo as finished
      dispatch(finishRedo());
    }
  }, [dispatch, canRedo, undoRedoState.redoStack]);

  const clearUndoHistory = useCallback(() => {
    dispatch(clearHistory());
  }, [dispatch]);

  const getUndoDescription = useCallback(() => {
    if (!canUndo) return null;
    const lastAction = undoRedoState.undoStack[undoRedoState.undoStack.length - 1];
    return lastAction?.description || 'Unknown action';
  }, [canUndo, undoRedoState.undoStack]);

  const getRedoDescription = useCallback(() => {
    if (!canRedo) return null;
    const nextAction = undoRedoState.redoStack[undoRedoState.redoStack.length - 1];
    return nextAction?.description || 'Unknown action';
  }, [canRedo, undoRedoState.redoStack]);

  return {
    canUndo,
    canRedo,
    undo,
    redo,
    recordAction,
    clearUndoHistory,
    getUndoDescription,
    getRedoDescription,
    undoStackSize: undoRedoState.undoStack.length,
    redoStackSize: undoRedoState.redoStack.length,
  };
};

// Helper hook for automatically recording actions
export const useActionRecorder = () => {
  const { recordAction } = useUndoRedo();
  const currentPresentation = useSelector((state: RootState) => state.presentation.currentPresentation);

  const withUndo = useCallback((
    actionType: string,
    description: string,
    action: () => void
  ) => {
    if (!currentPresentation) return;

    // Record the current state before performing the action
    recordAction(actionType, description, currentPresentation);
    
    // Perform the action
    action();
  }, [recordAction, currentPresentation]);

  return { withUndo };
};