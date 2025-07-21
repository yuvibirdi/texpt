import React, { Component, ErrorInfo, ReactNode } from 'react';
import './ErrorBoundary.css';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorId: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });

    // Report error to crash reporting service if available
    this.reportError(error, errorInfo);
  }

  private reportError = (error: Error, errorInfo: ErrorInfo) => {
    // In a real application, you would send this to a crash reporting service
    const errorReport = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    // For now, just log to console
    console.error('Error Report:', errorReport);

    // If running in Electron, we could send this to the main process
    if (window.electronAPI) {
      window.electronAPI.reportError?.(errorReport);
    }
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
    });
  };

  private handleReportBug = () => {
    const { error, errorInfo, errorId } = this.state;
    
    const bugReport = {
      errorId,
      message: error?.message || 'Unknown error',
      stack: error?.stack || 'No stack trace available',
      componentStack: errorInfo?.componentStack || 'No component stack available',
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
    };

    // Create a mailto link with pre-filled bug report
    const subject = encodeURIComponent(`Bug Report: ${error?.message || 'Application Error'}`);
    const body = encodeURIComponent(`
Error ID: ${errorId}
Timestamp: ${bugReport.timestamp}
User Agent: ${bugReport.userAgent}

Error Message:
${bugReport.message}

Stack Trace:
${bugReport.stack}

Component Stack:
${bugReport.componentStack}

Please describe what you were doing when this error occurred:
[Your description here]
    `);

    window.open(`mailto:support@example.com?subject=${subject}&body=${body}`);
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error, errorId } = this.state;
      const isNetworkError = error?.message.includes('fetch') || error?.message.includes('network');
      const isMemoryError = error?.message.includes('memory') || error?.message.includes('heap');

      return (
        <div className="error-boundary">
          <div className="error-boundary__container">
            <div className="error-boundary__icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            
            <h1 className="error-boundary__title">
              Oops! Something went wrong
            </h1>
            
            <p className="error-boundary__message">
              {isNetworkError && (
                "It looks like there's a network connectivity issue. Please check your internet connection and try again."
              )}
              {isMemoryError && (
                "The application is running low on memory. Try closing other applications and reloading the page."
              )}
              {!isNetworkError && !isMemoryError && (
                "We encountered an unexpected error. Don't worry - your work is automatically saved and you can continue where you left off."
              )}
            </p>

            <div className="error-boundary__details">
              <details>
                <summary>Technical Details</summary>
                <div className="error-boundary__technical">
                  <p><strong>Error ID:</strong> {errorId}</p>
                  <p><strong>Error:</strong> {error?.message || 'Unknown error'}</p>
                  {error?.stack && (
                    <div>
                      <strong>Stack Trace:</strong>
                      <pre className="error-boundary__stack">{error.stack}</pre>
                    </div>
                  )}
                </div>
              </details>
            </div>

            <div className="error-boundary__actions">
              <button 
                className="error-boundary__button error-boundary__button--primary"
                onClick={this.handleReset}
              >
                Try Again
              </button>
              
              <button 
                className="error-boundary__button error-boundary__button--secondary"
                onClick={this.handleReload}
              >
                Reload Application
              </button>
              
              <button 
                className="error-boundary__button error-boundary__button--tertiary"
                onClick={this.handleReportBug}
              >
                Report Bug
              </button>
            </div>

            <div className="error-boundary__help">
              <p>
                If this problem persists, try:
              </p>
              <ul>
                <li>Refreshing the page</li>
                <li>Clearing your browser cache</li>
                <li>Restarting the application</li>
                <li>Checking for application updates</li>
              </ul>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;