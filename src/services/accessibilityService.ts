/**
 * Accessibility Service
 * Manages accessibility features including keyboard navigation modes,
 * screen reader support, and high contrast themes
 */

export type KeyboardMode = 'default' | 'vim' | 'emacs';

export interface AccessibilitySettings {
  keyboardMode: KeyboardMode;
  highContrastMode: boolean;
  screenReaderSupport: boolean;
  reducedMotion: boolean;
  focusIndicators: boolean;
  keyboardNavigation: boolean;
  announceChanges: boolean;
  fontSize: 'small' | 'medium' | 'large' | 'extra-large';
}

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  metaKey?: boolean;
  description: string;
  action: () => void;
  context?: string;
}

class AccessibilityService {
  private settings: AccessibilitySettings;
  private shortcuts: Map<string, KeyboardShortcut[]> = new Map();
  private announcer: HTMLElement | null = null;
  private focusHistory: HTMLElement[] = [];
  private currentFocusIndex = -1;

  constructor() {
    this.settings = this.loadSettings();
    this.initializeAnnouncer();
    this.setupEventListeners();
  }

  private loadSettings(): AccessibilitySettings {
    const saved = localStorage.getItem('accessibility-settings');
    const defaults: AccessibilitySettings = {
      keyboardMode: 'default',
      highContrastMode: false,
      screenReaderSupport: true,
      reducedMotion: false,
      focusIndicators: true,
      keyboardNavigation: true,
      announceChanges: true,
      fontSize: 'medium',
    };

    if (saved) {
      try {
        return { ...defaults, ...JSON.parse(saved) };
      } catch (error) {
        console.warn('Failed to parse accessibility settings:', error);
      }
    }

    return defaults;
  }

  private saveSettings(): void {
    localStorage.setItem('accessibility-settings', JSON.stringify(this.settings));
  }

  private initializeAnnouncer(): void {
    // Create screen reader announcer element
    this.announcer = document.createElement('div');
    this.announcer.setAttribute('aria-live', 'polite');
    this.announcer.setAttribute('aria-atomic', 'true');
    this.announcer.className = 'sr-only';
    this.announcer.style.cssText = `
      position: absolute !important;
      width: 1px !important;
      height: 1px !important;
      padding: 0 !important;
      margin: -1px !important;
      overflow: hidden !important;
      clip: rect(0, 0, 0, 0) !important;
      white-space: nowrap !important;
      border: 0 !important;
    `;
    document.body.appendChild(this.announcer);
  }

  private setupEventListeners(): void {
    // Listen for system preference changes
    if (window.matchMedia) {
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
      prefersReducedMotion.addEventListener('change', (e) => {
        this.updateSetting('reducedMotion', e.matches);
      });

      const prefersHighContrast = window.matchMedia('(prefers-contrast: high)');
      prefersHighContrast.addEventListener('change', (e) => {
        this.updateSetting('highContrastMode', e.matches);
      });
    }

    // Global keyboard event listener
    document.addEventListener('keydown', this.handleGlobalKeydown.bind(this));
    
    // Focus management
    document.addEventListener('focusin', this.handleFocusIn.bind(this));
  }

  private handleGlobalKeydown(event: KeyboardEvent): void {
    const shortcutKey = this.getShortcutKey(event);
    const context = this.getCurrentContext();
    
    // Check context-specific shortcuts first
    const contextShortcuts = this.shortcuts.get(context) || [];
    const globalShortcuts = this.shortcuts.get('global') || [];
    
    const allShortcuts = [...contextShortcuts, ...globalShortcuts];
    
    for (const shortcut of allShortcuts) {
      if (this.matchesShortcut(event, shortcut)) {
        event.preventDefault();
        event.stopPropagation();
        shortcut.action();
        this.announce(`Executed: ${shortcut.description}`);
        return;
      }
    }

    // Handle keyboard mode specific shortcuts
    if (this.settings.keyboardMode === 'vim') {
      this.handleVimShortcuts(event);
    } else if (this.settings.keyboardMode === 'emacs') {
      this.handleEmacsShortcuts(event);
    }
  }

