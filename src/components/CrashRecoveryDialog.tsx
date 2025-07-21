import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { loadPresentation } from '../store/slices/presentationSlice';
import { crashRecoveryService, BackupMetadata, RecoveryData } from '../services/crashRecoveryService';
import './CrashRecoveryDialog.css';

interface CrashRecoveryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onRecover: (recoveryData: RecoveryData) => void;
  onDismiss: () => void;
}

const CrashRecoveryDialog: React.FC<CrashRecoveryDialogProps> = ({
  isOpen,
  onClose,
  onRecover,
  onDismiss,
}) => {
  const dispatch = useDispatch();
  const [backups, setBackups] = useState<BackupMetadata[]>([]);
  const [selectedBackup, setSelectedBackup] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadBackups();
    }
  }, [isOpen]);

  const loadBackups = () => {
    try {
      const availableBackups = crashRecoveryService.getAvailableBackups();
      setBackups(availableBackups);
      
      // Auto-select the most recent backup
      if (availableBackups.length > 0) {
        setSelectedBackup(availableBackups[0].id);
      }
    } catch (err) {
      setError('Failed to load backup data');
      console.error('Failed to load backups:', err);
    }
  };

  const handleRecover = async () => {
    if (!selectedBackup) return;

    setIsLoading(true);
    setError(null);

    try {
      const recoveryData = crashRecoveryService.recoverFromBackup(selectedBackup);
      
      if (!recoveryData) {
        throw new Error('Failed to recover backup data');
      }

      // Load the recovered presentation
      dispatch(loadPresentation(recoveryData.presentation));
      
      // Notify parent component
      onRecover(recoveryData);
      
      // Close dialog
      onClose();
    } catch (err) {
      setError('Failed to recover presentation from backup');
      console.error('Recovery failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteBackup = (backupId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    
    if (window.confirm('Are you sure you want to delete this backup?')) {
      crashRecoveryService.deleteBackup(backupId);
      loadBackups();
      
      // Clear selection if deleted backup was selected
      if (selectedBackup === backupId) {
        setSelectedBackup(null);
      }
    }
  };

  const handleDismissAll = () => {
    if (window.confirm('Are you sure you want to dismiss all recovery data? This cannot be undone.')) {
      crashRecoveryService.clearAllBackups();
      onDismiss();
      onClose();
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
    
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  if (!isOpen) return null;

  return (
    <div className="crash-recovery-dialog-overlay">
      <div className="crash-recovery-dialog">
        <div className="crash-recovery-dialog__header">
          <div className="crash-recovery-dialog__icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 12l2 2 4-4"/>
              <path d="M21 12c.552 0 1-.448 1-1V5c0-.552-.448-1-1-1H3c-.552 0-1 .448-1 1v6c0 .552.448 1 1 1"/>
              <path d="M3 12v6c0 .552.448 1 1 1h16c.552 0 1-.448 1-1v-6"/>
            </svg>
          </div>
          <div>
            <h2 className="crash-recovery-dialog__title">
              Presentation Recovery
            </h2>
            <p className="crash-recovery-dialog__subtitle">
              We found backup data from your previous session. Would you like to recover your work?
            </p>
          </div>
        </div>

        {error && (
          <div className="crash-recovery-dialog__error">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
            {error}
          </div>
        )}

        <div className="crash-recovery-dialog__content">
          {backups.length === 0 ? (
            <div className="crash-recovery-dialog__no-backups">
              <p>No backup data found.</p>
            </div>
          ) : (
            <div className="crash-recovery-dialog__backups">
              <h3>Available Backups:</h3>
              <div className="crash-recovery-dialog__backup-list">
                {backups.map((backup) => (
                  <div
                    key={backup.id}
                    className={`crash-recovery-dialog__backup-item ${
                      selectedBackup === backup.id ? 'selected' : ''
                    }`}
                    onClick={() => setSelectedBackup(backup.id)}
                  >
                    <div className="crash-recovery-dialog__backup-info">
                      <div className="crash-recovery-dialog__backup-title">
                        {backup.presentationTitle}
                      </div>
                      <div className="crash-recovery-dialog__backup-details">
                        <span>{backup.slideCount} slides</span>
                        <span>•</span>
                        <span>{formatTimestamp(backup.timestamp)}</span>
                        <span>•</span>
                        <span className={`crash-recovery-dialog__backup-type ${backup.autoSave ? 'auto' : 'manual'}`}>
                          {backup.autoSave ? 'Auto-saved' : 'Manual save'}
                        </span>
                      </div>
                    </div>
                    <button
                      className="crash-recovery-dialog__backup-delete"
                      onClick={(e) => handleDeleteBackup(backup.id, e)}
                      title="Delete this backup"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3,6 5,6 21,6"/>
                        <path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"/>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="crash-recovery-dialog__actions">
          <button
            className="crash-recovery-dialog__button crash-recovery-dialog__button--secondary"
            onClick={onClose}
            disabled={isLoading}
          >
            Start Fresh
          </button>
          
          <button
            className="crash-recovery-dialog__button crash-recovery-dialog__button--tertiary"
            onClick={handleDismissAll}
            disabled={isLoading}
          >
            Dismiss All
          </button>
          
          <button
            className="crash-recovery-dialog__button crash-recovery-dialog__button--primary"
            onClick={handleRecover}
            disabled={!selectedBackup || isLoading}
          >
            {isLoading ? 'Recovering...' : 'Recover Presentation'}
          </button>
        </div>

        <div className="crash-recovery-dialog__help">
          <p>
            <strong>Tip:</strong> Auto-backups are created every 30 seconds while you work. 
            Manual saves are created when you explicitly save your presentation.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CrashRecoveryDialog;