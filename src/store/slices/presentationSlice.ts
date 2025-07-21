import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  Presentation,
  Slide,
  SlideElement,
  ShapeConnection,
  Theme,
  createDefaultTheme,
  createDefaultSlideLayout,
  createDefaultBackground,
  createDefaultPresentationSettings,
  createDefaultPresentationMetadata,
  ElementProperties,
  Position,
  Size,
} from '../../types/presentation';

interface PresentationState {
  currentPresentation: Presentation | null;
  presentations: Presentation[];
  currentSlideId: string | null;
  isModified: boolean;
  lastSaved: Date | null;
}

const createDefaultSlide = (): Slide => ({
  id: `slide-${Date.now()}`,
  title: 'New Slide',
  elements: [],
  connections: [],
  layout: createDefaultSlideLayout(),
  background: createDefaultBackground(),
  notes: '',
  createdAt: new Date(),
  updatedAt: new Date(),
});

const createDefaultPresentation = (): Presentation => ({
  id: `presentation-${Date.now()}`,
  title: 'New Presentation',
  slides: [createDefaultSlide()],
  theme: createDefaultTheme(),
  metadata: createDefaultPresentationMetadata(),
  settings: createDefaultPresentationSettings(),
  createdAt: new Date(),
  updatedAt: new Date(),
  version: '1.0.0',
});

const defaultPresentation = createDefaultPresentation();
const initialState: PresentationState = {
  currentPresentation: defaultPresentation,
  presentations: [],
  currentSlideId: defaultPresentation.slides[0]?.id || null,
  isModified: false,
  lastSaved: null,
};

