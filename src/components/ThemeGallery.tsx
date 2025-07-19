import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import {
  closeThemeGallery,
  setThemePreview,
  selectTheme,
  addCustomTheme,
  deleteCustomTheme,
} from '../store/slices/themeSlice';
import { applyTheme } from '../store/slices/presentationSlice';
import { Theme, Color } from '../types/presentation';
import './ThemeGallery.css';

interface ThemeGalleryProps {
  onThemeSelect?: (theme: Theme) => void;
}

const ThemeGallery: React.FC<ThemeGalleryProps> = ({ onThemeSelect }) => {
  const dispatch = useDispatch();
  const {
    availableThemes,
    isThemeGalleryOpen,
    themePreview,
    selectedThemeId,
  } = useSelector((state: RootState) => state.theme);
  
  const currentPresentation = useSelector((state: RootState) => state.presentation.currentPresentation);
  const [showCustomThemeForm, setShowCustomThemeForm] = useState(false);
  const [customTheme, setCustomTheme] = useState<Partial<Theme>>({
    name: '',
    description: '',
    colors: {
      primary: { r: 59, g: 130, b: 246 },
      secondary: { r: 107, g: 114, b: 128 },
      accent: { r: 16, g: 185, b: 129 },
      background: { r: 255, g: 255, b: 255 },
      text: { r: 17, g: 24, b: 39 },
    },
    fonts: {
      heading: 'Inter',
      body: 'Inter',
      monospace: 'JetBrains Mono',
    },
  });

  if (!isThemeGalleryOpen) return null;

  const handleThemePreview = (theme: Theme) => {
    dispatch(setThemePreview(theme));
  };

  const handleThemeSelect = (theme: Theme) => {
    if (currentPresentation) {
      // Update the current presentation's theme
      dispatch(applyTheme(theme));
      dispatch(selectTheme(theme.id));
      
      if (onThemeSelect) {
        onThemeSelect(theme);
      }
    }
    dispatch(closeThemeGallery());
  };

  const handleClose = () => {
    dispatch(closeThemeGallery());
    setShowCustomThemeForm(false);
  };

  const handleCreateCustomTheme = () => {
    if (customTheme.name && customTheme.colors) {
      const newTheme: Theme = {
        id: `custom-${Date.now()}`,
        name: customTheme.name,
        description: customTheme.description || '',
        colors: customTheme.colors,
        fonts: customTheme.fonts || {
          heading: 'Inter',
          body: 'Inter',
          monospace: 'JetBrains Mono',
        },
        isCustom: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      dispatch(addCustomTheme(newTheme));
      setShowCustomThemeForm(false);
      setCustomTheme({
        name: '',
        description: '',
        colors: {
          primary: { r: 59, g: 130, b: 246 },
          secondary: { r: 107, g: 114, b: 128 },
          accent: { r: 16, g: 185, b: 129 },
          background: { r: 255, g: 255, b: 255 },
          text: { r: 17, g: 24, b: 39 },
        },
        fonts: {
          heading: 'Inter',
          body: 'Inter',
          monospace: 'JetBrains Mono',
        },
      });
    }
  };

  const handleDeleteCustomTheme = (themeId: string) => {
    if (window.confirm('Are you sure you want to delete this custom theme?')) {
      dispatch(deleteCustomTheme(themeId));
    }
  };

  const colorToHex = (color: Color): string => {
    const toHex = (n: number) => Math.round(n).toString(16).padStart(2, '0');
    return `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`;
  };

  const hexToColor = (hex: string): Color => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16),
    } : { r: 0, g: 0, b: 0 };
  };

  const updateCustomThemeColor = (colorKey: keyof Theme['colors'], hex: string) => {
    setCustomTheme(prev => ({
      ...prev,
      colors: {
        ...prev.colors!,
        [colorKey]: hexToColor(hex),
      },
    }));
  };

  return (
    <div className="theme-gallery-overlay">
      <div className="theme-gallery">
        <div className="theme-gallery-header">
          <h2>Theme Gallery</h2>
          <div className="theme-gallery-actions">
            <button
              className="btn btn-secondary"
              onClick={() => setShowCustomThemeForm(!showCustomThemeForm)}
            >
              Create Custom Theme
            </button>
            <button className="btn btn-close" onClick={handleClose}>
              ×
            </button>
          </div>
        </div>

        {showCustomThemeForm && (
          <div className="custom-theme-form">
            <h3>Create Custom Theme</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Theme Name</label>
                <input
                  type="text"
                  value={customTheme.name || ''}
                  onChange={(e) => setCustomTheme(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter theme name"
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <input
                  type="text"
                  value={customTheme.description || ''}
                  onChange={(e) => setCustomTheme(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter theme description"
                />
              </div>
            </div>

            <div className="color-picker-grid">
              <div className="color-picker-group">
                <label>Primary Color</label>
                <input
                  type="color"
                  value={colorToHex(customTheme.colors?.primary || { r: 59, g: 130, b: 246 })}
                  onChange={(e) => updateCustomThemeColor('primary', e.target.value)}
                />
              </div>
              <div className="color-picker-group">
                <label>Secondary Color</label>
                <input
                  type="color"
                  value={colorToHex(customTheme.colors?.secondary || { r: 107, g: 114, b: 128 })}
                  onChange={(e) => updateCustomThemeColor('secondary', e.target.value)}
                />
              </div>
              <div className="color-picker-group">
                <label>Accent Color</label>
                <input
                  type="color"
                  value={colorToHex(customTheme.colors?.accent || { r: 16, g: 185, b: 129 })}
                  onChange={(e) => updateCustomThemeColor('accent', e.target.value)}
                />
              </div>
              <div className="color-picker-group">
                <label>Background Color</label>
                <input
                  type="color"
                  value={colorToHex(customTheme.colors?.background || { r: 255, g: 255, b: 255 })}
                  onChange={(e) => updateCustomThemeColor('background', e.target.value)}
                />
              </div>
              <div className="color-picker-group">
                <label>Text Color</label>
                <input
                  type="color"
                  value={colorToHex(customTheme.colors?.text || { r: 17, g: 24, b: 39 })}
                  onChange={(e) => updateCustomThemeColor('text', e.target.value)}
                />
              </div>
            </div>

            <div className="form-actions">
              <button className="btn btn-primary" onClick={handleCreateCustomTheme}>
                Create Theme
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setShowCustomThemeForm(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="theme-grid">
          {availableThemes.map((theme) => (
            <div
              key={theme.id}
              className={`theme-card ${selectedThemeId === theme.id ? 'selected' : ''} ${
                themePreview?.id === theme.id ? 'previewing' : ''
              }`}
              onMouseEnter={() => handleThemePreview(theme)}
              onMouseLeave={() => dispatch(setThemePreview(null))}
            >
              <div className="theme-preview">
                <div
                  className="theme-preview-slide"
                  style={{
                    backgroundColor: colorToHex(theme.colors.background),
                    color: colorToHex(theme.colors.text),
                  }}
                >
                  <div
                    className="theme-preview-title"
                    style={{
                      backgroundColor: colorToHex(theme.colors.primary),
                      color: colorToHex(theme.colors.background),
                    }}
                  >
                    Title
                  </div>
                  <div className="theme-preview-content">
                    <div
                      className="theme-preview-accent"
                      style={{ backgroundColor: colorToHex(theme.colors.accent) }}
                    />
                    <div
                      className="theme-preview-secondary"
                      style={{ backgroundColor: colorToHex(theme.colors.secondary) }}
                    />
                  </div>
                </div>
              </div>

              <div className="theme-info">
                <h3>{theme.name}</h3>
                <p>{theme.description}</p>
                <div className="theme-colors">
                  {Object.entries(theme.colors).map(([key, color]) => (
                    <div
                      key={key}
                      className="color-swatch"
                      style={{ backgroundColor: colorToHex(color) }}
                      title={key}
                    />
                  ))}
                </div>
              </div>

              <div className="theme-actions">
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => handleThemeSelect(theme)}
                >
                  Apply Theme
                </button>
                {theme.isCustom && (
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleDeleteCustomTheme(theme.id)}
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {themePreview && (
          <div className="theme-preview-panel">
            <h3>Preview: {themePreview.name}</h3>
            <p>{themePreview.description}</p>
            <div className="preview-slide-large">
              <div
                className="preview-slide-content"
                style={{
                  backgroundColor: colorToHex(themePreview.colors.background),
                  color: colorToHex(themePreview.colors.text),
                }}
              >
                <h1 style={{ color: colorToHex(themePreview.colors.primary) }}>
                  Sample Title
                </h1>
                <p>This is how your content will look with this theme.</p>
                <div
                  className="sample-accent"
                  style={{
                    backgroundColor: colorToHex(themePreview.colors.accent),
                    color: colorToHex(themePreview.colors.background),
                  }}
                >
                  Accent Element
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ThemeGallery;