import React from 'react';
import { useFileOperations } from '../hooks/useFileOperations';
import './RecentFiles.css';

interface RecentFilesProps {
  onFileSelected?: () => void;
  maxItems?: number;
}

const RecentFiles: React.FC<RecentFilesProps> = ({ 
  onFileSelected, 
  maxItems = 5 
}) => {
  const { 
    recentFiles, 
    openRecentFile, 
    removeFromRecentFiles, 
    clearRecentFiles 
  } = useFileOperations();

  const displayedFiles = recentFiles.slice(0, maxItems);

  const handleOpenFile = async (filePath: string) => {
    const success = await openRecentFile(filePath);
    if (success && onFileSelected) {
      onFileSelected();
    }
  };

  const handleRemoveFile = (filePath: string, event: React.MouseEvent) => {
    event.stopPropagation();
    removeFromRecentFiles(filePath);
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  if (displayedFiles.length === 0) {
    return (
      <div className="recent-files-empty">
        <p>No recent files</p>
      </div>
    );
  }

  return (
    <div className="recent-files">
      <div className="recent-files-header">
        <h3>Recent Files</h3>
        {recentFiles.length > 0 && (
          <button 
            className="clear-recent-btn"
            onClick={clearRecentFiles}
            title="Clear all recent files"
          >
            Clear All
          </button>
        )}
      </div>
      
      <div className="recent-files-list">
        {displayedFiles.map((file) => (
          <div
            key={file.id}
            className="recent-file-item"
            onClick={() => handleOpenFile(file.filePath)}
            title={file.filePath}
          >
            <div className="recent-file-info">
              <div className="recent-file-title">{file.title}</div>
              <div className="recent-file-details">
                <span className="recent-file-name">{file.fileName}</span>
                <span className="recent-file-date">{formatDate(file.lastOpened)}</span>
              </div>
            </div>
            
            <button
              className="remove-recent-btn"
              onClick={(e) => handleRemoveFile(file.filePath, e)}
              title="Remove from recent files"
            >
              ×
            </button>
          </div>
        ))}
      </div>
      
      {recentFiles.length > maxItems && (
        <div className="recent-files-more">
          <span>{recentFiles.length - maxItems} more files...</span>
        </div>
      )}
    </div>
  );
};

export default RecentFiles;