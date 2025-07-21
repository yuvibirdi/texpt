import { useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { updateAccessibilitySettings } from '../store/slices/uiSlice';
import { accessibilityService, KeyboardShortcut } from '../services/accessibilityService';

/**
 * Custom hook for managing accessibility features
 */
export const useAccessibility = () => {
  const dispatch = useDispatch();
  const accessibilitySettings = useSelector((state: RootState) => state.ui.accessibility);

  // Sync Redux state with accessibility service
  useEffect(() => {
    accessibilityService.updateSettings(accessibilitySettings);
  }, [accessibilitySettings]);

  // Register a keyboard shortcut
  const registerShortcut = useCallback((context: string, shortcut: KeyboardShortcut) => {
    accessibilityService.registerShortcut(context, shortcut);
  }, []);

  // Unregister a keyboard shortcut
  const unregisterShortcut = useCallback((context: string, key: string) => {
    accessibilityService.unregisterShortcut(context, key);
  }, []);

  // Announce a message to screen readers
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    accessibilityService.announce(message, priority);
  }, []);

  // Update accessibility settings
  const updateSettings = useCallback((newSettings: Partial<typeof accessibilitySettings>) => {
    dispatch(updateAccessibilitySettings(newSettings));
  }, [dispatch]);

  // Get current accessibility settings
  const getSettings = useCallback(() => {
    return accessibilityService.getSettings();
  }, []);

  // Get all registered shortcuts
  const getShortcuts = useCallback((context?: string) => {
    return accessibilityService.getShortcuts(context);
  }, []);

  return {
    settings: accessibilitySettings,
    registerShortcut,
    unregisterShortcut,
    announce,
    updateSettings,
    getSettings,
    getShortcuts,
  };
};

/**
 * Hook for managing keyboard shortcuts in a specific context
 */
export const useKeyboardShortcuts = (context: string, shortcuts: KeyboardShortcut[]) => {
  const { registerShortcut, unregisterShortcut } = useAccessibility();

  useEffect(() => {
    // Register all shortcuts
    shortcuts.forEach(shortcut => {
      registerShortcut(context, shortcut);
    });

    // Cleanup: unregister shortcuts when component unmounts
    return () => {
      shortcuts.forEach(shortcut => {
        unregisterShortcut(context, shortcut.key);
      });
    };
  }, [context, shortcuts, registerShortcut, unregisterShortcut]);
};

/**
 * Hook for managing focus and screen reader announcements
 */
export const useScreenReader = () => {
  const { announce, settings } = useAccessibility();

  const announceIfEnabled = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (settings.announceChanges && settings.screenReaderSupport) {
      announce(message, priority);
    }
  }, [announce, settings.announceChanges, settings.screenReaderSupport]);

  const announceAction = useCallback((action: string, target?: string) => {
    const message = target ? `${action}: ${target}` : action;
    announceIfEnabled(message);
  }, [announceIfEnabled]);

  const announceNavigation = useCallback((from: string, to: string) => {
    announceIfEnabled(`Navigated from ${from} to ${to}`);
  }, [announceIfEnabled]);

  const announceSelection = useCallback((item: string, count?: number) => {
    const message = count !== undefined 
      ? `Selected ${item}, ${count} items selected`
      : `Selected ${item}`;
    announceIfEnabled(message);
  }, [announceIfEnabled]);

  const announceError = useCallback((error: string) => {
    announceIfEnabled(`Error: ${error}`, 'assertive');
  }, [announceIfEnabled]);

  const announceSuccess = useCallback((message: string) => {
    announceIfEnabled(`Success: ${message}`);
  }, [announceIfEnabled]);

  return {
    announce: announceIfEnabled,
    announceAction,
    announceNavigation,
    announceSelection,
    announceError,
    announceSuccess,
  };
};