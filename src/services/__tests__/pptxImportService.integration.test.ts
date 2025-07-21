import { PPTXImportService, ImportOptions } from '../pptxImportService';

// Mock JSZip for integration testing
jest.mock('jszip', () => {
  return jest.fn().mockImplementation(() => ({
    loadAsync: jest.fn().mockResolvedValue({
      file: jest.fn().mockImplementation((path: string) => {
        // Mock different files based on path
        if (path === 'ppt/presentation.xml') {
          return {
            async: jest.fn().mockResolvedValue(`
              <p:presentation>
                <p:sldIdLst>
                  <p:sldId r:id="rId1"/>
                  <p:sldId r:id="rId2"/>
                </p:sldIdLst>
              </p:presentation>
            `)
          };
        }
        
        if (path === 'ppt/slides/slide1.xml') {
          return {
            async: jest.fn().mockResolvedValue(`
              <p:sld>
                <p:cSld>
                  <p:spTree>
                    <p:sp>
                      <p:nvSpPr>
                        <p:cNvPr name="Title 1"/>
                        <p:nvPr>
                          <p:ph type="title"/>
                        </p:nvPr>
                      </p:nvSpPr>
                      <p:txBody>
                        <a:p>
                          <a:r>
                            <a:t>Sample Slide Title</a:t>
                          </a:r>
                        </a:p>
                      </p:txBody>
                    </p:sp>
                    <p:sp>
                      <p:txBody>
                        <a:p>
                          <a:r>
                            <a:t>Sample content text</a:t>
                          </a:r>
                        </a:p>
                      </p:txBody>
                    </p:sp>
                  </p:spTree>
                </p:cSld>
              </p:sld>
            `)
          };
        }
        
        if (path === 'ppt/slides/slide2.xml') {
          return {
            async: jest.fn().mockResolvedValue(`
              <p:sld>
                <p:cSld>
                  <p:spTree>
                    <p:sp>
                      <p:nvSpPr>
                        <p:cNvPr name="Title 2"/>
                        <p:nvPr>
                          <p:ph type="title"/>
                        </p:nvPr>
                      </p:nvSpPr>
                      <p:txBody>
                        <a:p>
                          <a:r>
                            <a:t>Second Slide</a:t>
                          </a:r>
                        </a:p>
                      </p:txBody>
                    </p:sp>
                  </p:spTree>
                </p:cSld>
              </p:sld>
            `)
          };
        }
        
        // Return null for files that don't exist
        return null;
      })
    })
  }));
});

