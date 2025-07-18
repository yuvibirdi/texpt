import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Theme, SlideTemplate } from '../../types/presentation';
import { templateService } from '../../services/templateService';

interface ThemeState {
  availableThemes: Theme[];
  availableSlideTemplates: SlideTemplate[];
  selectedThemeId: string | null;
  isThemeGalleryOpen: boolean;
  isTemplateGalleryOpen: boolean;
  themePreview: Theme | null;
}

const initialState: ThemeState = {
  availableThemes: templateService.getThemes(),
  availableSlideTemplates: templateService.getSlideTemplates(),
  selectedThemeId: null,
  isThemeGalleryOpen: false,
  isTemplateGalleryOpen: false,
  themePreview: null,
};

const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    // Theme gallery management
    openThemeGallery: (state) => {
      state.isThemeGalleryOpen = true;
    },

    closeThemeGallery: (state) => {
      state.isThemeGalleryOpen = false;
      state.themePreview = null;
    },

    // Template gallery management
    openTemplateGallery: (state) => {
      state.isTemplateGalleryOpen = true;
    },

    closeTemplateGallery: (state) => {
      state.isTemplateGalleryOpen = false;
    },

    // Theme preview
    setThemePreview: (state, action: PayloadAction<Theme | null>) => {
      state.themePreview = action.payload;
    },

    // Theme selection
    selectTheme: (state, action: PayloadAction<string>) => {
      state.selectedThemeId = action.payload;
    },

    // Custom theme management
    addCustomTheme: (state, action: PayloadAction<Theme>) => {
      const theme = {
        ...action.payload,
        isCustom: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      templateService.addTheme(theme);
      state.availableThemes = templateService.getThemes();
    },

    updateCustomTheme: (state, action: PayloadAction<{ id: string; updates: Partial<Theme> }>) => {
      const { id, updates } = action.payload;
      const success = templateService.updateTheme(id, updates);
      
      if (success) {
        state.availableThemes = templateService.getThemes();
      }
    },

    deleteCustomTheme: (state, action: PayloadAction<string>) => {
      const success = templateService.deleteTheme(action.payload);
      
      if (success) {
        state.availableThemes = templateService.getThemes();
        
        // Reset selection if deleted theme was selected
        if (state.selectedThemeId === action.payload) {
          state.selectedThemeId = null;
        }
      }
    },

    // Custom slide template management
    addCustomSlideTemplate: (state, action: PayloadAction<SlideTemplate>) => {
      const template = {
        ...action.payload,
        isCustom: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      templateService.addSlideTemplate(template);
      state.availableSlideTemplates = templateService.getSlideTemplates();
    },

    updateCustomSlideTemplate: (state, action: PayloadAction<{ id: string; updates: Partial<SlideTemplate> }>) => {
      const { id, updates } = action.payload;
      const success = templateService.updateSlideTemplate(id, updates);
      
      if (success) {
        state.availableSlideTemplates = templateService.getSlideTemplates();
      }
    },

    deleteCustomSlideTemplate: (state, action: PayloadAction<string>) => {
      const success = templateService.deleteSlideTemplate(action.payload);
      
      if (success) {
        state.availableSlideTemplates = templateService.getSlideTemplates();
      }
    },

    // Refresh templates from service
    refreshTemplates: (state) => {
      state.availableThemes = templateService.getThemes();
      state.availableSlideTemplates = templateService.getSlideTemplates();
    },
  },
});

export const {
  openThemeGallery,
  closeThemeGallery,
  openTemplateGallery,
  closeTemplateGallery,
  setThemePreview,
  selectTheme,
  addCustomTheme,
  updateCustomTheme,
  deleteCustomTheme,
  addCustomSlideTemplate,
  updateCustomSlideTemplate,
  deleteCustomSlideTemplate,
  refreshTemplates,
} = themeSlice.actions;

export default themeSlice.reducer;