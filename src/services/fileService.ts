import { Presentation } from '../types/presentation';

export interface FileOperationResult {
  success: boolean;
  filePath?: string;
  error?: string;
  canceled?: boolean;
}

export interface RecentFile {
  id: string;
  filePath: string;
  fileName: string;
  lastOpened: Date;
  title: string;
  thumbnail?: string; // Base64 encoded thumbnail
}

export interface FileServiceConfig {
  autoSaveEnabled: boolean;
  autoSaveInterval: number; // in seconds
  maxRecentFiles: number;
  fileExtension: string;
}

export interface PresentationFileData {
  version: string;
  presentation: Presentation;
  metadata: {
    savedAt: Date;
    appVersion: string;
    platform: string;
  };
}

export class FileService {
  private static instance: FileService;
  private config: FileServiceConfig;
  private recentFiles: RecentFile[] = [];
  private autoSaveTimer: NodeJS.Timeout | null = null;
  private currentFilePath: string | null = null;
  private isModified: boolean = false;
  private onAutoSaveCallback?: (presentation: Presentation) => void;
  private onErrorCallback?: (error: string) => void;

  private constructor() {
    this.config = {
      autoSaveEnabled: true,
      autoSaveInterval: 30,
      maxRecentFiles: 10,
      fileExtension: 'lpe'
    };
    this.loadRecentFiles();
  }

  public static getInstance(): FileService {
    if (!FileService.instance) {
      FileService.instance = new FileService();
    }
    return FileService.instance;
  }

  /**
   * Configure the file service
   */
  public configure(config: Partial<FileServiceConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Restart auto-save timer if interval changed
    if (config.autoSaveInterval !== undefined && this.autoSaveTimer) {
      this.stopAutoSave();
      if (this.config.autoSaveEnabled && this.onAutoSaveCallback) {
        this.startAutoSave(this.onAutoSaveCallback);
      }
    }
  }

  /**
   * Set callbacks for auto-save and error handling
   */
  public setCallbacks(
    onAutoSave?: (presentation: Presentation) => void,
    onError?: (error: string) => void
  ): void {
    this.onAutoSaveCallback = onAutoSave;
    this.onErrorCallback = onError;
  }

  /**
   * Save presentation to file
   */
  public async savePresentation(
    presentation: Presentation,
    filePath?: string
  ): Promise<FileOperationResult> {
    try {
      // Validate presentation data
      const validationResult = this.validatePresentation(presentation);
      if (!validationResult.isValid) {
        return {
          success: false,
          error: `Invalid presentation data: ${validationResult.errors.join(', ')}`
        };
      }

      // Prepare file data
      const fileData: PresentationFileData = {
        version: '1.0.0',
        presentation,
        metadata: {
          savedAt: new Date(),
          appVersion: await this.getAppVersion(),
          platform: await this.getPlatform()
        }
      };

      const jsonData = JSON.stringify(fileData, null, 2);

      // Use provided path or show save dialog
      let result: FileOperationResult;
      if (filePath) {
        result = await this.writeFile(filePath, jsonData);
      } else {
        result = await window.electronAPI.saveFile(jsonData);
      }

      if (result.success && result.filePath) {
        this.currentFilePath = result.filePath;
        this.isModified = false;
        await this.addToRecentFiles(result.filePath, presentation);
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.handleError(`Failed to save presentation: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Load presentation from file
   */
  public async loadPresentation(filePath?: string): Promise<{
    success: boolean;
    presentation?: Presentation;
    filePath?: string;
    error?: string;
    canceled?: boolean;
  }> {
    try {
      // Use provided path or show open dialog
      let fileResult: any;
      if (filePath) {
        fileResult = await this.readFile(filePath);
      } else {
        fileResult = await window.electronAPI.openFile();
      }

      if (!fileResult.success) {
        return {
          success: false,
          error: fileResult.error,
          canceled: fileResult.canceled
        };
      }

      // Parse and validate file content
      const parseResult = this.parseFileContent(fileResult.content);
      if (!parseResult.success) {
        return {
          success: false,
          error: parseResult.error
        };
      }

      const presentation = parseResult.presentation!;
      
      // Validate presentation data
      const validationResult = this.validatePresentation(presentation);
      if (!validationResult.isValid) {
        // Try to recover from validation errors
        const recoveredPresentation = this.recoverPresentation(presentation, validationResult.errors);
        if (recoveredPresentation) {
          this.handleError(`Presentation loaded with warnings: ${validationResult.errors.join(', ')}`);
          await this.addToRecentFiles(fileResult.filePath, recoveredPresentation);
          this.currentFilePath = fileResult.filePath;
          this.isModified = false;
          
          return {
            success: true,
            presentation: recoveredPresentation,
            filePath: fileResult.filePath
          };
        } else {
          return {
            success: false,
            error: `Invalid presentation file: ${validationResult.errors.join(', ')}`
          };
        }
      }

      // Successfully loaded
      await this.addToRecentFiles(fileResult.filePath, presentation);
      this.currentFilePath = fileResult.filePath;
      this.isModified = false;

      return {
        success: true,
        presentation,
        filePath: fileResult.filePath
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.handleError(`Failed to load presentation: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Auto-save current presentation
   */
  public async autoSave(presentation: Presentation): Promise<boolean> {
    if (!this.currentFilePath || !this.isModified) {
      return false;
    }

    try {
      const result = await this.savePresentation(presentation, this.currentFilePath);
      return result.success;
    } catch (error) {
      this.handleError(`Auto-save failed: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  /**
   * Start auto-save timer
   */
  public startAutoSave(getCurrentPresentation: () => Presentation): void {
    if (!this.config.autoSaveEnabled) return;

    this.onAutoSaveCallback = getCurrentPresentation;
    this.autoSaveTimer = setInterval(async () => {
      if (this.isModified && this.currentFilePath && this.onAutoSaveCallback) {
        const presentation = this.onAutoSaveCallback();
        await this.autoSave(presentation);
      }
    }, this.config.autoSaveInterval * 1000);
  }

  /**
   * Stop auto-save timer
   */
  public stopAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
  }

  /**
   * Mark presentation as modified
   */
  public markAsModified(): void {
    this.isModified = true;
  }

  /**
   * Mark presentation as saved
   */
  public markAsSaved(): void {
    this.isModified = false;
  }

  /**
   * Get current file path
   */
  public getCurrentFilePath(): string | null {
    return this.currentFilePath;
  }

  /**
   * Set current file path
   */
  public setCurrentFilePath(filePath: string | null): void {
    this.currentFilePath = filePath;
  }

  /**
   * Check if presentation is modified
   */
  public getIsModified(): boolean {
    return this.isModified;
  }

  /**
   * Get recent files
   */
  public getRecentFiles(): RecentFile[] {
    return [...this.recentFiles];
  }

  /**
   * Clear recent files
   */
  public clearRecentFiles(): void {
    this.recentFiles = [];
    this.saveRecentFiles();
  }

  /**
   * Remove file from recent files
   */
  public removeFromRecentFiles(filePath: string): void {
    this.recentFiles = this.recentFiles.filter(file => file.filePath !== filePath);
    this.saveRecentFiles();
  }

  /**
   * Validate presentation data
   */
  private validatePresentation(presentation: Presentation): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Check required fields
    if (!presentation.id) errors.push('Missing presentation ID');
    if (!presentation.title) errors.push('Missing presentation title');
    if (!presentation.version) errors.push('Missing presentation version');
    if (!presentation.createdAt) errors.push('Missing creation date');
    if (!presentation.updatedAt) errors.push('Missing update date');

    // Check slides
    if (!Array.isArray(presentation.slides)) {
      errors.push('Invalid slides array');
    } else {
      if (presentation.slides.length === 0) {
        errors.push('Presentation must have at least one slide');
      }

      presentation.slides.forEach((slide, index) => {
        if (!slide.id) errors.push(`Slide ${index + 1}: Missing slide ID`);
        if (!slide.title) errors.push(`Slide ${index + 1}: Missing slide title`);
        if (!Array.isArray(slide.elements)) {
          errors.push(`Slide ${index + 1}: Invalid elements array`);
        }
      });
    }

    // Check theme
    if (!presentation.theme) {
      errors.push('Missing theme');
    } else {
      if (!presentation.theme.id) errors.push('Missing theme ID');
      if (!presentation.theme.name) errors.push('Missing theme name');
    }

    // Check metadata
    if (!presentation.metadata) {
      errors.push('Missing metadata');
    } else {
      if (!presentation.metadata.author && presentation.metadata.author !== '') {
        errors.push('Missing author in metadata');
      }
    }

    // Check settings
    if (!presentation.settings) {
      errors.push('Missing settings');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Attempt to recover presentation from validation errors
   */
  private recoverPresentation(
    presentation: Presentation,
    errors: string[]
  ): Presentation | null {
    try {
      const recovered = { ...presentation };

      // Fix missing IDs
      if (!recovered.id) {
        recovered.id = `presentation-${Date.now()}`;
      }

      // Fix missing title
      if (!recovered.title) {
        recovered.title = 'Recovered Presentation';
      }

      // Fix missing version
      if (!recovered.version) {
        recovered.version = '1.0.0';
      }

      // Fix missing dates
      const now = new Date();
      if (!recovered.createdAt) {
        recovered.createdAt = now;
      }
      if (!recovered.updatedAt) {
        recovered.updatedAt = now;
      }

      // Fix slides
      if (!Array.isArray(recovered.slides) || recovered.slides.length === 0) {
        recovered.slides = [{
          id: `slide-${Date.now()}`,
          title: 'Slide 1',
          elements: [],
          connections: [],
          layout: {
            name: 'default',
            template: 'title-content',
            regions: {
              title: { x: 50, y: 50, width: 700, height: 80 },
              content: { x: 50, y: 150, width: 700, height: 400 }
            }
          },
          background: { type: 'color', color: { r: 255, g: 255, b: 255 } },
          notes: '',
          createdAt: now,
          updatedAt: now
        }];
      } else {
        // Fix individual slides
        recovered.slides.forEach((slide, index) => {
          if (!slide.id) {
            slide.id = `slide-${Date.now()}-${index}`;
          }
          if (!slide.title) {
            slide.title = `Slide ${index + 1}`;
          }
          if (!Array.isArray(slide.elements)) {
            slide.elements = [];
          }
          if (!Array.isArray(slide.connections)) {
            slide.connections = [];
          }
          if (!slide.createdAt) {
            slide.createdAt = now;
          }
          if (!slide.updatedAt) {
            slide.updatedAt = now;
          }
        });
      }

      // Fix theme
      if (!recovered.theme) {
        recovered.theme = {
          id: 'default',
          name: 'Default Theme',
          colors: {
            primary: { r: 59, g: 130, b: 246 },
            secondary: { r: 107, g: 114, b: 128 },
            accent: { r: 16, g: 185, b: 129 },
            background: { r: 255, g: 255, b: 255 },
            text: { r: 17, g: 24, b: 39 }
          },
          fonts: {
            heading: 'Inter',
            body: 'Inter',
            monospace: 'JetBrains Mono'
          }
        };
      }

      // Fix metadata
      if (!recovered.metadata) {
        recovered.metadata = {
          author: '',
          title: recovered.title,
          date: now
        };
      }

      // Fix settings
      if (!recovered.settings) {
        recovered.settings = {
          slideSize: { width: 800, height: 600, aspectRatio: '4:3' },
          autoSave: true,
          autoSaveInterval: 30,
          latexEngine: 'pdflatex',
          compilationTimeout: 30,
          showGrid: false,
          snapToGrid: true,
          gridSize: 10
        };
      }

      return recovered;
    } catch (error) {
      return null;
    }
  }

  /**
   * Parse file content
   */
  private parseFileContent(content: string): {
    success: boolean;
    presentation?: Presentation;
    error?: string;
  } {
    try {
      const data = JSON.parse(content);

      // Handle different file formats
      if (data.version && data.presentation) {
        // New format with metadata
        return {
          success: true,
          presentation: data.presentation
        };
      } else if (data.id && data.title && data.slides) {
        // Direct presentation format (legacy)
        return {
          success: true,
          presentation: data as Presentation
        };
      } else {
        return {
          success: false,
          error: 'Unrecognized file format'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to parse file: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Add file to recent files list
   */
  private async addToRecentFiles(filePath: string, presentation: Presentation): Promise<void> {
    const fileName = filePath.split('/').pop() || filePath.split('\\').pop() || 'Unknown';
    
    // Remove existing entry if present
    this.recentFiles = this.recentFiles.filter(file => file.filePath !== filePath);

    // Add to beginning of list
    const recentFile: RecentFile = {
      id: `recent-${Date.now()}`,
      filePath,
      fileName,
      lastOpened: new Date(),
      title: presentation.title
    };

    this.recentFiles.unshift(recentFile);

    // Limit to max recent files
    if (this.recentFiles.length > this.config.maxRecentFiles) {
      this.recentFiles = this.recentFiles.slice(0, this.config.maxRecentFiles);
    }

    await this.saveRecentFiles();
  }

  /**
   * Load recent files from storage
   */
  private loadRecentFiles(): void {
    try {
      const stored = localStorage.getItem('recentFiles');
      if (stored) {
        const parsed = JSON.parse(stored);
        this.recentFiles = parsed.map((file: any) => ({
          ...file,
          lastOpened: new Date(file.lastOpened)
        }));
      }
    } catch (error) {
      console.warn('Failed to load recent files:', error);
      this.recentFiles = [];
    }
  }

  /**
   * Save recent files to storage
   */
  private async saveRecentFiles(): Promise<void> {
    try {
      localStorage.setItem('recentFiles', JSON.stringify(this.recentFiles));
    } catch (error) {
      console.warn('Failed to save recent files:', error);
    }
  }

  /**
   * Handle errors
   */
  private handleError(error: string): void {
    console.error('FileService error:', error);
    if (this.onErrorCallback) {
      this.onErrorCallback(error);
    }
  }

  /**
   * Helper methods for file operations
   */
  private async writeFile(filePath: string, content: string): Promise<FileOperationResult> {
    // This would be implemented using Node.js fs in the main process
    // For now, we'll use the existing electron API
    return await window.electronAPI.saveFile(content);
  }

  private async readFile(filePath: string): Promise<any> {
    // This would be implemented using Node.js fs in the main process
    // For now, we'll use the existing electron API
    return await window.electronAPI.openFile();
  }

  private async getAppVersion(): Promise<string> {
    try {
      return await window.electronAPI.getAppVersion();
    } catch {
      return '1.0.0';
    }
  }

  private async getPlatform(): Promise<string> {
    try {
      return await window.electronAPI.getPlatform();
    } catch {
      return 'unknown';
    }
  }

  /**
   * Cleanup resources
   */
  public cleanup(): void {
    this.stopAutoSave();
  }
}

// Export singleton instance
export const fileService = FileService.getInstance();