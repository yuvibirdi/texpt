import JSZip from 'jszip';
import { 
  Presentation, 
  Slide, 
  SlideElement, 
  ElementType,
  Position,
  Size,
  Color,
  createDefaultTheme,
  createDefaultPresentationSettings,
  createDefaultPresentationMetadata,
  createDefaultSlideLayout,
  createDefaultBackground
} from '../types/presentation';

export interface ImportProgress {
  stage: 'parsing' | 'extracting' | 'converting' | 'finalizing';
  progress: number; // 0-100
  message: string;
  currentSlide?: number;
  totalSlides?: number;
}

export interface ImportOptions {
  preserveFormatting: boolean;
  importImages: boolean;
  importShapes: boolean;
  importNotes: boolean;
  maxImageSize: number; // in MB
  imageQuality: 'low' | 'medium' | 'high';
}

export interface ImportResult {
  success: boolean;
  presentation?: Presentation;
  warnings: string[];
  errors: string[];
  importedSlides: number;
  skippedElements: number;
}

export interface PPTXSlideData {
  slideNumber: number;
  title?: string;
  content: PPTXElement[];
  notes?: string;
  background?: {
    type: 'color' | 'image';
    value: string;
  };
}

export interface PPTXElement {
  type: 'text' | 'image' | 'shape' | 'table';
  id: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  content?: string;
  properties: Record<string, any>;
}

export class PPTXImportService {
  private onProgressCallback?: (progress: ImportProgress) => void;
  private importOptions: ImportOptions;

  constructor(options: Partial<ImportOptions> = {}) {
    this.importOptions = {
      preserveFormatting: true,
      importImages: true,
      importShapes: true,
      importNotes: true,
      maxImageSize: 10, // 10MB
      imageQuality: 'medium',
      ...options
    };
  }

  /**
   * Set progress callback for import tracking
   */
  public setProgressCallback(callback: (progress: ImportProgress) => void): void {
    this.onProgressCallback = callback;
  }

  /**
   * Import PowerPoint file and convert to internal presentation format
   */
  public async importPPTX(file: File): Promise<ImportResult> {
    const result: ImportResult = {
      success: false,
      warnings: [],
      errors: [],
      importedSlides: 0,
      skippedElements: 0
    };

    try {
      this.reportProgress('parsing', 0, 'Reading PowerPoint file...');

      // Validate file
      const validation = this.validateFile(file);
      if (!validation.valid) {
        result.errors.push(...validation.errors);
        return result;
      }

      // Parse PPTX file
      const pptxData = await this.parsePPTXFile(file);
      this.reportProgress('extracting', 25, 'Extracting slide content...');

      // Extract slides data
      const slidesData = await this.extractSlidesData(pptxData);
      this.reportProgress('converting', 50, 'Converting slides to internal format...');

      // Convert to internal format
      const presentation = await this.convertToPresentation(slidesData);
      this.reportProgress('finalizing', 90, 'Finalizing presentation...');

      // Finalize result
      result.success = true;
      result.presentation = presentation;
      result.importedSlides = presentation.slides.length;
      this.reportProgress('finalizing', 100, 'Import completed successfully');

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      result.errors.push(`Import failed: ${errorMessage}`);
      this.reportProgress('parsing', 0, `Import failed: ${errorMessage}`);
      return result;
    }
  }

  /**
   * Validate PowerPoint file
   */
  private validateFile(file: File): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check file type
    if (!file.name.toLowerCase().endsWith('.pptx')) {
      errors.push('File must be a PowerPoint (.pptx) file');
    }