  private handleFocusIn(event: FocusEvent): void {
    const target = event.target as HTMLElement;
    if (target && this.settings.keyboardNavigation) {
      // Add to focus history
      this.focusHistory.push(target);
      this.currentFocusIndex = this.focusHistory.length - 1;
      
      // Limit history size
      if (this.focusHistory.length > 50) {
        this.focusHistory = this.focusHistory.slice(-25);
        this.currentFocusIndex = this.focusHistory.length - 1;
      }

      // Announce focused element for screen readers
      if (this.settings.announceChanges) {
        const announcement = this.getFocusAnnouncement(target);
        if (announcement) {
          this.announce(announcement);
        }
      }
    }
  }

  private getShortcutKey(event: KeyboardEvent): string {
    const modifiers = [];
    if (event.ctrlKey) modifiers.push('Ctrl');
    if (event.altKey) modifiers.push('Alt');
    if (event.shiftKey) modifiers.push('Shift');
    if (event.metaKey) modifiers.push('Meta');
    
    return [...modifiers, event.key].join('+');
  }

  private getCurrentContext(): string {
    const activeElement = document.activeElement;
    if (!activeElement) return 'global';

    // Determine context based on active element or parent containers
    if (activeElement.closest('.slide-canvas')) return 'canvas';
    if (activeElement.closest('.slide-navigation')) return 'navigation';
    if (activeElement.closest('.preview-pane')) return 'preview';
    if (activeElement.closest('.text-formatting-toolbar')) return 'formatting';
    
    return 'global';
  }

  private matchesShortcut(event: KeyboardEvent, shortcut: KeyboardShortcut): boolean {
    return (
      event.key === shortcut.key &&
      !!event.ctrlKey === !!shortcut.ctrlKey &&
      !!event.altKey === !!shortcut.altKey &&
      !!event.shiftKey === !!shortcut.shiftKey &&
      !!event.metaKey === !!shortcut.metaKey
    );
  }

  private handleVimShortcuts(event: KeyboardEvent): void {
    // Vim-style navigation shortcuts
    const vimShortcuts: { [key: string]: () => void } = {
      'h': () => this.moveFocus('left'),
      'j': () => this.moveFocus('down'),
      'k': () => this.moveFocus('up'),
      'l': () => this.moveFocus('right'),
      'g': () => this.focusFirst(),
      'G': () => this.focusLast(),
      'i': () => this.enterInsertMode(),
      'Escape': () => this.exitInsertMode(),
      'o': () => this.createNewElement(),
      'dd': () => this.deleteCurrentElement(),
      'yy': () => this.copyCurrentElement(),
      'p': () => this.pasteElement(),
    };

    const key = event.shiftKey ? event.key.toUpperCase() : event.key.toLowerCase();
    if (vimShortcuts[key] && !event.ctrlKey && !event.altKey && !event.metaKey) {
      event.preventDefault();
      vimShortcuts[key]();
    }
  }

  private handleEmacsShortcuts(event: KeyboardEvent): void {
    // Emacs-style shortcuts
    if (event.ctrlKey) {
      const emacsShortcuts: { [key: string]: () => void } = {
        'f': () => this.moveFocus('right'),
        'b': () => this.moveFocus('left'),
        'n': () => this.moveFocus('down'),
        'p': () => this.moveFocus('up'),
        'a': () => this.focusFirst(),
        'e': () => this.focusLast(),
        'k': () => this.deleteCurrentElement(),
        'y': () => this.pasteElement(),
        'w': () => this.copyCurrentElement(),
        'g': () => this.cancelOperation(),
      };

      if (emacsShortcuts[event.key.toLowerCase()]) {
        event.preventDefault();
        emacsShortcuts[event.key.toLowerCase()]();
      }
    }
  }

  private getFocusAnnouncement(element: HTMLElement): string | null {
    const role = element.getAttribute('role');
    const label = element.getAttribute('aria-label') || 
                  element.getAttribute('title') || 
                  element.textContent?.trim();

    if (role) {
      return `${role}${label ? ': ' + label : ''}`;
    }

    const tagName = element.tagName.toLowerCase();
    switch (tagName) {
      case 'button':
        return `Button: ${label || 'unlabeled'}`;
      case 'input':
        const type = element.getAttribute('type') || 'text';
        return `${type} input: ${label || 'unlabeled'}`;
      case 'select':
        return `Select: ${label || 'unlabeled'}`;
      case 'textarea':
        return `Text area: ${label || 'unlabeled'}`;
      default:
        return label || null;
    }
  }

  // Public API methods
  public getSettings(): AccessibilitySettings {
    return { ...this.settings };
  }

