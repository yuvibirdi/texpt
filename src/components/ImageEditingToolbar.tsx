import React, { useState, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { updateElement } from '../store/slices/presentationSlice';
import { ElementProperties } from '../types/presentation';
import { cropImage } from '../utils/imageUtils';
import './ImageEditingToolbar.css';

interface ImageEditingToolbarProps {
  slideId: string;
  elementId: string;
  currentProperties: ElementProperties;
  onPropertyChange: (properties: Partial<ElementProperties>) => void;
}

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

const ImageEditingToolbar: React.FC<ImageEditingToolbarProps> = ({
  slideId,
  elementId,
  currentProperties,
  onPropertyChange
}) => {
  const dispatch = useDispatch();
  const [showCropDialog, setShowCropDialog] = useState(false);
  const [cropArea, setCropArea] = useState<CropArea>({ x: 0, y: 0, width: 100, height: 100 });

  // Handle opacity change
  const handleOpacityChange = useCallback((opacity: number) => {
    const newProperties = { opacity: opacity / 100 };
    onPropertyChange(newProperties);
    
    dispatch(updateElement({
      slideId,
      elementId,
      updates: { properties: { ...currentProperties, ...newProperties } }
    }));
  }, [dispatch, slideId, elementId, currentProperties, onPropertyChange]);

  // Handle rotation change
  const handleRotationChange = useCallback((rotation: number) => {
    const newProperties = { rotation };
    onPropertyChange(newProperties);
    
    dispatch(updateElement({
      slideId,
      elementId,
      updates: { properties: { ...currentProperties, ...newProperties } }
    }));
  }, [dispatch, slideId, elementId, currentProperties, onPropertyChange]);

  // Handle crop functionality
  const handleCrop = useCallback(async () => {
    if (!currentProperties.src) return;

    try {
      const croppedDataUrl = await cropImage(currentProperties.src, cropArea);
      const newProperties = { src: croppedDataUrl };
      
      onPropertyChange(newProperties);
      dispatch(updateElement({
        slideId,
        elementId,
        updates: { 
          properties: { ...currentProperties, ...newProperties },
          content: croppedDataUrl
        }
      }));
      
      setShowCropDialog(false);
    } catch (error) {
      console.error('Error cropping image:', error);
    }
  }, [currentProperties, cropArea, onPropertyChange, dispatch, slideId, elementId]);

  // Reset image to original
  const handleReset = useCallback(() => {
    const resetProperties = { 
      opacity: 1, 
      rotation: 0,
      crop: undefined
    };
    
    onPropertyChange(resetProperties);
    dispatch(updateElement({
      slideId,
      elementId,
      updates: { properties: { ...currentProperties, ...resetProperties } }
    }));
  }, [dispatch, slideId, elementId, currentProperties, onPropertyChange]);

  // Flip image horizontally
  const handleFlipHorizontal = useCallback(() => {
    const currentFlipX = (currentProperties as any).flipX || false;
    const newProperties = { flipX: !currentFlipX };
    
    onPropertyChange(newProperties);
    dispatch(updateElement({
      slideId,
      elementId,
      updates: { properties: { ...currentProperties, ...newProperties } }
    }));
  }, [dispatch, slideId, elementId, currentProperties, onPropertyChange]);

  // Flip image vertically
  const handleFlipVertical = useCallback(() => {
    const currentFlipY = (currentProperties as any).flipY || false;
    const newProperties = { flipY: !currentFlipY };
    
    onPropertyChange(newProperties);
    dispatch(updateElement({
      slideId,
      elementId,
      updates: { properties: { ...currentProperties, ...newProperties } }
    }));
  }, [dispatch, slideId, elementId, currentProperties, onPropertyChange]);

  return (
    <div className="image-editing-toolbar">
      <div className="toolbar-section">
        <label className="toolbar-label">Opacity</label>
        <div className="opacity-control">
          <input
            type="range"
            min="0"
            max="100"
            value={Math.round((currentProperties.opacity || 1) * 100)}
            onChange={(e) => handleOpacityChange(parseInt(e.target.value))}
            className="opacity-slider"
          />
          <span className="opacity-value">
            {Math.round((currentProperties.opacity || 1) * 100)}%
          </span>
        </div>
      </div>

      <div className="toolbar-section">
        <label className="toolbar-label">Rotation</label>
        <div className="rotation-control">
          <input
            type="range"
            min="-180"
            max="180"
            value={currentProperties.rotation || 0}
            onChange={(e) => handleRotationChange(parseInt(e.target.value))}
            className="rotation-slider"
          />
          <span className="rotation-value">
            {currentProperties.rotation || 0}°
          </span>
        </div>
      </div>

      <div className="toolbar-section">
        <label className="toolbar-label">Transform</label>
        <div className="transform-buttons">
          <button
            onClick={handleFlipHorizontal}
            className="transform-button"
            title="Flip Horizontal"
          >
            ↔️
          </button>
          <button
            onClick={handleFlipVertical}
            className="transform-button"
            title="Flip Vertical"
          >
            ↕️
          </button>
          <button
            onClick={() => setShowCropDialog(true)}
            className="transform-button"
            title="Crop Image"
          >
            ✂️
          </button>
        </div>
      </div>

      <div className="toolbar-section">
        <button
          onClick={handleReset}
          className="reset-button"
          title="Reset to Original"
        >
          🔄 Reset
        </button>
      </div>

      {/* Simple Crop Dialog */}
      {showCropDialog && (
        <div className="crop-dialog-overlay">
          <div className="crop-dialog">
            <div className="crop-dialog-header">
              <h3>Crop Image</h3>
              <button 
                onClick={() => setShowCropDialog(false)}
                className="close-button"
              >
                ×
              </button>
            </div>
            
            <div className="crop-controls">
              <div className="crop-input-group">
                <label htmlFor="crop-x">X Position:</label>
                <input
                  id="crop-x"
                  type="number"
                  value={cropArea.x}
                  onChange={(e) => setCropArea(prev => ({ ...prev, x: parseInt(e.target.value) || 0 }))}
                  min="0"
                />
              </div>
              
              <div className="crop-input-group">
                <label htmlFor="crop-y">Y Position:</label>
                <input
                  id="crop-y"
                  type="number"
                  value={cropArea.y}
                  onChange={(e) => setCropArea(prev => ({ ...prev, y: parseInt(e.target.value) || 0 }))}
                  min="0"
                />
              </div>
              
              <div className="crop-input-group">
                <label htmlFor="crop-width">Width:</label>
                <input
                  id="crop-width"
                  type="number"
                  value={cropArea.width}
                  onChange={(e) => setCropArea(prev => ({ ...prev, width: parseInt(e.target.value) || 1 }))}
                  min="1"
                />
              </div>
              
              <div className="crop-input-group">
                <label htmlFor="crop-height">Height:</label>
                <input
                  id="crop-height"
                  type="number"
                  value={cropArea.height}
                  onChange={(e) => setCropArea(prev => ({ ...prev, height: parseInt(e.target.value) || 1 }))}
                  min="1"
                />
              </div>
            </div>
            
            <div className="crop-dialog-footer">
              <button 
                onClick={() => setShowCropDialog(false)}
                className="cancel-button"
              >
                Cancel
              </button>
              <button 
                onClick={handleCrop}
                className="apply-button"
              >
                Apply Crop
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageEditingToolbar;