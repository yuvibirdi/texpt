import React, { useState, useCallback, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { loadPresentation } from '../store/slices/presentationSlice';
import { addNotification } from '../store/slices/uiSlice';
import { 
  pptxImportService, 
  ImportProgress, 
  ImportOptions, 
  ImportResult 
} from '../services/pptxImportService';
import './PPTXImportDialog.css';

interface PPTXImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PPTXImportDialog: React.FC<PPTXImportDialogProps> = ({
  isOpen,
  onClose
}) => {
  const dispatch = useDispatch();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null);
  const [importOptions, setImportOptions] = useState<ImportOptions>({
    preserveFormatting: true,
    importImages: true,
    importShapes: true,
    importNotes: true,
    maxImageSize: 10,
    imageQuality: 'medium'
  });

  // Handle file selection
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  }, []);

  // Handle drag and drop
  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    const files = Array.from(event.dataTransfer.files);
    const pptxFile = files.find(file => 
      file.name.toLowerCase().endsWith('.pptx')
    );
    
    if (pptxFile) {
      setSelectedFile(pptxFile);
    }
  }, []);

  // Handle import options change
  const handleOptionChange = useCallback((
    option: keyof ImportOptions,
    value: boolean | number | string
  ) => {
    setImportOptions(prev => ({
      ...prev,
      [option]: value
    }));
  }, []);

  // Start import process
  const handleImport = useCallback(async () => {
    if (!selectedFile) {
      dispatch(addNotification({
        type: 'error',
        title: 'Import Error',
        message: 'Please select a PowerPoint file to import',
        duration: 3000
      }));
      return;
    }

    setIsImporting(true);
    setImportProgress(null);

    try {
      // Configure import service
      const importService = new (pptxImportService.constructor as any)(importOptions);
      importService.setProgressCallback((progress: ImportProgress) => {
        setImportProgress(progress);
      });

      // Start import
      const result: ImportResult = await importService.importPPTX(selectedFile);

      if (result.success && result.presentation) {
        // Load the imported presentation
        dispatch(loadPresentation(result.presentation));
        
        // Show success notification
        dispatch(addNotification({
          type: 'success',
          title: 'Import Successful',
          message: `Successfully imported ${result.importedSlides} slides from ${selectedFile.name}`,
          duration: 5000
        }));

        // Show warnings if any
        if (result.warnings.length > 0) {
          dispatch(addNotification({
            type: 'warning',
            title: 'Import Warnings',
            message: result.warnings.join(', '),
            duration: 7000
          }));
        }

        onClose();
      } else {
        // Show error notification
        dispatch(addNotification({
          type: 'error',
          title: 'Import Failed',
          message: result.errors.join(', ') || 'Unknown error occurred during import',
          duration: 7000
        }));
      }
    } catch (error) {
      dispatch(addNotification({
        type: 'error',
        title: 'Import Failed',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        duration: 7000
      }));
    } finally {
      setIsImporting(false);
      setImportProgress(null);
    }
  }, [selectedFile, importOptions, dispatch, onClose]);

  // Reset dialog state
  const handleClose = useCallback(() => {
    if (!isImporting) {
      setSelectedFile(null);
      setImportProgress(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      onClose();
    }
  }, [isImporting, onClose]);

  // Trigger file input
  const handleBrowseClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="pptx-import-dialog-overlay">
      <div className="pptx-import-dialog">
        <div className="pptx-import-dialog-header">
          <h2>Import PowerPoint Presentation</h2>
          <button 
            className="close-button"
            onClick={handleClose}
            disabled={isImporting}
          >
            ×
          </button>
        </div>

        <div className="pptx-import-dialog-content">
          {/* File Selection */}
          <div className="file-selection-section">
            <h3>Select PowerPoint File</h3>
            <div 
              className={`file-drop-zone ${selectedFile ? 'has-file' : ''}`}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              {selectedFile ? (
                <div className="selected-file">
                  <div className="file-icon">📄</div>
                  <div className="file-info">
                    <div className="file-name">{selectedFile.name}</div>
                    <div className="file-size">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                    </div>
                  </div>
                  <button 
                    className="remove-file-button"
                    onClick={() => setSelectedFile(null)}
                    disabled={isImporting}
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="drop-zone-content">
                  <div className="drop-zone-icon">📁</div>
                  <p>Drag and drop a PowerPoint file here</p>
                  <p>or</p>
                  <button 
                    className="browse-button"
                    onClick={handleBrowseClick}
                    disabled={isImporting}
                  >
                    Browse Files
                  </button>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pptx"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
          </div>

          {/* Import Options */}
          <div className="import-options-section">
            <h3>Import Options</h3>
            <div className="options-grid">
              <label className="option-item">
                <input
                  type="checkbox"
                  checked={importOptions.preserveFormatting}
                  onChange={(e) => handleOptionChange('preserveFormatting', e.target.checked)}
                  disabled={isImporting}
                />
                <span>Preserve formatting</span>
              </label>

              <label className="option-item">
                <input
                  type="checkbox"
                  checked={importOptions.importImages}
                  onChange={(e) => handleOptionChange('importImages', e.target.checked)}
                  disabled={isImporting}
                />
                <span>Import images</span>
              </label>

              <label className="option-item">
                <input
                  type="checkbox"
                  checked={importOptions.importShapes}
                  onChange={(e) => handleOptionChange('importShapes', e.target.checked)}
                  disabled={isImporting}
                />
                <span>Import shapes</span>
              </label>

              <label className="option-item">
                <input
                  type="checkbox"
                  checked={importOptions.importNotes}
                  onChange={(e) => handleOptionChange('importNotes', e.target.checked)}
                  disabled={isImporting}
                />
                <span>Import speaker notes</span>
              </label>
            </div>

            <div className="advanced-options">
              <div className="option-row">
                <label>Image Quality:</label>
                <select
                  value={importOptions.imageQuality}
                  onChange={(e) => handleOptionChange('imageQuality', e.target.value)}
                  disabled={isImporting}
                >
                  <option value="low">Low (faster import)</option>
                  <option value="medium">Medium (balanced)</option>
                  <option value="high">High (best quality)</option>
                </select>
              </div>

              <div className="option-row">
                <label>Max Image Size (MB):</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={importOptions.maxImageSize}
                  onChange={(e) => handleOptionChange('maxImageSize', parseInt(e.target.value))}
                  disabled={isImporting}
                />
              </div>
            </div>
          </div>

          {/* Progress Section */}
          {importProgress && (
            <div className="import-progress-section">
              <h3>Import Progress</h3>
              <div className="progress-info">
                <div className="progress-message">{importProgress.message}</div>
                <div className="progress-bar">
                  <div 
                    className="progress-fill"
                    style={{ width: `${importProgress.progress}%` }}
                  />
                </div>
                <div className="progress-percentage">
                  {Math.round(importProgress.progress)}%
                </div>
              </div>
              {importProgress.currentSlide && importProgress.totalSlides && (
                <div className="slide-progress">
                  Processing slide {importProgress.currentSlide} of {importProgress.totalSlides}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="pptx-import-dialog-footer">
          <button 
            className="cancel-button"
            onClick={handleClose}
            disabled={isImporting}
          >
            Cancel
          </button>
          <button 
            className="import-button"
            onClick={handleImport}
            disabled={!selectedFile || isImporting}
          >
            {isImporting ? 'Importing...' : 'Import Presentation'}
          </button>
        </div>
      </div>
    </div>
  );
};