  public updateSetting<K extends keyof AccessibilitySettings>(
    key: K, 
    value: AccessibilitySettings[K]
  ): void {
    this.settings[key] = value;
    this.saveSettings();
    this.applySettings();
  }

  public updateSettings(newSettings: Partial<AccessibilitySettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    this.saveSettings();
    this.applySettings();
  }

  private applySettings(): void {
    // Apply high contrast mode
    document.body.classList.toggle('high-contrast', this.settings.highContrastMode);
    
    // Apply reduced motion
    document.body.classList.toggle('reduced-motion', this.settings.reducedMotion);
    
    // Apply focus indicators
    document.body.classList.toggle('focus-indicators', this.settings.focusIndicators);
    
    // Apply font size
    document.body.classList.remove('font-small', 'font-medium', 'font-large', 'font-extra-large');
    document.body.classList.add(`font-${this.settings.fontSize}`);
  }

  public registerShortcut(context: string, shortcut: KeyboardShortcut): void {
    if (!this.shortcuts.has(context)) {
      this.shortcuts.set(context, []);
    }
    this.shortcuts.get(context)!.push(shortcut);
  }

  public unregisterShortcut(context: string, key: string): void {
    const shortcuts = this.shortcuts.get(context);
    if (shortcuts) {
      const index = shortcuts.findIndex(s => s.key === key);
      if (index !== -1) {
        shortcuts.splice(index, 1);
      }
    }
  }

  public announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    if (!this.announcer || !this.settings.announceChanges) return;

    this.announcer.setAttribute('aria-live', priority);
    this.announcer.textContent = message;
    
    // Clear after announcement
    setTimeout(() => {
      if (this.announcer) {
        this.announcer.textContent = '';
      }
    }, 1000);
  }

  public getShortcuts(context?: string): KeyboardShortcut[] {
    if (context) {
      return this.shortcuts.get(context) || [];
    }
    
    const allShortcuts: KeyboardShortcut[] = [];
    this.shortcuts.forEach(shortcuts => {
      allShortcuts.push(...shortcuts);
    });
    return allShortcuts;
  }

  // Navigation helper methods
  private moveFocus(direction: 'up' | 'down' | 'left' | 'right'): void {
    const focusableElements = this.getFocusableElements();
    const currentIndex = focusableElements.indexOf(document.activeElement as HTMLElement);
    
    if (currentIndex === -1) return;

    let nextIndex: number;
    switch (direction) {
      case 'up':
      case 'left':
        nextIndex = currentIndex > 0 ? currentIndex - 1 : focusableElements.length - 1;
        break;
      case 'down':
      case 'right':
        nextIndex = currentIndex < focusableElements.length - 1 ? currentIndex + 1 : 0;
        break;
    }

    focusableElements[nextIndex]?.focus();
  }

  private focusFirst(): void {
    const focusableElements = this.getFocusableElements();
    focusableElements[0]?.focus();
  }

  private focusLast(): void {
    const focusableElements = this.getFocusableElements();
    focusableElements[focusableElements.length - 1]?.focus();
  }

  private getFocusableElements(): HTMLElement[] {
    const selector = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]'
    ].join(', ');

    return Array.from(document.querySelectorAll(selector)) as HTMLElement[];
  }

  // Placeholder methods for editor-specific actions
  private enterInsertMode(): void {
    // Will be implemented by connecting to editor actions
    this.announce('Insert mode');
  }

  private exitInsertMode(): void {
    // Will be implemented by connecting to editor actions
    this.announce('Normal mode');
  }

  private createNewElement(): void {
    // Will be implemented by connecting to editor actions
    this.announce('Create new element');
  }

  private deleteCurrentElement(): void {
    // Will be implemented by connecting to editor actions
    this.announce('Delete element');
  }

  private copyCurrentElement(): void {
    // Will be implemented by connecting to editor actions
    this.announce('Copy element');
  }

  private pasteElement(): void {
    // Will be implemented by connecting to editor actions
    this.announce('Paste element');
  }

  private cancelOperation(): void {
    // Will be implemented by connecting to editor actions
    this.announce('Operation cancelled');
  }

  public destroy(): void {
    if (this.announcer) {
      document.body.removeChild(this.announcer);
      this.announcer = null;
    }
    
    document.removeEventListener('keydown', this.handleGlobalKeydown.bind(this));
    document.removeEventListener('focusin', this.handleFocusIn.bind(this));
  }
}

export const accessibilityService = new AccessibilityService();