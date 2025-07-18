import React, { useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { setActiveShapeType, setActiveTool } from '../store/slices/uiSlice';
import { updateElement } from '../store/slices/presentationSlice';
import { ElementProperties, Color } from '../types/presentation';
import './ShapeToolbar.css';

interface ShapeToolbarProps {
  slideId: string;
  elementId: string | null;
  currentProperties: ElementProperties;
  onPropertyChange: (properties: Partial<ElementProperties>) => void;
}

const ShapeToolbar: React.FC<ShapeToolbarProps> = ({
  slideId,
  elementId,
  currentProperties,
  onPropertyChange,
}) => {
  const dispatch = useDispatch();
  const { activeTool, activeShapeType } = useSelector((state: RootState) => state.ui);
  const [showColorPicker, setShowColorPicker] = useState<'fill' | 'stroke' | null>(null);

  // Shape types with their icons and labels
  const shapeTypes = [
    { type: 'rectangle' as const, icon: '▭', label: 'Rectangle' },
    { type: 'circle' as const, icon: '○', label: 'Circle' },
    { type: 'line' as const, icon: '─', label: 'Line' },
    { type: 'arrow' as const, icon: '→', label: 'Arrow' },
  ];

  // Color presets for shapes
  const colorPresets = [
    { r: 0, g: 0, b: 0 }, // Black
    { r: 255, g: 255, b: 255 }, // White
    { r: 255, g: 0, b: 0 }, // Red
    { r: 0, g: 128, b: 0 }, // Green
    { r: 0, g: 0, b: 255 }, // Blue
    { r: 255, g: 255, b: 0 }, // Yellow
    { r: 255, g: 0, b: 255 }, // Magenta
    { r: 0, g: 255, b: 255 }, // Cyan
    { r: 128, g: 128, b: 128 }, // Gray
    { r: 255, g: 165, b: 0 }, // Orange
    { r: 128, g: 0, b: 128 }, // Purple
    { r: 165, g: 42, b: 42 }, // Brown
  ];

  // Stroke width options
  const strokeWidths = [1, 2, 3, 4, 5, 8, 10, 12, 16, 20];

  const handleShapeTypeSelect = (shapeType: typeof activeShapeType) => {
    dispatch(setActiveShapeType(shapeType));
  };

  const handlePropertyChange = useCallback((properties: Partial<ElementProperties>) => {
    onPropertyChange(properties);
    
    // Also update Redux store
    if (elementId) {
      dispatch(updateElement({
        slideId,
        elementId,
        updates: { properties }
      }));
    }
  }, [onPropertyChange, dispatch, slideId, elementId]);

  const handleFillColorChange = (color: Color) => {
    handlePropertyChange({ fillColor: color });
    setShowColorPicker(null);
  };

  const handleStrokeColorChange = (color: Color) => {
    handlePropertyChange({ strokeColor: color });
    setShowColorPicker(null);
  };

  const handleStrokeWidthChange = (strokeWidth: number) => {
    handlePropertyChange({ strokeWidth });
  };

  const handleOpacityChange = (opacity: number) => {
    handlePropertyChange({ opacity });
  };

  const colorToHex = (color: Color): string => {
    const toHex = (n: number) => n.toString(16).padStart(2, '0');
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

  return (
    <div className="shape-toolbar">
      {/* Shape Type Selection */}
      <div className="toolbar-group">
        <span className="toolbar-label">Shapes</span>
        <div className="shape-buttons">
          {shapeTypes.map(({ type, icon, label }) => (
            <button
              key={type}
              className={`shape-button ${activeShapeType === type ? 'active' : ''}`}
              onClick={() => handleShapeTypeSelect(type)}
              title={label}
            >
              {icon}
            </button>
          ))}
        </div>
      </div>

      {/* Shape Properties - only show when a shape element is selected */}
      {elementId && (
        <>
          {/* Fill Color */}
          <div className="toolbar-group">
            <span className="toolbar-label">Fill</span>
            <div style={{ position: 'relative' }}>
              <button
                className="color-button"
                style={{
                  backgroundColor: currentProperties.fillColor ? 
                    colorToHex(currentProperties.fillColor) : '#cccccc'
                }}
                onClick={() => setShowColorPicker(showColorPicker === 'fill' ? null : 'fill')}
                title="Fill Color"
              >
                ■
              </button>
              
              {showColorPicker === 'fill' && (
                <div className="color-picker-container">
                  <div className="color-picker">
                    <h4>Fill Color</h4>
                    <input
                      type="color"
                      className="color-input"
                      value={currentProperties.fillColor ? colorToHex(currentProperties.fillColor) : '#cccccc'}
                      onChange={(e) => handleFillColorChange(hexToColor(e.target.value))}
                    />
                    <div className="color-presets">
                      {colorPresets.map((color, index) => (
                        <button
                          key={index}
                          className="color-preset"
                          style={{ backgroundColor: colorToHex(color) }}
                          onClick={() => handleFillColorChange(color)}
                        />
                      ))}
                    </div>
                    <button
                      className="transparent-button"
                      onClick={() => handleFillColorChange({ r: 255, g: 255, b: 255, a: 0 })}
                    >
                      No Fill
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Stroke Color */}
          <div className="toolbar-group">
            <span className="toolbar-label">Stroke</span>
            <div style={{ position: 'relative' }}>
              <button
                className="color-button stroke-color"
                style={{
                  backgroundColor: currentProperties.strokeColor ? 
                    colorToHex(currentProperties.strokeColor) : '#000000'
                }}
                onClick={() => setShowColorPicker(showColorPicker === 'stroke' ? null : 'stroke')}
                title="Stroke Color"
              >
                ▢
              </button>
              
              {showColorPicker === 'stroke' && (
                <div className="color-picker-container">
                  <div className="color-picker">
                    <h4>Stroke Color</h4>
                    <input
                      type="color"
                      className="color-input"
                      value={currentProperties.strokeColor ? colorToHex(currentProperties.strokeColor) : '#000000'}
                      onChange={(e) => handleStrokeColorChange(hexToColor(e.target.value))}
                    />
                    <div className="color-presets">
                      {colorPresets.map((color, index) => (
                        <button
                          key={index}
                          className="color-preset"
                          style={{ backgroundColor: colorToHex(color) }}
                          onClick={() => handleStrokeColorChange(color)}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Stroke Width */}
          <div className="toolbar-group">
            <span className="toolbar-label">Width</span>
            <select
              className="stroke-width-select"
              value={currentProperties.strokeWidth || 1}
              onChange={(e) => handleStrokeWidthChange(parseInt(e.target.value))}
            >
              {strokeWidths.map(width => (
                <option key={width} value={width}>{width}px</option>
              ))}
            </select>
          </div>

          {/* Opacity Control */}
          <div className="toolbar-group">
            <span className="toolbar-label">Opacity</span>
            <input
              type="range"
              className="opacity-slider"
              min="0"
              max="100"
              value={(currentProperties.opacity || 1) * 100}
              onChange={(e) => handleOpacityChange(parseInt(e.target.value) / 100)}
              title={`Opacity: ${Math.round((currentProperties.opacity || 1) * 100)}%`}
            />
            <span className="opacity-value">
              {Math.round((currentProperties.opacity || 1) * 100)}%
            </span>
          </div>
        </>
      )}

      {/* Instructions */}
      <div className="toolbar-group">
        <div className="shape-instructions">
          {activeTool === 'shape' && activeShapeType ? (
            <span className="instruction-text">
              Click and drag on canvas to draw {activeShapeType}
            </span>
          ) : (
            <span className="instruction-text">
              Select a shape tool to start drawing
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShapeToolbar;