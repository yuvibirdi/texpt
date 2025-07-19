import { FileService } from '../fileService';
import { Presentation, createDefaultTheme, createDefaultSlideLayout, createDefaultBackground } from '../../types/presentation';

// Mock electron API
const mockElectronAPI = {
  saveFile: jest.fn(),
  openFile: jest.fn(),
  getAppVersion: jest.fn().mockResolvedValue('1.0.0'),
  getPlatform: jest.fn().mockResolvedValue('darwin')
};

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

describe('FileService Integration Tests', () => {
  let fileService: FileService;
  let mockPresentation: Presentation;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    
    fileService = FileService.getInstance();
    
    mockPresentation = {
      id: 'integration-test-presentation',
      title: 'Integration Test Presentation',
      slides: [{
        id: 'slide-1',
        title: 'Test Slide',
        elements: [],
        connections: [],
        layout: createDefaultSlideLayout(),
        background: createDefaultBackground(),
        notes: 'Test notes',
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-01')
      }],
      theme: createDefaultTheme(),
      metadata: {
        author: 'Integration Test Author',
        title: 'Integration Test Presentation',
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

  describe('Complete Save/Load Workflow', () => {
    it('should save and load a presentation successfully', async () => {
      // Mock successful save
      mockElectronAPI.saveFile.mockResolvedValue({
        success: true,
        filePath: '/test/integration-presentation.lpe'
      });

      // Save the presentation
      const saveResult = await fileService.savePresentation(mockPresentation);
      
      expect(saveResult.success).toBe(true);
      expect(saveResult.filePath).toBe('/test/integration-presentation.lpe');
      
      // Verify the saved data structure
      const savedData = JSON.parse(mockElectronAPI.saveFile.mock.calls[0][0]);
      expect(savedData.version).toBe('1.0.0');
      expect(savedData.presentation).toEqual(mockPresentation);
      expect(savedData.metadata.appVersion).toBe('1.0.0');
      expect(savedData.metadata.platform).toBe('darwin');

      // Mock successful load with the saved data
      mockElectronAPI.openFile.mockResolvedValue({
        success: true,
        filePath: '/test/integration-presentation.lpe',
        content: JSON.stringify(savedData)
      });

      // Load the presentation
      const loadResult = await fileService.loadPresentation();
      
      expect(loadResult.success).toBe(true);
      expect(loadResult.presentation).toEqual(mockPresentation);
      expect(loadResult.filePath).toBe('/test/integration-presentation.lpe');
    });

    it('should handle recent files correctly during save/load cycle', async () => {
      // Mock successful save
      mockElectronAPI.saveFile.mockResolvedValue({
        success: true,
        filePath: '/test/recent-test.lpe'
      });

      // Save presentation
      await fileService.savePresentation(mockPresentation);
      
      // Check recent files
      let recentFiles = fileService.getRecentFiles();
      expect(recentFiles).toHaveLength(1);
      expect(recentFiles[0].filePath).toBe('/test/recent-test.lpe');
      expect(recentFiles[0].title).toBe('Integration Test Presentation');

      // Mock load of different file
      const savedData = {
        version: '1.0.0',
        presentation: { ...mockPresentation, title: 'Another Presentation' },
        metadata: {
          savedAt: new Date(),
          appVersion: '1.0.0',
          platform: 'darwin'
        }
      };

      mockElectronAPI.openFile.mockResolvedValue({
        success: true,
        filePath: '/test/another-presentation.lpe',
        content: JSON.stringify(savedData)
      });

      // Load another presentation
      await fileService.loadPresentation();
      
      // Check recent files now has both
      recentFiles = fileService.getRecentFiles();
      expect(recentFiles).toHaveLength(2);
      expect(recentFiles[0].title).toBe('Another Presentation'); // Most recent first
      expect(recentFiles[1].title).toBe('Integration Test Presentation');
    });
  });

  describe('Error Recovery Workflow', () => {
    it('should recover from corrupted presentation data', async () => {
      // Create corrupted presentation data
      const corruptedPresentation = {
        // Missing required fields
        title: 'Corrupted Presentation',
        slides: [{
          title: 'Corrupted Slide',
          elements: []
          // Missing other required fields
        }]
        // Missing theme, metadata, settings, etc.
      };

      mockElectronAPI.openFile.mockResolvedValue({
        success: true,
        filePath: '/test/corrupted.lpe',
        content: JSON.stringify(corruptedPresentation)
      });

      const loadResult = await fileService.loadPresentation();
      
      expect(loadResult.success).toBe(true);
      expect(loadResult.presentation).toBeDefined();
      
      // Verify recovered presentation has required fields
      const recovered = loadResult.presentation!;
      expect(recovered.id).toBeDefined();
      expect(recovered.title).toBe('Corrupted Presentation');
      expect(recovered.theme).toBeDefined();
      expect(recovered.metadata).toBeDefined();
      expect(recovered.settings).toBeDefined();
      expect(recovered.slides).toHaveLength(1);
      expect(recovered.slides[0].id).toBeDefined();
    });

    it('should handle file format validation errors', async () => {
      // Mock invalid JSON
      mockElectronAPI.openFile.mockResolvedValue({
        success: true,
        filePath: '/test/invalid.lpe',
        content: 'invalid json content'
      });

      const loadResult = await fileService.loadPresentation();
      
      expect(loadResult.success).toBe(false);
      expect(loadResult.error).toContain('Failed to parse file');
    });
  });

  describe('Auto-save Integration', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should perform auto-save when configured', async () => {
      // Configure auto-save
      fileService.configure({
        autoSaveEnabled: true,
        autoSaveInterval: 10 // 10 seconds for testing
      });

      // Set up file path and mark as modified
      fileService.setCurrentFilePath('/test/autosave-test.lpe');
      fileService.markAsModified();

      // Mock successful save
      mockElectronAPI.saveFile.mockResolvedValue({
        success: true,
        filePath: '/test/autosave-test.lpe'
      });

      // Start auto-save
      fileService.startAutoSave(() => mockPresentation);

      // Fast-forward time to trigger auto-save
      jest.advanceTimersByTime(10000);

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockElectronAPI.saveFile).toHaveBeenCalledWith(
        expect.stringContaining('"title":"Integration Test Presentation"')
      );
    });
  });

  describe('File State Management', () => {
    it('should track file state correctly throughout operations', async () => {
      // Initial state
      expect(fileService.getCurrentFilePath()).toBeNull();
      expect(fileService.getIsModified()).toBe(false);

      // Mark as modified
      fileService.markAsModified();
      expect(fileService.getIsModified()).toBe(true);

      // Save presentation
      mockElectronAPI.saveFile.mockResolvedValue({
        success: true,
        filePath: '/test/state-test.lpe'
      });

      await fileService.savePresentation(mockPresentation);
      
      // After save, should be marked as saved and path should be set
      expect(fileService.getCurrentFilePath()).toBe('/test/state-test.lpe');
      expect(fileService.getIsModified()).toBe(false);

      // Modify again
      fileService.markAsModified();
      expect(fileService.getIsModified()).toBe(true);

      // Load different presentation
      const savedData = {
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
        filePath: '/test/loaded-presentation.lpe',
        content: JSON.stringify(savedData)
      });

      await fileService.loadPresentation();
      
      // After load, should be marked as saved with new path
      expect(fileService.getCurrentFilePath()).toBe('/test/loaded-presentation.lpe');
      expect(fileService.getIsModified()).toBe(false);
    });
  });

  describe('Configuration Persistence', () => {
    it('should persist and load recent files from localStorage', async () => {
      // Mock existing recent files in localStorage
      const existingRecentFiles = [{
        id: 'existing-1',
        filePath: '/existing/file1.lpe',
        fileName: 'file1.lpe',
        lastOpened: new Date('2023-01-01').toISOString(),
        title: 'Existing File 1'
      }];

      localStorageMock.getItem.mockReturnValue(JSON.stringify(existingRecentFiles));

      // Create new file service instance to trigger loading
      const newFileService = FileService.getInstance();
      
      const recentFiles = newFileService.getRecentFiles();
      expect(recentFiles).toHaveLength(1);
      expect(recentFiles[0].title).toBe('Existing File 1');
      expect(recentFiles[0].lastOpened).toBeInstanceOf(Date);

      // Add new file
      mockElectronAPI.saveFile.mockResolvedValue({
        success: true,
        filePath: '/test/new-file.lpe'
      });

      await newFileService.savePresentation(mockPresentation);

      // Verify localStorage was updated
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'recentFiles',
        expect.stringContaining('/test/new-file.lpe')
      );
    });
  });
});