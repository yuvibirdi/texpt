import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { setActiveTool } from '../store/slices/uiSlice';
import './MainToolbar.css';

const MainToolbar: React.FC = () => {
  const dispatch = useDispatch();
  const { activeTool } = useSelector((state: RootState) => state.ui);

  const tools = [
    { 
      id: 'select' as const, 
      icon: '↖️', 
      label: 'Select', 
      description: 'Select and move elements',
      shortcut: 'V'
    },
    { 
      id: 'text' as const, 
      icon: '📝', 
      label: 'Text', 
      description: 'Add text elements',
      shortcut: 'T'
    },
    { 
      id: 'shape' as const, 
      icon: '▭', 
      label: 'Shape', 
      description: 'Draw shapes',
      shortcut: 'S'
    },
    { 
      id: 'image' as const, 
      icon: '🖼️', 
      label: 'Image', 
      description: 'Add images',
      shortcut: 'I'
    },
    { 
      id: 'draw' as const, 
      icon: '✏️', 
      label: 'Draw', 
      description: 'Free drawing',
      shortcut: 'D'
    },
  ];

  const handleToolSelect = (toolId: typeof activeTool) => {
    dispatch(setActiveTool(toolId));
  };

  return (
    <div className="main-toolbar">
      <div className="toolbar-title">Tools</div>
      <div className="tool-buttons">
        {tools.map((tool) => (
          <button
            key={tool.id}
            className={`tool-button ${activeTool === tool.id ? 'active' : ''}`}
            onClick={() => handleToolSelect(tool.id)}
            title={`${tool.description} (${tool.shortcut})`}
            aria-label={`${tool.label} tool`}
          >
            <span className="tool-icon">{tool.icon}</span>
            <span className="tool-label">{tool.label}</span>
          </button>
        ))}
      </div>
      
      <div className="toolbar-instructions">
        {activeTool === 'select' && (
          <div className="instruction">
            Click elements to select, drag to move
          </div>
        )}
        {activeTool === 'text' && (
          <div className="instruction">
            Click on canvas to add text
          </div>
        )}
        {activeTool === 'shape' && (
          <div className="instruction">
            Select shape type, then drag on canvas
          </div>
        )}
        {activeTool === 'image' && (
          <div className="instruction">
            Click to import image or drag & drop
          </div>
        )}
        {activeTool === 'draw' && (
          <div className="instruction">
            Draw freely on canvas
          </div>
        )}
      </div>
    </div>
  );
};

export default MainToolbar;