const presentationSlice = createSlice({
  name: 'presentation',
  initialState,
  reducers: {
    // Presentation CRUD operations
    createPresentation: (state, action: PayloadAction<{ title?: string }>) => {
      const newPresentation = createDefaultPresentation();
      if (action.payload.title) {
        newPresentation.title = action.payload.title;
        newPresentation.metadata.title = action.payload.title;
      }
      
      state.currentPresentation = newPresentation;
      state.currentSlideId = newPresentation.slides[0]?.id || null;
      state.isModified = false;
      state.lastSaved = null;
    },
    
    loadPresentation: (state, action: PayloadAction<Presentation>) => {
      state.currentPresentation = action.payload;
      state.currentSlideId = action.payload.slides[0]?.id || null;
      state.isModified = false;
      state.lastSaved = new Date();
    },
    
    updatePresentationMetadata: (state, action: PayloadAction<Partial<Presentation['metadata']>>) => {
      if (!state.currentPresentation) return;
      
      state.currentPresentation.metadata = {
        ...state.currentPresentation.metadata,
        ...action.payload,
      };
      state.currentPresentation.updatedAt = new Date();
      state.isModified = true;
    },
    
    updatePresentationSettings: (state, action: PayloadAction<Partial<Presentation['settings']>>) => {
      if (!state.currentPresentation) return;
      
      state.currentPresentation.settings = {
        ...state.currentPresentation.settings,
        ...action.payload,
      };
      state.currentPresentation.updatedAt = new Date();
      state.isModified = true;
    },

    // Theme management
    applyTheme: (state, action: PayloadAction<Theme>) => {
      if (!state.currentPresentation) return;
      
      state.currentPresentation.theme = action.payload;
      state.currentPresentation.updatedAt = new Date();
      state.isModified = true;
    },
    
    // Slide CRUD operations
    addSlide: (state, action: PayloadAction<{ template?: string; insertAfter?: string }>) => {
      if (!state.currentPresentation) return;
      
      const slideNumber = state.currentPresentation.slides.length + 1;
      const newSlide = createDefaultSlide();
      newSlide.title = `Slide ${slideNumber}`;
      
      if (action.payload.template) {
        // Apply template logic here when templates are implemented
        newSlide.layout.name = action.payload.template;
      }
      
      // Insert after specific slide or at the end
      if (action.payload.insertAfter) {
        const insertIndex = state.currentPresentation.slides.findIndex(
          slide => slide.id === action.payload.insertAfter
        );
        if (insertIndex !== -1) {
          state.currentPresentation.slides.splice(insertIndex + 1, 0, newSlide);
        } else {
          state.currentPresentation.slides.push(newSlide);
        }
      } else {
        state.currentPresentation.slides.push(newSlide);
      }
      
      state.currentSlideId = newSlide.id;
      state.currentPresentation.updatedAt = new Date();
      state.isModified = true;
    },
    
    deleteSlide: (state, action: PayloadAction<string>) => {
      if (!state.currentPresentation) return;
      
      const slideIndex = state.currentPresentation.slides.findIndex(
        slide => slide.id === action.payload
      );
      
      if (slideIndex === -1) return;
      
      // Don't delete if it's the only slide
      if (state.currentPresentation.slides.length === 1) return;
      
      state.currentPresentation.slides.splice(slideIndex, 1);
      
      // Update current slide if the deleted slide was selected
      if (state.currentSlideId === action.payload) {
        const newIndex = Math.min(slideIndex, state.currentPresentation.slides.length - 1);
        state.currentSlideId = state.currentPresentation.slides[newIndex]?.id || null;
      }
      
      state.currentPresentation.updatedAt = new Date();
      state.isModified = true;
    },
    
    selectSlide: (state, action: PayloadAction<string>) => {
      if (!state.currentPresentation) return;
      
      const slideExists = state.currentPresentation.slides.some(
        slide => slide.id === action.payload
      );
      
      if (slideExists) {
        state.currentSlideId = action.payload;
      }
    },
    
    reorderSlides: (state, action: PayloadAction<{ fromIndex: number; toIndex: number }>) => {
      if (!state.currentPresentation) return;
      
      const { fromIndex, toIndex } = action.payload;
      const slides = state.currentPresentation.slides;
      
      if (fromIndex < 0 || fromIndex >= slides.length || toIndex < 0 || toIndex >= slides.length) {
        return;
      }
      
      const [movedSlide] = slides.splice(fromIndex, 1);
      slides.splice(toIndex, 0, movedSlide);
      
      state.currentPresentation.updatedAt = new Date();
      state.isModified = true;
    },
    
    updateSlide: (state, action: PayloadAction<{ slideId: string; updates: Partial<Slide> }>) => {
      if (!state.currentPresentation) return;
      
      const slide = state.currentPresentation.slides.find(s => s.id === action.payload.slideId);
      if (slide) {
        Object.assign(slide, action.payload.updates);
        slide.updatedAt = new Date();
        state.currentPresentation.updatedAt = new Date();
        state.isModified = true;
      }
    },
    
    updateSlideTitle: (state, action: PayloadAction<{ slideId: string; title: string }>) => {
      if (!state.currentPresentation) return;
      
      const slide = state.currentPresentation.slides.find(s => s.id === action.payload.slideId);
      if (slide) {
        slide.title = action.payload.title;
        slide.updatedAt = new Date();
        state.currentPresentation.updatedAt = new Date();
        state.isModified = true;
      }
    },
    
    updateSlideNotes: (state, action: PayloadAction<{ slideId: string; notes: string }>) => {
      if (!state.currentPresentation) return;
      
      const slide = state.currentPresentation.slides.find(s => s.id === action.payload.slideId);
      if (slide) {
        slide.notes = action.payload.notes;
        slide.updatedAt = new Date();
        state.currentPresentation.updatedAt = new Date();
        state.isModified = true;
      }
    },
    
    // Element CRUD operations
    addElement: (state, action: PayloadAction<{
      slideId: string;
      element: Omit<SlideElement, 'id' | 'createdAt' | 'updatedAt'>;
    }>) => {
      if (!state.currentPresentation) return;
      
      const slide = state.currentPresentation.slides.find(s => s.id === action.payload.slideId);
      if (slide) {
        const newElement: SlideElement = {
          ...action.payload.element,
          id: `element-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        slide.elements.push(newElement);
        slide.updatedAt = new Date();
        state.currentPresentation.updatedAt = new Date();
        state.isModified = true;
      }
    },
    
    updateElement: (state, action: PayloadAction<{
      slideId: string;
      elementId: string;
      updates: Partial<SlideElement>;
    }>) => {
      if (!state.currentPresentation) return;
      
      const slide = state.currentPresentation.slides.find(s => s.id === action.payload.slideId);
      if (slide) {
        const element = slide.elements.find(e => e.id === action.payload.elementId);
        if (element) {
          Object.assign(element, action.payload.updates);
          element.updatedAt = new Date();
          slide.updatedAt = new Date();
          state.currentPresentation.updatedAt = new Date();
          state.isModified = true;
        }
      }
    },
    
    deleteElement: (state, action: PayloadAction<{ slideId: string; elementId: string }>) => {
      if (!state.currentPresentation) return;
      
      const slide = state.currentPresentation.slides.find(s => s.id === action.payload.slideId);
      if (slide) {
        const elementIndex = slide.elements.findIndex(e => e.id === action.payload.elementId);
        if (elementIndex !== -1) {
          slide.elements.splice(elementIndex, 1);
          
          // Also remove any connections associated with this element
          const initialConnectionsLength = slide.connections.length;
          slide.connections = slide.connections.filter(
            connection => 
              connection.fromElementId !== action.payload.elementId &&
              connection.toElementId !== action.payload.elementId
          );
          
          slide.updatedAt = new Date();
          state.currentPresentation.updatedAt = new Date();
          state.isModified = true;
        }
      }
    },
    
    moveElement: (state, action: PayloadAction<{
      slideId: string;
      elementId: string;
      position: Position;
    }>) => {
      if (!state.currentPresentation) return;
      
      const slide = state.currentPresentation.slides.find(s => s.id === action.payload.slideId);
      if (slide) {
        const element = slide.elements.find(e => e.id === action.payload.elementId);
        if (element) {
          element.position = action.payload.position;
          element.updatedAt = new Date();
          slide.updatedAt = new Date();
          state.currentPresentation.updatedAt = new Date();
          state.isModified = true;
        }
      }
    },
    
    resizeElement: (state, action: PayloadAction<{
      slideId: string;
      elementId: string;
      size: Size;
    }>) => {
      if (!state.currentPresentation) return;
      
      const slide = state.currentPresentation.slides.find(s => s.id === action.payload.slideId);
      if (slide) {
        const element = slide.elements.find(e => e.id === action.payload.elementId);
        if (element) {
          element.size = action.payload.size;
          element.updatedAt = new Date();
          slide.updatedAt = new Date();
          state.currentPresentation.updatedAt = new Date();
          state.isModified = true;
        }
      }
    },
    
    updateElementProperties: (state, action: PayloadAction<{
      slideId: string;
      elementId: string;
      properties: Partial<ElementProperties>;
    }>) => {
      if (!state.currentPresentation) return;
      
      const slide = state.currentPresentation.slides.find(s => s.id === action.payload.slideId);
      if (slide) {
        const element = slide.elements.find(e => e.id === action.payload.elementId);
        if (element) {
          element.properties = {
            ...element.properties,
            ...action.payload.properties,
          };
          element.updatedAt = new Date();
          slide.updatedAt = new Date();
          state.currentPresentation.updatedAt = new Date();
          state.isModified = true;
        }
      }
    },
    
    // Connection CRUD operations
    addConnection: (state, action: PayloadAction<{
      slideId: string;
      connection: Omit<ShapeConnection, 'id'>;
    }>) => {
      if (!state.currentPresentation) return;
      
      const slide = state.currentPresentation.slides.find(s => s.id === action.payload.slideId);
      if (slide) {
        const newConnection: ShapeConnection = {
          ...action.payload.connection,
          id: `connection-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        };
        
        slide.connections.push(newConnection);
        slide.updatedAt = new Date();
        state.currentPresentation.updatedAt = new Date();
        state.isModified = true;
      }
    },
    
    updateConnection: (state, action: PayloadAction<{
      slideId: string;
      connectionId: string;
      updates: Partial<ShapeConnection>;
    }>) => {
      if (!state.currentPresentation) return;
      
      const slide = state.currentPresentation.slides.find(s => s.id === action.payload.slideId);
      if (slide) {
        const connection = slide.connections.find(c => c.id === action.payload.connectionId);
        if (connection) {
          Object.assign(connection, action.payload.updates);
          slide.updatedAt = new Date();
          state.currentPresentation.updatedAt = new Date();
          state.isModified = true;
        }
      }
    },
    
    deleteConnection: (state, action: PayloadAction<{ slideId: string; connectionId: string }>) => {
      if (!state.currentPresentation) return;
      
      const slide = state.currentPresentation.slides.find(s => s.id === action.payload.slideId);
      if (slide) {
        const connectionIndex = slide.connections.findIndex(c => c.id === action.payload.connectionId);
        if (connectionIndex !== -1) {
          slide.connections.splice(connectionIndex, 1);
          slide.updatedAt = new Date();
          state.currentPresentation.updatedAt = new Date();
          state.isModified = true;
        }
      }
    },
    
    deleteConnectionsForElement: (state, action: PayloadAction<{ slideId: string; elementId: string }>) => {
      if (!state.currentPresentation) return;
      
      const slide = state.currentPresentation.slides.find(s => s.id === action.payload.slideId);
      if (slide) {
        const initialLength = slide.connections.length;
        slide.connections = slide.connections.filter(
          connection => 
            connection.fromElementId !== action.payload.elementId &&
            connection.toElementId !== action.payload.elementId
        );
        
        if (slide.connections.length !== initialLength) {
          slide.updatedAt = new Date();
          state.currentPresentation.updatedAt = new Date();
          state.isModified = true;
        }
      }
    },

    // Utility actions
    markAsSaved: (state) => {
      state.isModified = false;
      state.lastSaved = new Date();
    },
    
    markAsModified: (state) => {
      state.isModified = true;
    },
    
    duplicateSlide: (state, action: PayloadAction<string>) => {
      if (!state.currentPresentation) return;
      
      const slideIndex = state.currentPresentation.slides.findIndex(
        slide => slide.id === action.payload
      );
      
      if (slideIndex === -1) return;
      
      const originalSlide = state.currentPresentation.slides[slideIndex];
      const timestamp = Date.now();
      const duplicatedSlide: Slide = {
        ...originalSlide,
        id: `slide-${timestamp}-${Math.random().toString(36).substr(2, 9)}`,
        title: `${originalSlide.title} (Copy)`,
        elements: originalSlide.elements.map((element, index) => ({
          ...element,
          id: `element-${timestamp}-${index}-${Math.random().toString(36).substr(2, 9)}`,
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
        connections: originalSlide.connections.map((connection, index) => ({
          ...connection,
          id: `connection-${timestamp}-${index}-${Math.random().toString(36).substr(2, 9)}`,
          // Note: Connection element IDs would need to be updated to match new element IDs
          // This is a simplified implementation
        })),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      state.currentPresentation.slides.splice(slideIndex + 1, 0, duplicatedSlide);
      state.currentSlideId = duplicatedSlide.id;
      state.currentPresentation.updatedAt = new Date();
      state.isModified = true;
    },
  },
});

export const {
  // Presentation actions
  createPresentation,
  loadPresentation,
  updatePresentationMetadata,
  updatePresentationSettings,
  applyTheme,
  
  // Slide actions
  addSlide,
  deleteSlide,
  selectSlide,
  reorderSlides,
  updateSlide,
  updateSlideTitle,
  updateSlideNotes,
  duplicateSlide,
  
  // Element actions
  addElement,
  updateElement,
  deleteElement,
  moveElement,
  resizeElement,
  updateElementProperties,
  
  // Connection actions
  addConnection,
  updateConnection,
  deleteConnection,
  deleteConnectionsForElement,
  
  // Utility actions
  markAsSaved,
  markAsModified,
} = presentationSlice.actions;

export default presentationSlice.reducer;