describe('PPTXImportService Integration Tests', () => {
  let importService: PPTXImportService;
  let progressUpdates: any[];

  beforeEach(() => {
    progressUpdates = [];
    importService = new PPTXImportService({
      preserveFormatting: true,
      importImages: true,
      importShapes: true,
      importNotes: true,
      maxImageSize: 10,
      imageQuality: 'medium'
    });
    
    importService.setProgressCallback((progress) => {
      progressUpdates.push(progress);
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('full import workflow', () => {
    it('should successfully import a mock PPTX file', async () => {
      // Create a mock PPTX file
      const mockPPTXContent = new Blob(['mock pptx content'], { 
        type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' 
      });
      const mockFile = new File([mockPPTXContent], 'test-presentation.pptx', { 
        type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' 
      });

      // Import the file
      const result = await importService.importPPTX(mockFile);

      // Verify the result
      expect(result.success).toBe(true);
      expect(result.presentation).toBeDefined();
      expect(result.errors).toHaveLength(0);
      expect(result.importedSlides).toBe(2); // Based on our mock data
      
      // Verify presentation structure
      const presentation = result.presentation!;
      expect(presentation.title).toBe('Imported Presentation');
      expect(presentation.slides).toHaveLength(2);
      expect(presentation.version).toBe('1.0.0');
      
      // Verify first slide
      const firstSlide = presentation.slides[0];
      expect(firstSlide.title).toBe('Sample Slide Title');
      expect(firstSlide.elements).toHaveLength(2); // Title and content
      
      // Verify second slide
      const secondSlide = presentation.slides[1];
      expect(secondSlide.title).toBe('Second Slide');
      expect(secondSlide.elements).toHaveLength(1); // Just title
    });

    it('should track progress during import', async () => {
      const mockPPTXContent = new Blob(['mock pptx content'], { 
        type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' 
      });
      const mockFile = new File([mockPPTXContent], 'test-presentation.pptx', { 
        type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' 
      });

      await importService.importPPTX(mockFile);

      // Verify progress updates were called
      expect(progressUpdates.length).toBeGreaterThan(0);
      
      // Verify progress stages
      const stages = progressUpdates.map(update => update.stage);
      expect(stages).toContain('parsing');
      expect(stages).toContain('extracting');
      expect(stages).toContain('converting');
      expect(stages).toContain('finalizing');
      
      // Verify progress values are valid
      progressUpdates.forEach(update => {
        expect(update.progress).toBeGreaterThanOrEqual(0);
        expect(update.progress).toBeLessThanOrEqual(100);
        expect(update.message).toBeDefined();
        expect(typeof update.message).toBe('string');
      });
    });

    it('should handle import with different options', async () => {
      // Create service with different options
      const customService = new PPTXImportService({
        preserveFormatting: false,
        importImages: false,
        importShapes: false,
        importNotes: false,
        maxImageSize: 5,
        imageQuality: 'low'
      });

      const mockPPTXContent = new Blob(['mock pptx content'], { 
        type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' 
      });
      const mockFile = new File([mockPPTXContent], 'test-presentation.pptx', { 
        type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' 
      });

      const result = await customService.importPPTX(mockFile);

      expect(result.success).toBe(true);
      expect(result.presentation).toBeDefined();
    });

    it('should handle files with no slides gracefully', async () => {
      // Mock JSZip to return empty presentation
      const JSZip = require('jszip');
      JSZip.mockImplementation(() => ({
        loadAsync: jest.fn().mockResolvedValue({
          file: jest.fn().mockImplementation((path: string) => {
            if (path === 'ppt/presentation.xml') {
              return {
                async: jest.fn().mockResolvedValue(`
                  <p:presentation>
                    <p:sldIdLst>
                    </p:sldIdLst>
                  </p:presentation>
                `)
              };
            }
            return null;
          })
        })
      }));

      const mockPPTXContent = new Blob(['mock pptx content'], { 
        type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' 
      });
      const mockFile = new File([mockPPTXContent], 'empty-presentation.pptx', { 
        type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' 
      });

      const result = await importService.importPPTX(mockFile);

      expect(result.success).toBe(true);
      expect(result.presentation).toBeDefined();
      expect(result.presentation!.slides).toHaveLength(0);
      expect(result.importedSlides).toBe(0);
    });
  });

  describe('error scenarios', () => {
    it('should handle corrupted PPTX files', async () => {
      // Mock JSZip to throw an error
      const JSZip = require('jszip');
      JSZip.mockImplementation(() => ({
        loadAsync: jest.fn().mockRejectedValue(new Error('Invalid ZIP file'))
      }));

      const mockPPTXContent = new Blob(['corrupted content'], { 
        type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' 
      });
      const mockFile = new File([mockPPTXContent], 'corrupted.pptx', { 
        type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' 
      });

      const result = await importService.importPPTX(mockFile);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Import failed: Failed to parse PPTX file: Invalid ZIP file');
      expect(result.presentation).toBeUndefined();
    });

    it('should validate file type before processing', async () => {
      const invalidFile = new File(['content'], 'document.docx', { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      });

      const result = await importService.importPPTX(invalidFile);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('File must be a PowerPoint (.pptx) file');
      expect(result.presentation).toBeUndefined();
    });

    it('should handle missing presentation.xml', async () => {
      // Mock JSZip to return null for presentation.xml
      const JSZip = require('jszip');
      JSZip.mockImplementation(() => ({
        loadAsync: jest.fn().mockResolvedValue({
          file: jest.fn().mockReturnValue(null)
        })
      }));

      const mockPPTXContent = new Blob(['mock pptx content'], { 
        type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' 
      });
      const mockFile = new File([mockPPTXContent], 'invalid.pptx', { 
        type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' 
      });

      const result = await importService.importPPTX(mockFile);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.presentation).toBeUndefined();
    });
  });

  describe('content extraction', () => {
    it('should extract text content correctly', async () => {
      const mockPPTXContent = new Blob(['mock pptx content'], { 
        type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' 
      });
      const mockFile = new File([mockPPTXContent], 'text-content.pptx', { 
        type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' 
      });

      const result = await importService.importPPTX(mockFile);

      expect(result.success).toBe(true);
      
      const presentation = result.presentation!;
      const firstSlide = presentation.slides[0];
      
      // Check that text elements were extracted
      const textElements = firstSlide.elements.filter(el => el.type === 'text');
      expect(textElements.length).toBeGreaterThan(0);
      
      // Check content
      const titleElement = textElements.find(el => el.content === 'Sample Slide Title');
      expect(titleElement).toBeDefined();
      
      const contentElement = textElements.find(el => el.content === 'Sample content text');
      expect(contentElement).toBeDefined();
    });

    it('should assign unique IDs to elements', async () => {
      const mockPPTXContent = new Blob(['mock pptx content'], { 
        type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' 
      });
      const mockFile = new File([mockPPTXContent], 'unique-ids.pptx', { 
        type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' 
      });

      const result = await importService.importPPTX(mockFile);

      expect(result.success).toBe(true);
      
      const presentation = result.presentation!;
      const allElementIds: string[] = [];
      
      presentation.slides.forEach(slide => {
        slide.elements.forEach(element => {
          allElementIds.push(element.id);
        });
      });
      
      // Check that all IDs are unique
      const uniqueIds = new Set(allElementIds);
      expect(uniqueIds.size).toBe(allElementIds.length);
      
      // Check ID format
      allElementIds.forEach(id => {
        expect(id).toMatch(/^slide\d+_\w+\d+$/);
      });
    });
  });
});