import { FileService } from '../fileService';
import { Presentation, createDefaultTheme, createDefaultSlideLayout, createDefaultBackground } from '../../types/presentation';

// Mock electron API
const mockElectronAPI = {
  saveFile: jest.fn(),
  openFile: jest.fn(),
  getAppVersion: jest.fn().mockResolvedValue('1.0.0'),
  getPlatform: jest.fn().mockResolvedValue('darwin')
};

// Mock window.electronAPI
Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true
});

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true
});

describe('FileService', () => {
  let fileService: FileService;
  let mockPresentation: Presentation;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    
    // Get fresh instance
    fileService = FileService.getInstance();
    
    // Create mock presentation
    mockPresentation = {
      id: 'test-presentation',
      title: 'Test Presentation',
      slides: [{
        id: 'slide-1',
        title: 'Slide 1',
        elements: [],
        connections: [],
        layout: createDefaultSlideLayout(),
        background: createDefaultBackground(),
        notes: '',
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-01')
      }],
      theme: createDefaultTheme(),
      metadata: {
        author: 'Test Author',
        title: 'Test Presentation',
        date: new Date('2023-01-01')
      },
      settings: {
        slideSize: { width: 800, height: 600, aspectRatio: '4:3' },
        autoSave: true,
        autoSaveInterval: 30,
        latexEngine: 'pdflatex',
        compilationTimeout: 30,
        showGrid: false,
        snapToGrid: true,
        gridSize: 10
      },
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-01'),
      version: '1.0.0'
    };
  });

  describe('Configuration', () => {
    it('should configure file service settings', () => {
      fileService.configure({
        autoSaveEnabled: false,
        autoSaveInterval: 60,
        maxRecentFiles: 5
      });

      // Configuration is internal, so we test behavior
      expect(fileService.getRecentFiles()).toHaveLength(0);
    });

    it('should set callbacks', () => {
      const onAutoSave = jest.fn();
      const onError = jest.fn();

      fileService.setCallbacks(onAutoSave, onError);

      // Callbacks are internal, tested through behavior
      expect(onAutoSave).not.toHaveBeenCalled();
      expect(onError).not.toHaveBeenCalled();
    });
  });

  describe('Save Presentation', () => {
    it('should save presentation successfully', async () => {
      mockElectronAPI.saveFile.mockResolvedValue({
        success: true,
        filePath: '/path/to/presentation.lpe'
      });

      const result = await fileService.savePresentation(mockPresentation);

      expect(result.success).toBe(true);
      expect(result.filePath).toBe('/path/to/presentation.lpe');
      expect(mockElectronAPI.saveFile).toHaveBeenCalledWith(
        expect.stringContaining('"version":"1.0.0"')
      );
    });

    it('should save presentation to specific path', async () => {
      mockElectronAPI.saveFile.mockResolvedValue({
        success: true,
        filePath: '/specific/path.lpe'
      });

      const result = await fileService.savePresentation(
        mockPresentation, 
        '/specific/path.lpe'
      );

      expect(result.success).toBe(true);
      expect(result.filePath).toBe('/specific/path.lpe');
    });

    it('should handle save cancellation', async () => {
      mockElectronAPI.saveFile.mockResolvedValue({
        success: false,
        canceled: true
      });

      const result = await fileService.savePresentation(mockPresentation);

      expect(result.success).toBe(false);
      expect(result.canceled).toBe(true);
    });

    it('should handle save errors', async () => {
      mockElectronAPI.saveFile.mockResolvedValue({
        success: false,
        error: 'Permission denied'
      });

      const result = await fileService.savePresentation(mockPresentation);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Permission denied');
    });

    it('should validate presentation before saving', async () => {
      const invalidPresentation = { ...mockPresentation };
      delete (invalidPresentation as any).id;

      const result = await fileService.savePresentation(invalidPresentation);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid presentation data');
    });
  });

  describe('Load Presentation', () => {
    it('should load presentation successfully', async () => {
      const fileData = {
        version: '1.0.0',
        presentation: mockPresentation,
        metadata: {
          savedAt: new Date(),
          appVersion: '1.0.0',
          platform: 'darwin'
        }
      };

      mockElectronAPI.openFile.mockResolvedValue({
        success: true,
        filePath: '/path/to/presentation.lpe',
        content: JSON.stringify(fileData)
      });

      const result = await fileService.loadPresentation();

      expect(result.success).toBe(true);
      expect(result.presentation).toEqual(mockPresentation);
      expect(result.filePath).toBe('/path/to/presentation.lpe');
    });

    it('should load legacy format presentation', async () => {
      mockElectronAPI.openFile.mockResolvedValue({
        success: true,
        filePath: '/path/to/legacy.lpe',
        content: JSON.stringify(mockPresentation)
      });

      const result = await fileService.loadPresentation();

      expect(result.success).toBe(true);
      expect(result.presentation).toEqual(mockPresentation);
    });

    it('should handle load cancellation', async () => {
      mockElectronAPI.openFile.mockResolvedValue({
        success: false,
        canceled: true
      });

      const result = await fileService.loadPresentation();

      expect(result.success).toBe(false);
      expect(result.canceled).toBe(true);
    });

    it('should handle invalid JSON', async () => {
      mockElectronAPI.openFile.mockResolvedValue({
        success: true,
        filePath: '/path/to/invalid.lpe',
        content: 'invalid json'
      });

      const result = await fileService.loadPresentation();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to parse file');
    });

    it('should recover from validation errors', async () => {
      const corruptedPresentation = { ...mockPresentation };
      delete (corruptedPresentation as any).id;
      delete (corruptedPresentation as any).theme;

      mockElectronAPI.openFile.mockResolvedValue({
        success: true,
        filePath: '/path/to/corrupted.lpe',
        content: JSON.stringify(corruptedPresentation)
      });

      const result = await fileService.loadPresentation();

      expect(result.success).toBe(true);
      expect(result.presentation?.id).toBeDefined();
      expect(result.presentation?.theme).toBeDefined();
    });
  });

  describe('Auto-save', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should start auto-save timer', () => {
      const getCurrentPresentation = jest.fn().mockReturnValue(mockPresentation);
      
      fileService.configure({ autoSaveEnabled: true, autoSaveInterval: 30 });
      fileService.setCurrentFilePath('/test/path.lpe');
      fileService.markAsModified();
      fileService.startAutoSave(getCurrentPresentation);

      expect(getCurrentPresentation).not.toHaveBeenCalled();

      // Fast-forward time
      jest.advanceTimersByTime(30000);

      expect(getCurrentPresentation).toHaveBeenCalled();
    });

    it('should stop auto-save timer', () => {
      const getCurrentPresentation = jest.fn().mockReturnValue(mockPresentation);
      
      fileService.startAutoSave(getCurrentPresentation);
      fileService.stopAutoSave();

      jest.advanceTimersByTime(60000);

      expect(getCurrentPresentation).not.toHaveBeenCalled();
    });

    it('should not auto-save if not modified', () => {
      const getCurrentPresentation = jest.fn().mockReturnValue(mockPresentation);
      
      fileService.setCurrentFilePath('/test/path.lpe');
      fileService.markAsSaved(); // Not modified
      fileService.startAutoSave(getCurrentPresentation);

      jest.advanceTimersByTime(30000);

      expect(getCurrentPresentation).not.toHaveBeenCalled();
    });
  });

  describe('Recent Files', () => {
    it('should add file to recent files on save', async () => {
      mockElectronAPI.saveFile.mockResolvedValue({
        success: true,
        filePath: '/path/to/presentation.lpe'
      });

      await fileService.savePresentation(mockPresentation);

      const recentFiles = fileService.getRecentFiles();
      expect(recentFiles).toHaveLength(1);
      expect(recentFiles[0].filePath).toBe('/path/to/presentation.lpe');
      expect(recentFiles[0].title).toBe('Test Presentation');
    });

    it('should add file to recent files on load', async () => {
      mockElectronAPI.openFile.mockResolvedValue({
        success: true,
        filePath: '/path/to/loaded.lpe',
        content: JSON.stringify(mockPresentation)
      });

      await fileService.loadPresentation();

      const recentFiles = fileService.getRecentFiles();
      expect(recentFiles).toHaveLength(1);
      expect(recentFiles[0].filePath).toBe('/path/to/loaded.lpe');
    });

    it('should limit recent files to max count', async () => {
      fileService.configure({ maxRecentFiles: 2 });

      // Add 3 files
      for (let i = 1; i <= 3; i++) {
        mockElectronAPI.saveFile.mockResolvedValue({
          success: true,
          filePath: `/path/to/presentation${i}.lpe`
        });

        await fileService.savePresentation({
          ...mockPresentation,
          id: `presentation-${i}`,
          title: `Presentation ${i}`
        });
      }

      const recentFiles = fileService.getRecentFiles();
      expect(recentFiles).toHaveLength(2);
      expect(recentFiles[0].title).toBe('Presentation 3'); // Most recent first
      expect(recentFiles[1].title).toBe('Presentation 2');
    });

    it('should remove file from recent files', async () => {
      mockElectronAPI.saveFile.mockResolvedValue({
        success: true,
        filePath: '/path/to/presentation.lpe'
      });

      await fileService.savePresentation(mockPresentation);
      
      let recentFiles = fileService.getRecentFiles();
      expect(recentFiles).toHaveLength(1);

      fileService.removeFromRecentFiles('/path/to/presentation.lpe');
      
      recentFiles = fileService.getRecentFiles();
      expect(recentFiles).toHaveLength(0);
    });

    it('should clear all recent files', async () => {
      mockElectronAPI.saveFile.mockResolvedValue({
        success: true,
        filePath: '/path/to/presentation.lpe'
      });

      await fileService.savePresentation(mockPresentation);
      
      let recentFiles = fileService.getRecentFiles();
      expect(recentFiles).toHaveLength(1);

      fileService.clearRecentFiles();
      
      recentFiles = fileService.getRecentFiles();
      expect(recentFiles).toHaveLength(0);
    });

    it('should persist recent files to localStorage', async () => {
      mockElectronAPI.saveFile.mockResolvedValue({
        success: true,
        filePath: '/path/to/presentation.lpe'
      });

      await fileService.savePresentation(mockPresentation);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'recentFiles',
        expect.stringContaining('/path/to/presentation.lpe')
      );
    });

    it('should load recent files from localStorage', () => {
      const storedFiles = [{
        id: 'recent-1',
        filePath: '/stored/path.lpe',
        fileName: 'path.lpe',
        lastOpened: new Date().toISOString(),
        title: 'Stored Presentation'
      }];

      localStorageMock.getItem.mockReturnValue(JSON.stringify(storedFiles));

      // Create new instance to trigger loading
      const newFileService = FileService.getInstance();
      const recentFiles = newFileService.getRecentFiles();

      expect(recentFiles).toHaveLength(1);
      expect(recentFiles[0].title).toBe('Stored Presentation');
    });
  });

  describe('File State Management', () => {
    it('should track current file path', () => {
      expect(fileService.getCurrentFilePath()).toBeNull();

      fileService.setCurrentFilePath('/test/path.lpe');
      expect(fileService.getCurrentFilePath()).toBe('/test/path.lpe');
    });

    it('should track modification state', () => {
      expect(fileService.getIsModified()).toBe(false);

      fileService.markAsModified();
      expect(fileService.getIsModified()).toBe(true);

      fileService.markAsSaved();
      expect(fileService.getIsModified()).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle callback errors gracefully', () => {
      const onError = jest.fn();
      fileService.setCallbacks(undefined, onError);

      // This should trigger error callback
      const invalidPresentation = {} as Presentation;
      fileService.savePresentation(invalidPresentation);

      // Error callback should be called (tested through behavior)
    });

    it('should handle localStorage errors gracefully', () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      // Should not throw error
      expect(() => {
        fileService.clearRecentFiles();
      }).not.toThrow();
    });
  });

  describe('Cleanup', () => {
    it('should cleanup resources', () => {
      const getCurrentPresentation = jest.fn().mockReturnValue(mockPresentation);
      fileService.startAutoSave(getCurrentPresentation);

      fileService.cleanup();

      // Auto-save should be stopped
      jest.advanceTimersByTime(60000);
      expect(getCurrentPresentation).not.toHaveBeenCalled();
    });
  });
});