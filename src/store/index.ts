import { configureStore } from '@reduxjs/toolkit';
import presentationReducer from './slices/presentationSlice';
import uiReducer from './slices/uiSlice';
import themeReducer from './slices/themeSlice';
import undoRedoReducer from './slices/undoRedoSlice';

export const store = configureStore({
  reducer: {
    presentation: presentationReducer,
    ui: uiReducer,
    theme: themeReducer,
    undoRedo: undoRedoReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these field paths in all actions
        ignoredActionsPaths: [
          'payload.timestamp', 
          'payload.createdAt', 
          'payload.updatedAt', 
          'payload.date',
          'payload.element.createdAt',
          'payload.element.updatedAt',
          'payload.updates.createdAt',
          'payload.updates.updatedAt',
          'payload.presentationState',
        ],
        // Ignore these paths in the state
        ignoredPaths: [
          'presentation.currentPresentation.createdAt',
          'presentation.currentPresentation.updatedAt',
          'presentation.currentPresentation.metadata.date',
          'presentation.currentPresentation.slides',
          'presentation.lastSaved',
          'ui.lastCompilationTime',
          'ui.notifications',
          'theme.availableThemes',
          'theme.availableSlideTemplates',
          'theme.themePreview',
        ],
        // Ignore Date instances in actions
        ignoredActions: [
          'presentation/createPresentation',
          'presentation/addSlide',
          'presentation/updateSlide',
          'presentation/addElement',
          'presentation/updateElement',
          'presentation/deleteSlide',
          'presentation/reorderSlides',
          'presentation/duplicateSlide',
          'presentation/markAsSaved',
          'ui/finishCompilation',
          'ui/addNotification',
        ],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;