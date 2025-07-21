import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import {
  setKeyboardMode,
  toggleHighContrastMode,
  toggleScreenReaderSupport,
  toggleReducedMotion,
  toggleFocusIndicators,
  toggleKeyboardNavigation,
  toggleAnnounceChanges,
  setFontSize,
} from '../store/slices/uiSlice';
import { accessibilityService, KeyboardMode } from '../services/accessibilityService';
import './AccessibilitySettings.css';

interface AccessibilitySettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

const AccessibilitySettings: React.FC<AccessibilitySettingsProps> = ({ isOpen, onClose }) => {
  const dispatch = useDispatch();
  const accessibility = useSelector((state: RootState) => state.ui.accessibility);

  if (!isOpen) return null;

  const handleKeyboardModeChange = (mode: KeyboardMode) => {
    dispatch(setKeyboardMode(mode));
    accessibilityService.updateSetting('keyboardMode', mode);
    accessibilityService.announce(`Keyboard mode changed to ${mode}`);
  };

  const handleToggle = (setting: keyof typeof accessibility, action: () => void) => {
    action();
    const newValue = !accessibility[setting];
    accessibilityService.updateSetting(setting, newValue);
    accessibilityService.announce(`${setting} ${newValue ? 'enabled' : 'disabled'}`);
  };

  const handleFontSizeChange = (size: typeof accessibility.fontSize) => {
    dispatch(setFontSize(size));
    accessibilityService.updateSetting('fontSize', size);
    accessibilityService.announce(`Font size changed to ${size}`);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div 
      className="accessibility-settings-overlay"
      role="dialog"
      aria-labelledby="accessibility-settings-title"
      aria-modal="true"
      onKeyDown={handleKeyDown}
    >
      <div className="accessibility-settings-dialog">
        <header className="accessibility-settings-header">
          <h2 id="accessibility-settings-title">Accessibility Settings</h2>
          <button
            className="close-button"
            onClick={onClose}
            aria-label="Close accessibility settings"
            type="button"
          >
            ×
          </button>
        </header>

        <div className="accessibility-settings-content">
          {/* Keyboard Navigation Mode */}
          <section className="settings-section">
            <h3>Keyboard Navigation Mode</h3>
            <p className="settings-description">
              Choose your preferred keyboard navigation style for editor operations.
            </p>
            <div className="radio-group" role="radiogroup" aria-labelledby="keyboard-mode-label">
              <span id="keyboard-mode-label" className="sr-only">Keyboard navigation mode</span>
              
              <label className="radio-option">
                <input
                  type="radio"
                  name="keyboardMode"
                  value="default"
                  checked={accessibility.keyboardMode === 'default'}
                  onChange={() => handleKeyboardModeChange('default')}
                  aria-describedby="default-mode-desc"
                />
                <span className="radio-label">Default</span>
                <span id="default-mode-desc" className="radio-description">
                  Standard keyboard shortcuts (Ctrl+C, Ctrl+V, etc.)
                </span>
              </label>

              <label className="radio-option">
                <input
                  type="radio"
                  name="keyboardMode"
                  value="vim"
                  checked={accessibility.keyboardMode === 'vim'}
                  onChange={() => handleKeyboardModeChange('vim')}
                  aria-describedby="vim-mode-desc"
                />
                <span className="radio-label">Vim</span>
                <span id="vim-mode-desc" className="radio-description">
                  Vim-style navigation (h/j/k/l, i for insert, ESC for normal mode)
                </span>
              </label>

              <label className="radio-option">
                <input
                  type="radio"
                  name="keyboardMode"
                  value="emacs"
                  checked={accessibility.keyboardMode === 'emacs'}
                  onChange={() => handleKeyboardModeChange('emacs')}
                  aria-describedby="emacs-mode-desc"
                />
                <span className="radio-label">Emacs</span>
                <span id="emacs-mode-desc" className="radio-description">
                  Emacs-style shortcuts (Ctrl+F/B/N/P for navigation, Ctrl+K for delete)
                </span>
              </label>
            </div>
          </section>

          {/* Visual Settings */}
          <section className="settings-section">
            <h3>Visual Settings</h3>
            
            <label className="checkbox-option">
              <input
                type="checkbox"
                checked={accessibility.highContrastMode}
                onChange={() => handleToggle('highContrastMode', () => dispatch(toggleHighContrastMode()))}
                aria-describedby="high-contrast-desc"
              />
              <span className="checkbox-label">High Contrast Mode</span>
              <span id="high-contrast-desc" className="checkbox-description">
                Increases contrast for better visibility
              </span>
            </label>

            <label className="checkbox-option">
              <input
                type="checkbox"
                checked={accessibility.focusIndicators}
                onChange={() => handleToggle('focusIndicators', () => dispatch(toggleFocusIndicators()))}
                aria-describedby="focus-indicators-desc"
              />
              <span className="checkbox-label">Enhanced Focus Indicators</span>
              <span id="focus-indicators-desc" className="checkbox-description">
                Shows clear visual indicators for focused elements
              </span>
            </label>

            <label className="checkbox-option">
              <input
                type="checkbox"
                checked={accessibility.reducedMotion}
                onChange={() => handleToggle('reducedMotion', () => dispatch(toggleReducedMotion()))}
                aria-describedby="reduced-motion-desc"
              />
              <span className="checkbox-label">Reduced Motion</span>
              <span id="reduced-motion-desc" className="checkbox-description">
                Minimizes animations and transitions
              </span>
            </label>

            <div className="font-size-setting">
              <label htmlFor="font-size-select">Font Size</label>
              <select
                id="font-size-select"
                value={accessibility.fontSize}
                onChange={(e) => handleFontSizeChange(e.target.value as typeof accessibility.fontSize)}
                aria-describedby="font-size-desc"
              >
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
                <option value="extra-large">Extra Large</option>
              </select>
              <span id="font-size-desc" className="setting-description">
                Adjusts the size of text throughout the application
              </span>
            </div>
          </section>

          {/* Screen Reader Settings */}
          <section className="settings-section">
            <h3>Screen Reader Support</h3>
            
            <label className="checkbox-option">
              <input
                type="checkbox"
                checked={accessibility.screenReaderSupport}
                onChange={() => handleToggle('screenReaderSupport', () => dispatch(toggleScreenReaderSupport()))}
                aria-describedby="screen-reader-desc"
              />
              <span className="checkbox-label">Enable Screen Reader Support</span>
              <span id="screen-reader-desc" className="checkbox-description">
                Provides additional ARIA labels and descriptions
              </span>
            </label>

            <label className="checkbox-option">
              <input
                type="checkbox"
                checked={accessibility.announceChanges}
                onChange={() => handleToggle('announceChanges', () => dispatch(toggleAnnounceChanges()))}
                aria-describedby="announce-changes-desc"
              />
              <span className="checkbox-label">Announce Changes</span>
              <span id="announce-changes-desc" className="checkbox-description">
                Announces important changes and actions to screen readers
              </span>
            </label>
          </section>

          {/* Navigation Settings */}
          <section className="settings-section">
            <h3>Navigation Settings</h3>
            
            <label className="checkbox-option">
              <input
                type="checkbox"
                checked={accessibility.keyboardNavigation}
                onChange={() => handleToggle('keyboardNavigation', () => dispatch(toggleKeyboardNavigation()))}
                aria-describedby="keyboard-nav-desc"
              />
              <span className="checkbox-label">Enhanced Keyboard Navigation</span>
              <span id="keyboard-nav-desc" className="checkbox-description">
                Enables advanced keyboard navigation features
              </span>
            </label>
          </section>

          {/* Keyboard Shortcuts Help */}
          <section className="settings-section">
            <h3>Keyboard Shortcuts</h3>
            <div className="shortcuts-help">
              <div className="shortcuts-column">
                <h4>Global Shortcuts</h4>
                <ul>
                  <li><kbd>Ctrl+N</kbd> - New presentation</li>
                  <li><kbd>Ctrl+O</kbd> - Open presentation</li>
                  <li><kbd>Ctrl+S</kbd> - Save presentation</li>
                  <li><kbd>Ctrl+Z</kbd> - Undo</li>
                  <li><kbd>Ctrl+Y</kbd> - Redo</li>
                  <li><kbd>Ctrl+T</kbd> - Add text element</li>
                </ul>
              </div>
              
              <div className="shortcuts-column">
                <h4>Canvas Shortcuts</h4>
                <ul>
                  <li><kbd>Delete</kbd> - Delete selected element</li>
                  <li><kbd>Enter</kbd> - Edit text element</li>
                  <li><kbd>Escape</kbd> - Exit text editing</li>
                  <li><kbd>Arrow Keys</kbd> - Move selected element</li>
                  <li><kbd>Shift+Arrow</kbd> - Move element by 10px</li>
                  <li><kbd>Alt+Drag</kbd> - Pan canvas</li>
                </ul>
              </div>

              {accessibility.keyboardMode === 'vim' && (
                <div className="shortcuts-column">
                  <h4>Vim Mode</h4>
                  <ul>
                    <li><kbd>h/j/k/l</kbd> - Navigate elements</li>
                    <li><kbd>i</kbd> - Insert/edit mode</li>
                    <li><kbd>Esc</kbd> - Normal mode</li>
                    <li><kbd>o</kbd> - Create new element</li>
                    <li><kbd>dd</kbd> - Delete element</li>
                    <li><kbd>yy</kbd> - Copy element</li>
                    <li><kbd>p</kbd> - Paste element</li>
                  </ul>
                </div>
              )}

              {accessibility.keyboardMode === 'emacs' && (
                <div className="shortcuts-column">
                  <h4>Emacs Mode</h4>
                  <ul>
                    <li><kbd>Ctrl+F/B</kbd> - Navigate left/right</li>
                    <li><kbd>Ctrl+N/P</kbd> - Navigate down/up</li>
                    <li><kbd>Ctrl+A/E</kbd> - First/last element</li>
                    <li><kbd>Ctrl+K</kbd> - Delete element</li>
                    <li><kbd>Ctrl+W</kbd> - Copy element</li>
                    <li><kbd>Ctrl+Y</kbd> - Paste element</li>
                    <li><kbd>Ctrl+G</kbd> - Cancel operation</li>
                  </ul>
                </div>
              )}
            </div>
          </section>
        </div>

        <footer className="accessibility-settings-footer">
          <button
            className="primary-button"
            onClick={onClose}
            type="button"
          >
            Done
          </button>
        </footer>
      </div>
    </div>
  );
};

export default AccessibilitySettings;