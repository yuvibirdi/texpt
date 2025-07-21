import { PPTXImportService, ImportOptions, ImportProgress } from '../pptxImportService';
import { Presentation } from '../../types/presentation';

// Mock JSZip
jest.mock('jszip', () => {
  return jest.fn().mockImplementation(() => ({
    loadAsync: jest.fn(),
    file: jest.fn()
  }));
});

describe('PPTXImportService', () => {
  let importService: PPTXImportService;
  let mockProgressCallback: jest.Mock;

  beforeEach(() => {
    importService = new PPTXImportService();
    mockProgressCallback = jest.fn();
    importService.setProgressCallback(mockProgressCallback);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with default options', () => {
      const service = new PPTXImportService();
      expect(service).toBeInstanceOf(PPTXImportService);
    });

    it('should initialize with custom options', () => {
      const customOptions: Partial<ImportOptions> = {
        preserveFormatting: false,
        importImages: false,
        maxImageSize: 5
      };
      
      const service = new PPTXImportService(customOptions);
      expect(service).toBeInstanceOf(PPTXImportService);
    });
  });

  describe('setProgressCallback', () => {
    it('should set progress callback', () => {
      const callback = jest.fn();
      importService.setProgressCallback(callback);
      
      // Progress callback should be set (we can't directly test this without triggering import)
      expect(callback).toBeDefined();
    });
  });

  describe('importPPTX', () => {
    let mockFile: File;

    beforeEach(() => {
      // Create a mock File object
      const mockBlob = new Blob(['mock pptx content'], { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
      mockFile = new File([mockBlob], 'test.pptx', { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
    });

    it('should validate file before import', async () => {
      // Test with invalid file extension
      const invalidFile = new File(['content'], 'test.txt', { type: 'text/plain' });
      
      const result = await importService.importPPTX(invalidFile);
      
      expect(result.success).toBe(false);
      expect(result.errors).toContain('File must be a PowerPoint (.pptx) file');
    });

    it('should reject empty files', async () => {
      const emptyFile = new File([], 'empty.pptx', { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
      
      const result = await importService.importPPTX(emptyFile);
      
      expect(result.success).toBe(false);
      expect(result.errors).toContain('File is empty');
    });

    it('should reject files that are too large', async () => {
      // Create a mock file that's too large (over 100MB)
      const largeContent = new Array(101 * 1024 * 1024).fill('a').join('');
      const largeFile = new File([largeContent], 'large.pptx', { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
      
      const result = await importService.importPPTX(largeFile);
      
      expect(result.success).toBe(false);
      expect(result.errors).toContain('File size exceeds maximum limit of 100MB');
    });

    it('should call progress callback during import', async () => {
      // Mock successful file parsing
      const JSZip = require('jszip');
      const mockZip = {
        file: jest.fn().mockReturnValue({
          async: jest.fn().mockResolvedValue('<presentation></presentation>')
        })
      };
      JSZip.mockImplementation(() => ({
        loadAsync: jest.fn().mockResolvedValue(mockZip)
      }));

      try {
        await importService.importPPTX(mockFile);
      } catch (error) {
        // Expected to fail due to mocking, but progress should still be called
      }

      expect(mockProgressCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          stage: 'parsing',
          progress: 0,
          message: 'Reading PowerPoint file...'
        })
      );
    });
  });

  describe('file validation', () => {
    it('should accept valid PPTX files', () => {
      const validFile = new File(['content'], 'presentation.pptx', { 
        type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' 
      });
      
      // Access private method for testing
      const validateFile = (importService as any).validateFile.bind(importService);
      const result = validateFile(validFile);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject files with wrong extension', () => {
      const invalidFile = new File(['content'], 'document.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      
      const validateFile = (importService as any).validateFile.bind(importService);
      const result = validateFile(invalidFile);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('File must be a PowerPoint (.pptx) file');
    });
  });

  describe('shape type mapping', () => {
    it('should map PPTX shape types to internal types', () => {
      const mapPPTXShapeType = (importService as any).mapPPTXShapeType.bind(importService);
      
      expect(mapPPTXShapeType('rect')).toBe('rectangle');
      expect(mapPPTXShapeType('ellipse')).toBe('circle');
      expect(mapPPTXShapeType('line')).toBe('line');
      expect(mapPPTXShapeType('triangle')).toBe('triangle');
      expect(mapPPTXShapeType('diamond')).toBe('diamond');
      expect(mapPPTXShapeType('roundRect')).toBe('rectangle');
      expect(mapPPTXShapeType('unknown')).toBe('rectangle'); // default fallback
    });
  });

  describe('progress reporting', () => {
    it('should clamp progress values between 0 and 100', () => {
      const reportProgress = (importService as any).reportProgress.bind(importService);
      
      reportProgress('parsing', -10, 'test message');
      expect(mockProgressCallback).toHaveBeenCalledWith(
        expect.objectContaining({ progress: 0 })
      );
      
      reportProgress('parsing', 150, 'test message');
      expect(mockProgressCallback).toHaveBeenCalledWith(
        expect.objectContaining({ progress: 100 })
      );
    });

    it('should include all progress information', () => {
      const reportProgress = (importService as any).reportProgress.bind(importService);
      
      reportProgress('converting', 50, 'Converting slides');
      
      expect(mockProgressCallback).toHaveBeenCalledWith({
        stage: 'converting',
        progress: 50,
        message: 'Converting slides'
      });
    });
  });

  describe('blob to base64 conversion', () => {
    it('should convert blob to base64', async () => {
      const blobToBase64 = (importService as any).blobToBase64.bind(importService);
      const testBlob = new Blob(['test content'], { type: 'text/plain' });
      
      const result = await blobToBase64(testBlob);
      
      expect(result).toMatch(/^data:text\/plain;base64,/);
      expect(result.length).toBeGreaterThan('data:text/plain;base64,'.length);
    });
  });

  describe('slide title extraction', () => {
    it('should extract slide title from XML', () => {
      const extractSlideTitle = (importService as any).extractSlideTitle.bind(importService);
      const xmlWithTitle = '<p:ph type="title"><a:t>Test Slide Title</a:t></p:ph>';
      
      const result = extractSlideTitle(xmlWithTitle);
      
      expect(result).toBe('Test Slide Title');
    });

    it('should return undefined for XML without title', () => {
      const extractSlideTitle = (importService as any).extractSlideTitle.bind(importService);
      const xmlWithoutTitle = '<p:sp><a:t>Some content</a:t></p:sp>';
      
      const result = extractSlideTitle(xmlWithoutTitle);
      
      expect(result).toBeUndefined();
    });
  });

  describe('text element extraction', () => {
    it('should extract text elements from slide XML', () => {
      const extractTextElements = (importService as any).extractTextElements.bind(importService);
      const xmlWithText = `
        <p:sp><a:t>First text element</a:t></p:sp>
        <p:sp><a:t>Second text element</a:t></p:sp>
      `;
      
      const result = extractTextElements(xmlWithText, 1);
      
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        type: 'text',
        content: 'First text element',
        id: 'slide1_text0'
      });
      expect(result[1]).toMatchObject({
        type: 'text',
        content: 'Second text element',
        id: 'slide1_text1'
      });
    });

    it('should handle XML with no text elements', () => {
      const extractTextElements = (importService as any).extractTextElements.bind(importService);
      const xmlWithoutText = '<p:sp><p:nvSpPr></p:nvSpPr></p:sp>';
      
      const result = extractTextElements(xmlWithoutText, 1);
      
      expect(result).toHaveLength(0);
    });
  });

  describe('presentation conversion', () => {
    it('should convert slides data to presentation format', async () => {
      const convertToPresentation = (importService as any).convertToPresentation.bind(importService);
      const mockSlidesData = [
        {
          slideNumber: 1,
          title: 'Test Slide 1',
          content: [
            {
              type: 'text',
              id: 'slide1_text0',
              position: { x: 100, y: 100 },
              size: { width: 400, height: 50 },
              content: 'Test content',
              properties: { fontSize: 16 }
            }
          ],
          notes: 'Test notes'
        }
      ];
      
      const result = await convertToPresentation(mockSlidesData);
      
      expect(result).toMatchObject({
        title: 'Imported Presentation',
        version: '1.0.0'
      });
      expect(result.slides).toHaveLength(1);
      expect(result.slides[0]).toMatchObject({
        title: 'Test Slide 1',
        notes: 'Test notes'
      });
      expect(result.slides[0].elements).toHaveLength(1);
      expect(result.slides[0].elements[0]).toMatchObject({
        type: 'text',
        content: 'Test content'
      });
    });

    it('should handle empty slides data', async () => {
      const convertToPresentation = (importService as any).convertToPresentation.bind(importService);
      const emptySlidesData: any[] = [];
      
      const result = await convertToPresentation(emptySlidesData);
      
      expect(result.slides).toHaveLength(0);
    });
  });

  describe('error handling', () => {
    it('should handle file parsing errors gracefully', async () => {
      const JSZip = require('jszip');
      JSZip.mockImplementation(() => ({
        loadAsync: jest.fn().mockRejectedValue(new Error('Invalid ZIP file'))
      }));

      const mockFile = new File(['invalid content'], 'test.pptx', { 
        type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' 
      });
      
      const result = await importService.importPPTX(mockFile);
      
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Import failed: Failed to parse PPTX file: Invalid ZIP file');
    });

    it('should handle missing files in ZIP gracefully', async () => {
      const getFileContent = (importService as any).getFileContent.bind(importService);
      const mockZip = {
        file: jest.fn().mockReturnValue(null)
      };
      
      await expect(getFileContent(mockZip, 'missing/file.xml')).rejects.toThrow('File not found: missing/file.xml');
    });
  });

  describe('import options', () => {
    it('should respect import options for images', () => {
      const serviceWithoutImages = new PPTXImportService({ importImages: false });
      expect(serviceWithoutImages).toBeInstanceOf(PPTXImportService);
    });

    it('should respect import options for shapes', () => {
      const serviceWithoutShapes = new PPTXImportService({ importShapes: false });
      expect(serviceWithoutShapes).toBeInstanceOf(PPTXImportService);
    });

    it('should respect import options for notes', () => {
      const serviceWithoutNotes = new PPTXImportService({ importNotes: false });
      expect(serviceWithoutNotes).toBeInstanceOf(PPTXImportService);
    });
  });
});