import React, { useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { updateElement } from '../store/slices/presentationSlice';
import { ElementProperties, Color } from '../types/presentation';
import MathInput from './MathInput';
import './TextFormattingToolbar.css';

interface TextFormattingToolbarProps {
  slideId: string;
  elementId: string | null;
  currentProperties: ElementProperties;
  onPropertyChange: (properties: Partial<ElementProperties>) => void;
}

const TextFormattingToolbar: React.FC<TextFormattingToolbarProps> = ({
  slideId,
  elementId,
  currentProperties,
  onPropertyChange,
}) => {
  const dispatch = useDispatch();
  const [showColorPicker, setShowColorPicker] = useState<'text' | 'background' | null>(null);
  const [showMathInput, setShowMathInput] = useState(false);
  const [showCustomBulletInput, setShowCustomBulletInput] = useState(false);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!elementId) return; // Only handle shortcuts when an element is selected
    
    // Ctrl/Cmd + M for math input
    if ((event.ctrlKey || event.metaKey) && event.key === 'm') {
      event.preventDefault();
      setShowMathInput(true);
    }
    
    // Ctrl/Cmd + B for bold
    if ((event.ctrlKey || event.metaKey) && event.key === 'b') {
      event.preventDefault();
      toggleBold();
    }
    
    // Ctrl/Cmd + I for italic
    if ((event.ctrlKey || event.metaKey) && event.key === 'i') {
      event.preventDefault();
      toggleItalic();
    }
    
    // Ctrl/Cmd + U for underline
    if ((event.ctrlKey || event.metaKey) && event.key === 'u') {
      event.preventDefault();
      toggleTextDecoration('underline');
    }
  }, [elementId]);

  // Add keyboard event listener
  React.useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // Get current slide data from Redux store
  const presentation = useSelector((state: RootState) => state.presentation.currentPresentation);
  const currentSlide = presentation?.slides.find(slide => slide.id === slideId);

  // Font families available in the editor
  const fontFamilies = [
    'Arial',
    'Times New Roman',
    'Helvetica',
    'Georgia',
    'Verdana',
    'Courier New',
    'JetBrains Mono',
    'Inter',
    'Roboto',
    'Open Sans',
  ];

  // Font sizes
  const fontSizes = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 60, 72];

  // Line heights
  const lineHeights = [1.0, 1.2, 1.4, 1.6, 1.8, 2.0, 2.5, 3.0];

  // Color presets
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

  const handleFontFamilyChange = (fontFamily: string) => {
    handlePropertyChange({ fontFamily });
  };

  const handleFontSizeChange = (fontSize: number) => {
    handlePropertyChange({ fontSize });
  };

  const handleLineHeightChange = (lineHeight: number) => {
    handlePropertyChange({ lineHeight } as any);
  };

  const toggleBold = () => {
    const newWeight = currentProperties.fontWeight === 'bold' ? 'normal' : 'bold';
    handlePropertyChange({ fontWeight: newWeight });
  };

  const toggleItalic = () => {
    const newStyle = currentProperties.fontStyle === 'italic' ? 'normal' : 'italic';
    handlePropertyChange({ fontStyle: newStyle });
  };

  const toggleTextDecoration = (decoration: string) => {
    const currentDecorations = (currentProperties as any).textDecorations || [];
    const newDecorations = currentDecorations.includes(decoration)
      ? currentDecorations.filter((d: string) => d !== decoration)
      : [...currentDecorations, decoration];
    
    handlePropertyChange({ textDecorations: newDecorations } as any);
  };

  const handleTextAlign = (align: 'left' | 'center' | 'right' | 'justify') => {
    handlePropertyChange({ textAlign: align });
  };

  const handleListType = (listType: 'none' | 'bullet' | 'numbered') => {
    const updates: Partial<ElementProperties> = { listType };
    
    // Set default list style based on type
    if (listType === 'bullet') {
      updates.listStyle = 'disc';
      updates.listIndentLevel = 0;
    } else if (listType === 'numbered') {
      updates.listStyle = 'decimal';
      updates.listIndentLevel = 0;
    } else {
      updates.listStyle = undefined;
      updates.listIndentLevel = undefined;
    }
    
    handlePropertyChange(updates);
  };

  const handleListStyleChange = (listStyle: string) => {
    if (listStyle === 'custom') {
      setShowCustomBulletInput(true);
    } else {
      handlePropertyChange({ listStyle } as any);
    }
  };

  const handleIndentChange = (delta: number) => {
    const currentLevel = (currentProperties as any).listIndentLevel || 0;
    const newLevel = Math.max(0, Math.min(5, currentLevel + delta));
    handlePropertyChange({ listIndentLevel: newLevel } as any);
  };

  const handleCustomBulletChange = (customBulletSymbol: string) => {
    handlePropertyChange({ customBulletSymbol } as any);
  };

  const handleColorChange = (color: Color, type: 'text' | 'background') => {
    if (type === 'text') {
      handlePropertyChange({ textColor: color });
    } else {
      handlePropertyChange({ backgroundColor: color });
    }
    setShowColorPicker(null);
  };

  const handleOpacityChange = (opacity: number) => {
    handlePropertyChange({ opacity });
  };

  const applyPreset = (preset: 'heading' | 'subheading' | 'body') => {
    const presets = {
      heading: {
        fontSize: 24,
        fontWeight: 'bold' as const,
        textColor: { r: 0, g: 0, b: 0 },
      },
      subheading: {
        fontSize: 18,
        fontWeight: 'bold' as const,
        textColor: { r: 64, g: 64, b: 64 },
      },
      body: {
        fontSize: 14,
        fontWeight: 'normal' as const,
        textColor: { r: 0, g: 0, b: 0 },
      },
    };
    
    handlePropertyChange(presets[preset]);
  };

  const handleMathInsert = (mathExpression: string) => {
    // Insert math expression into the current text element
    if (elementId) {
      // Create a math placeholder that will be rendered by KaTeX
      const mathPlaceholder = `$$${mathExpression}$$`;
      
      // Get current element to append math to existing content
      const currentElement = currentSlide?.elements.find(el => el.id === elementId);
      const currentContent = currentElement?.content || '';
      
      // Append math expression to existing content
      const newContent = currentContent + (currentContent ? ' ' : '') + mathPlaceholder;
      
      // Update the element with math content
      dispatch(updateElement({
        slideId,
        elementId,
        updates: { 
          content: newContent,
          properties: { 
            ...currentProperties, 
            hasMath: true,
            mathExpressions: [
              ...((currentProperties as any).mathExpressions || []),
              mathExpression
            ]
          }
        }
      }));
      
      // Also update local properties for immediate UI feedback
      handlePropertyChange({ 
        hasMath: true,
        mathExpressions: [
          ...((currentProperties as any).mathExpressions || []),
          mathExpression
        ]
      } as any);
    }
    setShowMathInput(false);
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

  if (!elementId) {
    return (
      <div className="text-formatting-toolbar disabled">
        <div className="toolbar-message">
          Select a text element to format
        </div>
        <div className="keyboard-shortcuts">
          <span className="shortcut-hint">Ctrl/Cmd + T to add text</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="text-formatting-toolbar">
        {/* Font Controls */}
        <div className="toolbar-group">
          <span className="toolbar-label">Font</span>
          <select
            className="font-family-select"
            value={currentProperties.fontFamily || 'Arial'}
            onChange={(e) => handleFontFamilyChange(e.target.value)}
          >
            {fontFamilies.map(font => (
              <option key={font} value={font}>{font}</option>
            ))}
          </select>
          
          <select
            className="font-size-select"
            value={currentProperties.fontSize || 16}
            onChange={(e) => handleFontSizeChange(parseInt(e.target.value))}
          >
            {fontSizes.map(size => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
        </div>

        {/* Style Controls */}
        <div className="toolbar-group">
          <span className="toolbar-label">Style</span>
          <button
            className={`toolbar-button ${currentProperties.fontWeight === 'bold' ? 'active' : ''}`}
            onClick={toggleBold}
            title="Bold (Ctrl+B)"
          >
            <strong>B</strong>
          </button>
          
          <button
            className={`toolbar-button ${currentProperties.fontStyle === 'italic' ? 'active' : ''}`}
            onClick={toggleItalic}
            title="Italic (Ctrl+I)"
          >
            <em>I</em>
          </button>
          
          <button
            className={`toolbar-button ${((currentProperties as any).textDecorations || []).includes('underline') ? 'active' : ''}`}
            onClick={() => toggleTextDecoration('underline')}
            title="Underline (Ctrl+U)"
          >
            <u>U</u>
          </button>
          
          <button
            className={`toolbar-button ${((currentProperties as any).textDecorations || []).includes('strikethrough') ? 'active' : ''}`}
            onClick={() => toggleTextDecoration('strikethrough')}
            title="Strikethrough"
          >
            <s>S</s>
          </button>
        </div>

        {/* Alignment Controls */}
        <div className="toolbar-group">
          <span className="toolbar-label">Align</span>
          <button
            className={`toolbar-button ${currentProperties.textAlign === 'left' ? 'active' : ''}`}
            onClick={() => handleTextAlign('left')}
            title="Left"
          >
            ⬅
          </button>
          
          <button
            className={`toolbar-button ${currentProperties.textAlign === 'center' ? 'active' : ''}`}
            onClick={() => handleTextAlign('center')}
            title="Center"
          >
            ↔
          </button>
          
          <button
            className={`toolbar-button ${currentProperties.textAlign === 'right' ? 'active' : ''}`}
            onClick={() => handleTextAlign('right')}
            title="Right"
          >
            ➡
          </button>
          
          <button
            className={`toolbar-button ${currentProperties.textAlign === 'justify' ? 'active' : ''}`}
            onClick={() => handleTextAlign('justify')}
            title="Justify"
          >
            ⬌
          </button>
        </div>

        {/* List Controls */}
        <div className="toolbar-group">
          <span className="toolbar-label">Lists</span>
          <button
            className={`toolbar-button ${(currentProperties as any).listType === 'bullet' ? 'active' : ''}`}
            onClick={() => handleListType('bullet')}
            title="Bullet List"
          >
            •
          </button>
          
          <button
            className={`toolbar-button ${(currentProperties as any).listType === 'numbered' ? 'active' : ''}`}
            onClick={() => handleListType('numbered')}
            title="Numbered List"
          >
            1.
          </button>
          
          <select
            className="list-style-select"
            value={(currentProperties as any).listStyle || 'disc'}
            onChange={(e) => handleListStyleChange(e.target.value)}
            disabled={!(currentProperties as any).listType || (currentProperties as any).listType === 'none'}
            title="List Style"
          >
            <optgroup label="Bullet Styles">
              <option value="disc">● Disc</option>
              <option value="circle">○ Circle</option>
              <option value="square">■ Square</option>
              <option value="custom">✦ Custom</option>
            </optgroup>
            <optgroup label="Number Styles">
              <option value="decimal">1. Numbers</option>
              <option value="lower-alpha">a. Lower Alpha</option>
              <option value="upper-alpha">A. Upper Alpha</option>
              <option value="lower-roman">i. Lower Roman</option>
              <option value="upper-roman">I. Upper Roman</option>
            </optgroup>
          </select>
          
          <button
            className="toolbar-button"
            onClick={() => handleIndentChange(-1)}
            disabled={!(currentProperties as any).listType || (currentProperties as any).listType === 'none' || ((currentProperties as any).listIndentLevel || 0) <= 0}
            title="Decrease Indent"
          >
            ⬅
          </button>
          
          <button
            className="toolbar-button"
            onClick={() => handleIndentChange(1)}
            disabled={!(currentProperties as any).listType || (currentProperties as any).listType === 'none' || ((currentProperties as any).listIndentLevel || 0) >= 5}
            title="Increase Indent"
          >
            ➡
          </button>
          
          {(currentProperties as any).listType && (currentProperties as any).listType !== 'none' && (
            <span className="list-indicator" title={`List Level: ${((currentProperties as any).listIndentLevel || 0) + 1}`}>
              L{((currentProperties as any).listIndentLevel || 0) + 1}
            </span>
          )}
        </div>

        {/* Math Controls */}
        <div className="toolbar-group">
          <span className="toolbar-label">Math</span>
          <button
            className={`toolbar-button ${(currentProperties as any).hasMath ? 'active' : ''}`}
            onClick={() => setShowMathInput(true)}
            title="Insert Math Expression (Ctrl+M)"
          >
            ∑
          </button>
          <button
            className="toolbar-button"
            onClick={() => handleMathInsert('\\frac{a}{b}')}
            title="Insert Fraction"
          >
            𝑎/𝑏
          </button>
          <button
            className="toolbar-button"
            onClick={() => handleMathInsert('\\sqrt{x}')}
            title="Insert Square Root"
          >
            √
          </button>
          <button
            className="toolbar-button"
            onClick={() => handleMathInsert('x^{n}')}
            title="Insert Superscript"
          >
            x^n
          </button>
          <button
            className="toolbar-button"
            onClick={() => handleMathInsert('\\sum_{i=1}^{n}')}
            title="Insert Summation"
          >
            Σ
          </button>
          <button
            className="toolbar-button"
            onClick={() => handleMathInsert('\\int_{a}^{b}')}
            title="Insert Integral"
          >
            ∫
          </button>
          {(currentProperties as any).hasMath && (
            <span className="math-indicator" title="This element contains math expressions">
              📐 {((currentProperties as any).mathExpressions || []).length}
            </span>
          )}
        </div>

        {/* Color Controls */}
        <div className="toolbar-group">
          <span className="toolbar-label">Color</span>
          <div style={{ position: 'relative' }}>
            <button
              className="color-button"
              style={{
                backgroundColor: currentProperties.textColor ? 
                  colorToHex(currentProperties.textColor) : '#000000'
              }}
              onClick={() => setShowColorPicker(showColorPicker === 'text' ? null : 'text')}
              title="Text Color"
            >
              A
            </button>
            
            {showColorPicker === 'text' && (
              <div className="color-picker-container">
                <div className="color-picker">
                  <h4>Text Color</h4>
                  <input
                    type="color"
                    className="color-input"
                    value={currentProperties.textColor ? colorToHex(currentProperties.textColor) : '#000000'}
                    onChange={(e) => handleColorChange(hexToColor(e.target.value), 'text')}
                  />
                  <div className="color-presets">
                    {colorPresets.map((color, index) => (
                      <button
                        key={index}
                        className="color-preset"
                        style={{ backgroundColor: colorToHex(color) }}
                        onClick={() => handleColorChange(color, 'text')}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div style={{ position: 'relative' }}>
            <button
              className="color-button background-color"
              style={{
                backgroundColor: currentProperties.backgroundColor ? 
                  colorToHex(currentProperties.backgroundColor) : 'transparent'
              }}
              onClick={() => setShowColorPicker(showColorPicker === 'background' ? null : 'background')}
              title="Background Color"
            >
              🎨
            </button>
            
            {showColorPicker === 'background' && (
              <div className="color-picker-container">
                <div className="color-picker">
                  <h4>Background Color</h4>
                  <input
                    type="color"
                    className="color-input"
                    value={currentProperties.backgroundColor ? colorToHex(currentProperties.backgroundColor) : '#ffffff'}
                    onChange={(e) => handleColorChange(hexToColor(e.target.value), 'background')}
                  />
                  <div className="color-presets">
                    {colorPresets.map((color, index) => (
                      <button
                        key={index}
                        className="color-preset"
                        style={{ backgroundColor: colorToHex(color) }}
                        onClick={() => handleColorChange(color, 'background')}
                      />
                    ))}
                  </div>
                  <button
                    className="transparent-button"
                    onClick={() => handleColorChange({ r: 255, g: 255, b: 255, a: 0 }, 'background')}
                  >
                    Transparent
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Line Height */}
        <div className="toolbar-group">
          <span className="toolbar-label">Line</span>
          <select
            className="line-height-select"
            value={(currentProperties as any).lineHeight || 1.2}
            onChange={(e) => handleLineHeightChange(parseFloat(e.target.value))}
          >
            {lineHeights.map(height => (
              <option key={height} value={height}>{height}</option>
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

        {/* Preset Styles */}
        <div className="toolbar-group">
          <span className="toolbar-label">Presets</span>
          <button
            className="preset-button"
            onClick={() => applyPreset('heading')}
            title="Heading Style"
          >
            H1
          </button>
          
          <button
            className="preset-button"
            onClick={() => applyPreset('subheading')}
            title="Subheading Style"
          >
            H2
          </button>
          
          <button
            className="preset-button"
            onClick={() => applyPreset('body')}
            title="Body Text Style"
          >
            T
          </button>
        </div>
      </div>

      {/* Math Input Modal */}
      {showMathInput && (
        <MathInput
          value=""
          onChange={handleMathInsert}
          onClose={() => setShowMathInput(false)}
          placeholder="Enter LaTeX math expression..."
        />
      )}

      {/* Custom Bullet Input Modal */}
      {showCustomBulletInput && (
        <div className="modal-overlay">
          <div className="custom-bullet-modal">
            <h3>Custom Bullet Symbol</h3>
            <p>Enter a custom symbol to use as bullet points:</p>
            <input
              type="text"
              className="custom-bullet-input"
              placeholder="e.g., ★, ►, ✓, →"
              maxLength={3}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const symbol = (e.target as HTMLInputElement).value.trim();
                  if (symbol) {
                    handlePropertyChange({ 
                      listStyle: 'custom',
                      customBulletSymbol: symbol 
                    } as any);
                  }
                  setShowCustomBulletInput(false);
                } else if (e.key === 'Escape') {
                  setShowCustomBulletInput(false);
                }
              }}
            />
            <div className="custom-bullet-presets">
              <span className="preset-label">Quick presets:</span>
              {['★', '►', '✓', '→', '◆', '▪', '‣', '⁃'].map(symbol => (
                <button
                  key={symbol}
                  className="bullet-preset-button"
                  onClick={() => {
                    handlePropertyChange({ 
                      listStyle: 'custom',
                      customBulletSymbol: symbol 
                    } as any);
                    setShowCustomBulletInput(false);
                  }}
                >
                  {symbol}
                </button>
              ))}
            </div>
            <div className="modal-buttons">
              <button
                className="modal-button cancel"
                onClick={() => setShowCustomBulletInput(false)}
              >
                Cancel
              </button>
              <button
                className="modal-button confirm"
                onClick={() => {
                  const input = document.querySelector('.custom-bullet-input') as HTMLInputElement;
                  const symbol = input?.value.trim();
                  if (symbol) {
                    handlePropertyChange({ 
                      listStyle: 'custom',
                      customBulletSymbol: symbol 
                    } as any);
                  }
                  setShowCustomBulletInput(false);
                }}
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TextFormattingToolbar;