    // Check file size (max 100MB)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      errors.push('File size exceeds maximum limit of 100MB');
    }

    // Check if file is empty
    if (file.size === 0) {
      errors.push('File is empty');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Parse PPTX file using JSZip
   */
  private async parsePPTXFile(file: File): Promise<JSZip> {
    try {
      let arrayBuffer: ArrayBuffer;
      
      // Handle different environments (browser vs test)
      if (file.arrayBuffer) {
        arrayBuffer = await file.arrayBuffer();
      } else {
        // Fallback for test environments
        arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as ArrayBuffer);
          reader.onerror = reject;
          reader.readAsArrayBuffer(file);
        });
      }
      
      const zip = await JSZip.loadAsync(arrayBuffer);
      return zip;
    } catch (error) {
      throw new Error(`Failed to parse PPTX file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract slides data from PPTX
   */
  private async extractSlidesData(zip: JSZip): Promise<PPTXSlideData[]> {
    const slidesData: PPTXSlideData[] = [];

    try {
      // Get presentation structure
      const presentationXml = await this.getFileContent(zip, 'ppt/presentation.xml');
      const slideIds = this.extractSlideIds(presentationXml);

      this.reportProgress('extracting', 30, `Found ${slideIds.length} slides`);

      // Process each slide
      for (let i = 0; i < slideIds.length; i++) {
        const slideId = slideIds[i];
        const slideData = await this.extractSlideData(zip, slideId, i + 1);
        slidesData.push(slideData);

        const progress = 30 + (i / slideIds.length) * 20;
        this.reportProgress('extracting', progress, `Processing slide ${i + 1} of ${slideIds.length}`);
      }

      return slidesData;
    } catch (error) {
      throw new Error(`Failed to extract slides data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract slide IDs from presentation.xml
   */
  private extractSlideIds(presentationXml: string): string[] {
    const slideIds: string[] = [];
    
    try {
      // Simple regex-based extraction (in a real implementation, use proper XML parser)
      const slideIdRegex = /<p:sldId[^>]*r:id="([^"]+)"/g;
      let match;
      
      while ((match = slideIdRegex.exec(presentationXml)) !== null) {
        slideIds.push(match[1]);
      }

      return slideIds;
    } catch (error) {
      throw new Error('Failed to extract slide IDs from presentation');
    }
  }

  /**
   * Extract data from individual slide
   */
  private async extractSlideData(zip: JSZip, slideId: string, slideNumber: number): Promise<PPTXSlideData> {
    try {
      // Get slide XML file
      const slideXmlPath = `ppt/slides/slide${slideNumber}.xml`;
      const slideXml = await this.getFileContent(zip, slideXmlPath);

      // Extract slide content
      const slideData: PPTXSlideData = {
        slideNumber,
        content: []
      };

      // Extract title
      slideData.title = this.extractSlideTitle(slideXml) || `Slide ${slideNumber}`;

      // Extract text elements
      const textElements = this.extractTextElements(slideXml, slideNumber);
      slideData.content.push(...textElements);

      // Extract images if enabled
      if (this.importOptions.importImages) {
        const imageElements = await this.extractImageElements(zip, slideXml, slideNumber);
        slideData.content.push(...imageElements);
      }

      // Extract shapes if enabled
      if (this.importOptions.importShapes) {
        const shapeElements = this.extractShapeElements(slideXml, slideNumber);
        slideData.content.push(...shapeElements);
      }

      // Extract notes if enabled
      if (this.importOptions.importNotes) {
        slideData.notes = await this.extractSlideNotes(zip, slideNumber);
      }

      return slideData;
    } catch (error) {
      throw new Error(`Failed to extract slide ${slideNumber} data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract slide title from XML
   */
  private extractSlideTitle(slideXml: string): string | undefined {
    try {
      // Look for title placeholder or first text element
      const titleRegex = /<p:ph[^>]*type="title"[^>]*>.*?<a:t>([^<]+)<\/a:t>/s;
      const match = titleRegex.exec(slideXml);
      return match ? match[1].trim() : undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Extract text elements from slide XML
   */
  private extractTextElements(slideXml: string, slideNumber: number): PPTXElement[] {
    const textElements: PPTXElement[] = [];

    try {
      // Simple regex-based text extraction (in production, use proper XML parser)
      const textRegex = /<p:sp[^>]*>.*?<a:t>([^<]+)<\/a:t>.*?<\/p:sp>/gs;
      let match;
      let elementIndex = 0;

      while ((match = textRegex.exec(slideXml)) !== null) {
        const textContent = match[1].trim();
        if (textContent) {
          textElements.push({
            type: 'text',
            id: `slide${slideNumber}_text${elementIndex}`,
            position: { x: 100 + elementIndex * 20, y: 100 + elementIndex * 50 }, // Default positioning
            size: { width: 400, height: 50 },
            content: textContent,
            properties: {
              fontSize: 16,
              fontFamily: 'Arial',
              textColor: { r: 0, g: 0, b: 0 }
            }
          });
          elementIndex++;
        }
      }

      return textElements;
    } catch (error) {
      console.warn(`Failed to extract text elements from slide ${slideNumber}:`, error);
      return [];
    }
  }

  /**
   * Extract image elements from slide XML
   */
  private async extractImageElements(zip: JSZip, slideXml: string, slideNumber: number): Promise<PPTXElement[]> {
    const imageElements: PPTXElement[] = [];

    try {
      // Extract image references from slide XML
      const imageRegex = /<p:pic[^>]*>.*?<a:blip[^>]*r:embed="([^"]+)".*?<\/p:pic>/gs;
      let match;
      let elementIndex = 0;

      while ((match = imageRegex.exec(slideXml)) !== null) {
        const imageId = match[1];
        
        try {
          // Get image data
          const imageData = await this.extractImageData(zip, imageId, slideNumber);
          if (imageData) {
            imageElements.push({
              type: 'image',
              id: `slide${slideNumber}_image${elementIndex}`,
              position: { x: 200 + elementIndex * 30, y: 200 + elementIndex * 30 },
              size: { width: 300, height: 200 },
              content: imageData,
              properties: {}
            });
            elementIndex++;
          }
        } catch (error) {
          console.warn(`Failed to extract image ${imageId} from slide ${slideNumber}:`, error);
        }
      }

      return imageElements;
    } catch (error) {
      console.warn(`Failed to extract image elements from slide ${slideNumber}:`, error);
      return [];
    }
  }

  /**
   * Extract image data from PPTX
   */
  private async extractImageData(zip: JSZip, imageId: string, slideNumber: number): Promise<string | null> {
    try {
      // Get relationships to find actual image file
      const relsPath = `ppt/slides/_rels/slide${slideNumber}.xml.rels`;
      const relsXml = await this.getFileContent(zip, relsPath);
      
      // Find image path
      const imagePathRegex = new RegExp(`<Relationship[^>]*Id="${imageId}"[^>]*Target="([^"]+)"`);
      const match = imagePathRegex.exec(relsXml);
      
      if (!match) {
        return null;
      }

      const imagePath = `ppt/slides/${match[1]}`;
      const imageFile = zip.file(imagePath);
      
      if (!imageFile) {
        return null;
      }

      // Get image as base64
      const imageBlob = await imageFile.async('blob');
      return await this.blobToBase64(imageBlob);
    } catch (error) {
      console.warn(`Failed to extract image data for ${imageId}:`, error);
      return null;
    }
  }

  /**
   * Extract shape elements from slide XML
   */
  private extractShapeElements(slideXml: string, slideNumber: number): PPTXElement[] {
    const shapeElements: PPTXElement[] = [];

    try {
      // Simple shape extraction (rectangles, circles, etc.)
      const shapeRegex = /<p:sp[^>]*>.*?<a:prstGeom[^>]*prst="([^"]+)".*?<\/p:sp>/gs;
      let match;
      let elementIndex = 0;

      while ((match = shapeRegex.exec(slideXml)) !== null) {
        const shapeType = match[1];
        
        shapeElements.push({
          type: 'shape',
          id: `slide${slideNumber}_shape${elementIndex}`,
          position: { x: 300 + elementIndex * 40, y: 300 + elementIndex * 40 },
          size: { width: 100, height: 100 },
          properties: {
            shapeType: this.mapPPTXShapeType(shapeType),
            fillColor: { r: 200, g: 200, b: 200 },
            strokeColor: { r: 0, g: 0, b: 0 },
            strokeWidth: 1
          }
        });
        elementIndex++;
      }

      return shapeElements;
    } catch (error) {
      console.warn(`Failed to extract shape elements from slide ${slideNumber}:`, error);
      return [];
    }
  }

  /**
   * Extract slide notes
   */
  private async extractSlideNotes(zip: JSZip, slideNumber: number): Promise<string | undefined> {
    try {
      const notesPath = `ppt/notesSlides/notesSlide${slideNumber}.xml`;
      const notesXml = await this.getFileContent(zip, notesPath);
      
      if (!notesXml) {
        return undefined;
      }

      // Extract notes text
      const notesRegex = /<a:t>([^<]+)<\/a:t>/g;
      const notes: string[] = [];
      let match;

      while ((match = notesRegex.exec(notesXml)) !== null) {
        notes.push(match[1].trim());
      }

      return notes.length > 0 ? notes.join(' ') : undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Convert PPTX data to internal presentation format
   */
  private async convertToPresentation(slidesData: PPTXSlideData[]): Promise<Presentation> {
    const now = new Date();
    
    // Create slides
    const slides: Slide[] = [];
    
    for (let i = 0; i < slidesData.length; i++) {
      const slideData = slidesData[i];
      
      // Convert elements
      const elements: SlideElement[] = slideData.content.map(pptxElement => ({
        id: pptxElement.id,
        type: pptxElement.type as ElementType,
        position: pptxElement.position as Position,
        size: pptxElement.size as Size,
        properties: pptxElement.properties,
        content: pptxElement.content,
        createdAt: now,
        updatedAt: now
      }));

      const slide: Slide = {
        id: `slide-${i + 1}-${Date.now()}`,
        title: slideData.title || `Slide ${i + 1}`,
        elements,
        connections: [],
        layout: createDefaultSlideLayout(),
        background: createDefaultBackground(),
        notes: slideData.notes || '',
        createdAt: now,
        updatedAt: now
      };

      slides.push(slide);
      
      const progress = 50 + (i / slidesData.length) * 40;
      this.reportProgress('converting', progress, `Converting slide ${i + 1} of ${slidesData.length}`);
    }

    // Create presentation
    const presentation: Presentation = {
      id: `presentation-${Date.now()}`,
      title: 'Imported Presentation',
      slides,
      theme: createDefaultTheme(),
      metadata: createDefaultPresentationMetadata(),
      settings: createDefaultPresentationSettings(),
      createdAt: now,
      updatedAt: now,
      version: '1.0.0'
    };

    return presentation;
  }

  /**
   * Map PPTX shape types to internal shape types
   */
  private mapPPTXShapeType(pptxShapeType: string): string {
    const shapeMap: Record<string, string> = {
      'rect': 'rectangle',
      'ellipse': 'circle',
      'line': 'line',
      'triangle': 'triangle',
      'diamond': 'diamond',
      'roundRect': 'rectangle'
    };

    return shapeMap[pptxShapeType] || 'rectangle';
  }

  /**
   * Get file content from ZIP
   */
  private async getFileContent(zip: JSZip, filePath: string): Promise<string> {
    const file = zip.file(filePath);
    if (!file) {
      throw new Error(`File not found: ${filePath}`);
    }
    return await file.async('text');
  }

  /**
   * Convert blob to base64
   */
  private async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Report import progress
   */
  private reportProgress(stage: ImportProgress['stage'], progress: number, message: string): void {
    if (this.onProgressCallback) {
      this.onProgressCallback({
        stage,
        progress: Math.min(100, Math.max(0, progress)),
        message
      });
    }
  }
}

// Export singleton instance
export const pptxImportService = new PPTXImportService();