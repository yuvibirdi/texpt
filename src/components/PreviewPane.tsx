import React, { useRef } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { usePreview } from '../hooks/usePreview';
import './PreviewPane.css';

interface PreviewPaneProps {
  className?: string;
}

const PreviewPane: React.FC<PreviewPaneProps> = ({ className = '' }) => {
  const presentation = useSelector((state: RootState) => state.presentation.currentPresentation);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  const {
    previewState,
    compilePresentation,
    cancelCompilation,
    downloadPdf,
    isLatexAvailable,
    checkLatexAvailability,
  } = usePreview({
    autoCompile: true,
    debounceMs: 500,
  });

  const handleRefresh = async () => {
    if (presentation) {
      try {
        await compilePresentation();
      } catch (error) {
        console.error('Manual compilation failed:', error);
      }
    }
  };

  const handleDownloadPdf = () => {
    if (presentation) {
      downloadPdf(`${presentation.title || 'presentation'}.pdf`);
    }
  };

  const handleCheckLatex = async () => {
    await checkLatexAvailability();
  };

  return (
    <div className={`preview-pane ${className}`}>
      <div className="preview-header">
        <h3>Preview</h3>
        <div className="preview-controls">
          <button 
            onClick={handleRefresh}
            disabled={previewState.isCompiling}
            className="refresh-btn"
            title="Refresh preview"
          >
            🔄
          </button>
          <button 
            onClick={handleDownloadPdf}
            disabled={!previewState.pdfUrl}
            className="download-btn"
            title="Download PDF"
          >
            📥
          </button>
        </div>
      </div>

      <div className="compilation-status">
        {previewState.isCompiling && (
          <div className="compilation-progress">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${previewState.progress}%` }}
              />
            </div>
            <div className="progress-text">
              {previewState.message} ({previewState.progress}%)
            </div>
          </div>
        )}
        
        {previewState.error && (
          <div className="compilation-error">
            <span className="error-icon">⚠️</span>
            <span className="error-message">{previewState.error}</span>
          </div>
        )}
        
        {!previewState.isCompiling && !previewState.error && previewState.lastCompiled && (
          <div className="compilation-success">
            <span className="success-icon">✅</span>
            <span className="success-message">
              Last compiled: {previewState.lastCompiled.toLocaleTimeString()}
            </span>
          </div>
        )}
        
        {!isLatexAvailable && !previewState.error && (
          <div className="compilation-error">
            <span className="error-icon">⚠️</span>
            <span className="error-message">LaTeX not found. Please install TeX Live or MiKTeX.</span>
            <button onClick={handleCheckLatex} className="retry-btn">
              Check Again
            </button>
          </div>
        )}
      </div>

      <div className="preview-content">
        {previewState.pdfUrl ? (
          <iframe
            ref={iframeRef}
            src={previewState.pdfUrl}
            className="pdf-viewer"
            title="PDF Preview"
          />
        ) : (
          <div className="preview-placeholder">
            {previewState.isCompiling ? (
              <div className="loading-spinner">
                <div className="spinner" />
                <p>Compiling presentation...</p>
              </div>
            ) : previewState.error || !isLatexAvailable ? (
              <div className="error-placeholder">
                <span className="error-icon-large">⚠️</span>
                <p>{!isLatexAvailable ? 'LaTeX not available' : 'Compilation failed'}</p>
                <button onClick={!isLatexAvailable ? handleCheckLatex : handleRefresh} className="retry-btn">
                  {!isLatexAvailable ? 'Check LaTeX' : 'Try Again'}
                </button>
              </div>
            ) : (
              <div className="empty-placeholder">
                <span className="preview-icon">📄</span>
                <p>Preview will appear here</p>
                <p className="placeholder-hint">Make changes to see live preview</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PreviewPane;