import React, { useState, useRef, useCallback } from 'react';
import { validateImageFile, getImageInfo, convertImageForLatex, ImageInfo } from '../utils/imageUtils';
import './ImageImportDialog.css';

interface ImageImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (imageData: { dataUrl: string; info: ImageInfo; name: string }) => void;
}

interface ImportedImage {
  file: File;
  dataUrl: string;
  info: ImageInfo;
  preview: string;
}

const ImageImportDialog: React.FC<ImageImportDialogProps> = ({
  isOpen,
  onClose,
  onImport
}) => {
  const [selectedImages, setSelectedImages] = useState<ImportedImage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFiles = useCallback(async (files: FileList | File[]) => {
    setIsProcessing(true);
    setError(null);
    
    const fileArray = Array.from(files);
    const processedImages: ImportedImage[] = [];

    for (const file of fileArray) {
      try {
        // Validate file
        const validation = validateImageFile(file);
        if (!validation.isValid) {
          setError(validation.error || 'Invalid file');
          continue;
        }

        // Get image info
        const info = await getImageInfo(file);
        
        // Convert for LaTeX if needed
        const { dataUrl } = await convertImageForLatex(file);
        
        // Create preview (same as dataUrl for now)
        const preview = dataUrl;

        processedImages.push({
          file,
          dataUrl,
          info,
          preview
        });
      } catch (err) {
        console.error('Error processing image:', err);
        setError(`Failed to process ${file.name}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    setSelectedImages(prev => [...prev, ...processedImages]);
    setIsProcessing(false);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFiles(files);
    }
  }, [processFiles]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFiles(files);
    }
  }, [processFiles]);

  const handleRemoveImage = useCallback((index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleImportSelected = useCallback(() => {
    selectedImages.forEach(image => {
      onImport({
        dataUrl: image.dataUrl,
        info: image.info,
        name: image.file.name
      });
    });
    
    // Reset state and close dialog
    setSelectedImages([]);
    setError(null);
    onClose();
  }, [selectedImages, onImport, onClose]);

  const handleBrowseFiles = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!isOpen) return null;

  return (
    <div className="image-import-overlay">
      <div className="image-import-dialog">
        <div className="dialog-header">
          <h2>Import Images</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="dialog-content">
          {/* Drop Zone */}
          <div
            className={`drop-zone ${dragActive ? 'drag-active' : ''}`}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <div className="drop-zone-content">
              <div className="drop-icon">📁</div>
              <p>Drag and drop images here</p>
              <p className="drop-zone-subtitle">or</p>
              <button className="browse-button" onClick={handleBrowseFiles}>
                Browse Files
              </button>
            </div>
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />

          {/* Processing indicator */}
          {isProcessing && (
            <div className="processing-indicator">
              <div className="spinner"></div>
              <p>Processing images...</p>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              {error}
            </div>
          )}

          {/* Selected images preview */}
          {selectedImages.length > 0 && (
            <div className="selected-images">
              <h3>Selected Images ({selectedImages.length})</h3>
              <div className="images-grid">
                {selectedImages.map((image, index) => (
                  <div key={index} className="image-preview-card">
                    <div className="image-preview">
                      <img src={image.preview} alt={image.file.name} />
                      <button
                        className="remove-image-button"
                        onClick={() => handleRemoveImage(index)}
                        title="Remove image"
                      >
                        ×
                      </button>
                    </div>
                    <div className="image-info">
                      <div className="image-name" title={image.file.name}>
                        {image.file.name}
                      </div>
                      <div className="image-details">
                        {image.info.width} × {image.info.height}
                      </div>
                      <div className="image-size">
                        {formatFileSize(image.info.size)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="dialog-footer">
          <button className="cancel-button" onClick={onClose}>
            Cancel
          </button>
          <button
            className="import-button"
            onClick={handleImportSelected}
            disabled={selectedImages.length === 0 || isProcessing}
          >
            Import {selectedImages.length > 0 ? `(${selectedImages.length})` : ''}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageImportDialog;