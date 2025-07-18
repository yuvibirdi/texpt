import { LaTeXGenerator } from '../latexGenerator';
import { latexOptimizer } from '../latexOptimizer';
import {
  Presentation,
  Slide,
  SlideElement,
  Theme,
  createDefaultTheme,
  createDefaultSlideLayout,
  createDefaultBackground,
  createDefaultPresentationSettings,
  createDefaultPresentationMetadata,
} from '../../types/presentation';

describe('LaTeXGenerator', () => {
  let generator: LaTeXGenerator;
  let mockPresentation: Presentation;
  let mockSlide: Slide;

  beforeEach(() => {
    generator = new LaTeXGenerator();
    
    // Create mock slide with elements
    mockSlide = {
      id: 'slide-1',
      title: 'Test Slide',
      elements: [],
      connections: [],
      layout: createDefaultSlideLayout(),
      background: createDefaultBackground(),
      notes: '',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Create mock presentation
    mockPresentation = {
      id: 'presentation-1',
      title: 'Test Presentation',
      slides: [mockSlide],
      theme: createDefaultTheme(),
      metadata: {
        ...createDefaultPresentationMetadata(),
        title: 'Test Presentation',
        author: 'Test Author',
      },
      settings: createDefaultPresentationSettings(),
      createdAt: new Date(),
      updatedAt: new Date(),
      version: '1.0.0',
    };
  });

  describe('generateDocument', () => {
    it('should generate a complete LaTeX document', () => {
      const latex = generator.generateDocument(mockPresentation);
      
      expect(latex).toContain('\\documentclass');
      expect(latex).toContain('\\usepackage');
      expect(latex).toContain('\\begin{document}');
      expect(latex).toContain('\\end{document}');
      expect(latex).toContain('\\begin{frame}');
      expect(latex).toContain('\\end{frame}');
    });

    it('should include presentation metadata', () => {
      const latex = generator.generateDocument(mockPresentation);
      
      expect(latex).toContain('\\title{Test Presentation}');
      expect(latex).toContain('\\author{Test Author}');
    });

    it('should generate title slide when metadata exists', () => {
      const latex = generator.generateDocument(mockPresentation);
      
      expect(latex).toContain('\\titlepage');
    });

    it('should respect generation options', () => {
      const latexWithoutPackages = generator.generateDocument(mockPresentation, {
        includePackages: false,
      });
      
      expect(latexWithoutPackages).not.toContain('\\usepackage');
      
      const latexWithoutDocClass = generator.generateDocument(mockPresentation, {
        includeDocumentClass: false,
      });
      
      expect(latexWithoutDocClass).not.toContain('\\documentclass');
    });
  });

  describe('generateSlide', () => {
    it('should generate basic slide structure', () => {
      const latex = generator.generateSlide(mockSlide, mockPresentation.theme);
      
      expect(latex).toContain('\\begin{frame}{Test Slide}');
      expect(latex).toContain('\\end{frame}');
      expect(latex).toContain('% Slide: Test Slide');
    });

    it('should handle slides with no elements', () => {
      const latex = generator.generateSlide(mockSlide, mockPresentation.theme);
      
      expect(latex).toBeDefined();
      expect(latex.length).toBeGreaterThan(0);
    });

    it('should escape special characters in slide title', () => {
      mockSlide.title = 'Test & Special $ Characters';
      const latex = generator.generateSlide(mockSlide, mockPresentation.theme);
      
      expect(latex).toContain('\\begin{frame}{Test \\& Special \\$ Characters}');
    });
  });

  describe('generateElement', () => {
    it('should generate text elements', () => {
      const textElement: SlideElement = {
        id: 'text-1',
        type: 'text',
        position: { x: 100, y: 100 },
        size: { width: 200, height: 50 },
        properties: {
          fontSize: 16,
          textColor: { r: 0, g: 0, b: 0 },
          textAlign: 'left',
        },
        content: 'Hello World',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const latex = generator.generateElement(textElement, mockPresentation.theme);
      
      expect(latex).toContain('tikzpicture');
      expect(latex).toContain('\\node');
      expect(latex).toContain('Hello World');
    });

    it('should generate image elements', () => {
      const imageElement: SlideElement = {
        id: 'image-1',
        type: 'image',
        position: { x: 50, y: 50 },
        size: { width: 300, height: 200 },
        properties: {},
        content: 'path/to/image.png',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const latex = generator.generateElement(imageElement, mockPresentation.theme);
      
      expect(latex).toContain('\\includegraphics');
      expect(latex).toContain('path/to/image.png');
    });

    it('should generate shape elements', () => {
      const shapeElement: SlideElement = {
        id: 'shape-1',
        type: 'shape',
        position: { x: 100, y: 100 },
        size: { width: 100, height: 100 },
        properties: {
          shapeType: 'rectangle',
          fillColor: { r: 255, g: 0, b: 0 },
          strokeColor: { r: 0, g: 0, b: 0 },
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const latex = generator.generateElement(shapeElement, mockPresentation.theme);
      
      expect(latex).toContain('\\draw');
      expect(latex).toContain('rectangle');
    });

    it('should handle unsupported element types', () => {
      const unsupportedElement: SlideElement = {
        id: 'unsupported-1',
        type: 'chart' as any,
        position: { x: 0, y: 0 },
        size: { width: 100, height: 100 },
        properties: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const latex = generator.generateElement(unsupportedElement, mockPresentation.theme);
      
      expect(latex).toContain('% Unsupported element type: chart');
    });
  });

  describe('text element generation', () => {
    it('should handle text formatting properties', () => {
      const textElement: SlideElement = {
        id: 'text-1',
        type: 'text',
        position: { x: 0, y: 0 },
        size: { width: 200, height: 50 },
        properties: {
          fontSize: 18,
          fontWeight: 'bold',
          fontStyle: 'italic',
          textAlign: 'center',
          textColor: { r: 255, g: 0, b: 0 },
        },
        content: 'Formatted Text',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const latex = generator.generateElement(textElement, mockPresentation.theme);
      
      expect(latex).toContain('align=center');
      expect(latex).toContain('font=\\bfseries');
      expect(latex).toContain('font=\\itshape');
    });

    it('should process math content', () => {
      const mathElement: SlideElement = {
        id: 'math-1',
        type: 'text',
        position: { x: 0, y: 0 },
        size: { width: 200, height: 50 },
        properties: {
          hasMath: true,
        },
        content: 'The formula is $E = mc^2$',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const latex = generator.generateElement(mathElement, mockPresentation.theme);
      
      expect(latex).toContain('\\(E = mc^2\\)');
    });
  });

  describe('shape element generation', () => {
    it('should generate different shape types', () => {
      const shapes = ['rectangle', 'circle', 'ellipse', 'line', 'arrow'];
      
      shapes.forEach(shapeType => {
        const shapeElement: SlideElement = {
          id: `shape-${shapeType}`,
          type: 'shape',
          position: { x: 0, y: 0 },
          size: { width: 100, height: 100 },
          properties: {
            shapeType: shapeType as any,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const latex = generator.generateElement(shapeElement, mockPresentation.theme);
        expect(latex).toBeDefined();
        expect(latex.length).toBeGreaterThan(0);
      });
    });

    it('should handle shape styling properties', () => {
      const styledShape: SlideElement = {
        id: 'styled-shape',
        type: 'shape',
        position: { x: 0, y: 0 },
        size: { width: 100, height: 100 },
        properties: {
          shapeType: 'rectangle',
          fillColor: { r: 255, g: 0, b: 0 },
          strokeColor: { r: 0, g: 0, b: 255 },
          strokeWidth: 2,
          cornerRadius: 5,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const latex = generator.generateElement(styledShape, mockPresentation.theme);
      
      expect(latex).toContain('line width=2pt');
      expect(latex).toContain('rounded corners=5pt');
    });
  });

  describe('optimization integration', () => {
    it('should optimize code when requested', () => {
      const latex = generator.generateDocument(mockPresentation, {
        optimizeCode: true,
      });
      
      // The code should be optimized (fewer empty lines, etc.)
      const lines = latex.split('\n');
      const emptyLines = lines.filter(line => line.trim() === '').length;
      
      // Should have some structure but not excessive empty lines
      expect(emptyLines).toBeLessThan(lines.length / 2);
    });

    it('should minify code when requested', () => {
      const normalLatex = generator.generateDocument(mockPresentation, {
        minifyOutput: false,
      });
      
      const minifiedLatex = generator.generateDocument(mockPresentation, {
        minifyOutput: true,
      });
      
      expect(minifiedLatex.length).toBeLessThan(normalLatex.length);
    });
  });

  describe('template system', () => {
    it('should provide default templates', () => {
      const templates = generator.getTemplates();
      
      expect(templates).toBeDefined();
      expect(templates.length).toBeGreaterThan(0);
      expect(templates.some(t => t.id === 'default')).toBe(true);
    });

    it('should allow adding custom templates', () => {
      const customTemplate = {
        id: 'custom',
        name: 'Custom Template',
        documentClass: 'beamer',
        packages: ['inputenc'],
        preamble: '\\usetheme{custom}',
        frameTemplate: '\\begin{frame}\n%CONTENT%\n\\end{frame}',
      };

      generator.addTemplate(customTemplate);
      const templates = generator.getTemplates();
      
      expect(templates.some(t => t.id === 'custom')).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle missing content gracefully', () => {
      const elementWithoutContent: SlideElement = {
        id: 'empty-1',
        type: 'text',
        position: { x: 0, y: 0 },
        size: { width: 100, height: 50 },
        properties: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const latex = generator.generateElement(elementWithoutContent, mockPresentation.theme);
      
      expect(latex).toBeDefined();
      expect(latex).not.toContain('undefined');
    });

    it('should handle invalid positions and sizes', () => {
      const invalidElement: SlideElement = {
        id: 'invalid-1',
        type: 'text',
        position: { x: -100, y: -100 },
        size: { width: 0, height: 0 },
        properties: {},
        content: 'Test',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const latex = generator.generateElement(invalidElement, mockPresentation.theme);
      
      expect(latex).toBeDefined();
      expect(latex.length).toBeGreaterThan(0);
    });
  });

  describe('LaTeX syntax validation', () => {
    it('should generate valid LaTeX syntax', () => {
      const latex = generator.generateDocument(mockPresentation);
      const validation = latexOptimizer.validateSyntax(latex);
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should handle complex presentations', () => {
      // Add multiple slides with different element types
      const complexSlide: Slide = {
        ...mockSlide,
        id: 'complex-slide',
        elements: [
          {
            id: 'text-1',
            type: 'text',
            position: { x: 50, y: 50 },
            size: { width: 200, height: 30 },
            properties: { fontSize: 16 },
            content: 'Title Text',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: 'image-1',
            type: 'image',
            position: { x: 100, y: 100 },
            size: { width: 150, height: 100 },
            properties: {},
            content: 'test.png',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: 'shape-1',
            type: 'shape',
            position: { x: 300, y: 200 },
            size: { width: 80, height: 80 },
            properties: { shapeType: 'circle' },
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      };

      mockPresentation.slides = [mockSlide, complexSlide];
      
      const latex = generator.generateDocument(mockPresentation);
      const validation = latexOptimizer.validateSyntax(latex);
      
      expect(validation.isValid).toBe(true);
      expect(latex).toContain('Title Text');
      expect(latex).toContain('test.png');
      expect(latex).toContain('circle');
    });
  });
});