import React, { useState } from 'react';
import './CompilationErrorDisplay.css';

export interface CompilationError {
  id: string;
  type: 'error' | 'warning' | 'info';
  message: string;
  line?: number;
  column?: number;
  file?: string;
  context?: string;
  suggestion?: string;
  elementId?: string; // For highlighting specific slide elements
  slideId?: string;
}

interface CompilationErrorDisplayProps {
  errors: CompilationError[];
  onErrorClick?: (error: CompilationError) => void;
  onDismiss?: (errorId: string) => void;
  onDismissAll?: () => void;
  className?: string;
}

const CompilationErrorDisplay: React.FC<CompilationErrorDisplayProps> = ({
  errors,
  onErrorClick,
  onDismiss,
  onDismissAll,
  className = '',
}) => {
  const [expandedErrors, setExpandedErrors] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<'all' | 'error' | 'warning' | 'info'>('all');

  const toggleExpanded = (errorId: string) => {
    const newExpanded = new Set(expandedErrors);
    if (newExpanded.has(errorId)) {
      newExpanded.delete(errorId);
    } else {
      newExpanded.add(errorId);
    }
    setExpandedErrors(newExpanded);
  };

  const filteredErrors = errors.filter(error => 
    filter === 'all' || error.type === filter
  );

  const errorCounts = {
    error: errors.filter(e => e.type === 'error').length,
    warning: errors.filter(e => e.type === 'warning').length,
    info: errors.filter(e => e.type === 'info').length,
  };

  const getErrorIcon = (type: CompilationError['type']) => {
    switch (type) {
      case 'error':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
        );
      case 'warning':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        );
      case 'info':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="16" x2="12" y2="12"/>
            <line x1="12" y1="8" x2="12.01" y2="8"/>
          </svg>
        );
    }
  };

  if (errors.length === 0) {
    return null;
  }

  return (
    <div className={`compilation-errors ${className}`}>
      <div className="compilation-errors__header">
        <div className="compilation-errors__title">
          <span>Compilation Issues</span>
          <div className="compilation-errors__counts">
            {errorCounts.error > 0 && (
              <span className="compilation-errors__count compilation-errors__count--error">
                {errorCounts.error} errors
              </span>
            )}
            {errorCounts.warning > 0 && (
              <span className="compilation-errors__count compilation-errors__count--warning">
                {errorCounts.warning} warnings
              </span>
            )}
            {errorCounts.info > 0 && (
              <span className="compilation-errors__count compilation-errors__count--info">
                {errorCounts.info} info
              </span>
            )}
          </div>
        </div>
        
        <div className="compilation-errors__actions">
          <div className="compilation-errors__filter">
            <select 
              value={filter} 
              onChange={(e) => setFilter(e.target.value as typeof filter)}
              className="compilation-errors__filter-select"
            >
              <option value="all">All Issues</option>
              <option value="error">Errors Only</option>
              <option value="warning">Warnings Only</option>
              <option value="info">Info Only</option>
            </select>
          </div>
          
          {onDismissAll && (
            <button 
              onClick={onDismissAll}
              className="compilation-errors__dismiss-all"
              title="Dismiss all errors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="compilation-errors__list">
        {filteredErrors.map((error) => (
          <div 
            key={error.id} 
            className={`compilation-errors__item compilation-errors__item--${error.type}`}
          >
            <div 
              className="compilation-errors__item-header"
              onClick={() => toggleExpanded(error.id)}
            >
              <div className="compilation-errors__item-icon">
                {getErrorIcon(error.type)}
              </div>
              
              <div className="compilation-errors__item-content">
                <div className="compilation-errors__item-message">
                  {error.message}
                </div>
                
                {(error.line || error.file) && (
                  <div className="compilation-errors__item-location">
                    {error.file && <span>File: {error.file}</span>}
                    {error.line && <span>Line: {error.line}</span>}
                    {error.column && <span>Column: {error.column}</span>}
                  </div>
                )}
              </div>
              
              <div className="compilation-errors__item-actions">
                {onErrorClick && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onErrorClick(error);
                    }}
                    className="compilation-errors__item-action"
                    title="Go to error location"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="m9 18 6-6-6-6"/>
                    </svg>
                  </button>
                )}
                
                {onDismiss && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDismiss(error.id);
                    }}
                    className="compilation-errors__item-action"
                    title="Dismiss this error"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18"/>
                      <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {expandedErrors.has(error.id) && (
              <div className="compilation-errors__item-details">
                {error.context && (
                  <div className="compilation-errors__item-context">
                    <strong>Context:</strong>
                    <pre>{error.context}</pre>
                  </div>
                )}
                
                {error.suggestion && (
                  <div className="compilation-errors__item-suggestion">
                    <strong>Suggestion:</strong>
                    <p>{error.suggestion}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default CompilationErrorDisplay;