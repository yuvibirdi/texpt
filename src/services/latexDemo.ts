import { latexGenerator } from './latexGenerator';
import { latexCompiler } from './latexCompiler';
import { Presentation, Slide, SlideElement } from '../types/presentation';

/**
 * Demo service to test LaTeX compilation with generated content
 */
export class LaTeXDemo {
  /**
   * Create a simple demo presentation
   */
  public createDemoPresentation(): Presentation {
    const demoSlide: Slide = {
      id: 'slide-1',
      title: 'Demo Slide',
      elements: [
        {
          id: 'text-1',
          type: 'text',
          position: { x: 100, y: 100 },
          size: { width: 400, height: 100 },
          properties: {
            fontSize: 24,
            fontWeight: 'bold',
            textColor: { r: 0, g: 0, b: 0, a: 1 },
            textAlign: 'center',
          },
          content: 'Welcome to LaTeX Presentation Editor',
        } as SlideElement,
        {
          id: 'text-2',
          type: 'text',
          position: { x: 100, y: 250 },
          size: { width: 400, height: 150 },
          properties: {
            fontSize: 16,
            hasMath: true,
          },
          content: 'This presentation supports mathematical expressions like $E = mc^2$ and complex formulas: $$\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}$$',
        } as SlideElement,
      ],
      layout: {
        name: 'blank',
        template: 'blank',
        regions: {},
      },
      background: {
        type: 'color',
        color: { r: 255, g: 255, b: 255, a: 1 },
      },
      connections: [],
      notes: 'This is a demo slide to test LaTeX compilation.',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const presentation: Presentation = {
      id: 'demo-presentation',
      title: 'Demo Presentation',
      slides: [demoSlide],
      theme: {
        id: 'default',
        name: 'Default Theme',
        colors: {
          primary: { r: 0, g: 102, b: 204, a: 1 },
          secondary: { r: 102, g: 102, b: 102, a: 1 },
          accent: { r: 255, g: 165, b: 0, a: 1 },
          background: { r: 255, g: 255, b: 255, a: 1 },
          text: { r: 0, g: 0, b: 0, a: 1 },
        },
        fonts: {
          heading: 'Inter',
          body: 'Inter',
          monospace: 'JetBrains Mono',
        },
        latexClass: 'beamer',
        latexOptions: {
          aspectratio: '169',
        },
      },
      metadata: {
        title: 'Demo Presentation',
        subtitle: 'Testing LaTeX Compilation',
        author: 'LaTeX Presentation Editor',
        institution: 'Demo Institution',
        date: new Date(),
        keywords: ['demo', 'latex', 'presentation'],
        description: 'A demo presentation to test LaTeX compilation functionality.',
      },
      settings: {
        slideSize: {
          width: 1920,
          height: 1080,
          aspectRatio: '16:9' as const,
        },
        autoSave: true,
        autoSaveInterval: 30,
        latexEngine: 'pdflatex' as const,
        compilationTimeout: 30,
        showGrid: true,
        snapToGrid: true,
        gridSize: 10,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      version: '1.0.0',
    };

    return presentation;
  }

  /**
   * Test LaTeX generation and compilation
   */
  public async testCompilation(): Promise<{
    success: boolean;
    jobId?: string;
    latexSource?: string;
    error?: string;
  }> {
    try {
      // Create demo presentation
      const presentation = this.createDemoPresentation();

      // Generate LaTeX source
      const latexSource = latexGenerator.generateDocument(presentation);

      // Compile LaTeX
      const jobId = await latexCompiler.compile(latexSource, {
        compiler: 'pdflatex',
        timeout: 30000,
        synctex: true,
      });

      return {
        success: true,
        jobId,
        latexSource,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get LaTeX compiler status
   */
  public getCompilerStatus() {
    return latexCompiler.getQueueStatus();
  }

  /**
   * Check if LaTeX is available on the system
   */
  public async checkLatexAvailability() {
    return latexCompiler.checkLatexAvailability();
  }

  /**
   * Generate LaTeX source for demo presentation
   */
  public generateDemoLatex(): string {
    const presentation = this.createDemoPresentation();
    return latexGenerator.generateDocument(presentation);
  }

  /**
   * Create a more complex demo with shapes and images
   */
  public createComplexDemo(): Presentation {
    const presentation = this.createDemoPresentation();

    // Add a second slide with shapes
    const shapeSlide: Slide = {
      id: 'slide-2',
      title: 'Shapes and Diagrams',
      elements: [
        {
          id: 'shape-1',
          type: 'shape',
          position: { x: 200, y: 200 },
          size: { width: 150, height: 100 },
          properties: {
            shapeType: 'rectangle',
            fillColor: { r: 100, g: 150, b: 255, a: 0.7 },
            strokeColor: { r: 0, g: 0, b: 0, a: 1 },
            strokeWidth: 2,
            cornerRadius: 10,
          },
          content: '',
        } as SlideElement,
        {
          id: 'shape-2',
          type: 'shape',
          position: { x: 400, y: 250 },
          size: { width: 100, height: 100 },
          properties: {
            shapeType: 'circle',
            fillColor: { r: 255, g: 100, b: 100, a: 0.7 },
            strokeColor: { r: 0, g: 0, b: 0, a: 1 },
            strokeWidth: 2,
          },
          content: '',
        } as SlideElement,
        {
          id: 'arrow-1',
          type: 'shape',
          position: { x: 350, y: 250 },
          size: { width: 50, height: 0 },
          properties: {
            shapeType: 'arrow',
            strokeColor: { r: 0, g: 0, b: 0, a: 1 },
            strokeWidth: 3,
          },
          content: '',
        } as SlideElement,
      ],
      layout: {
        name: 'blank',
        template: 'blank',
        regions: {},
      },
      background: {
        type: 'color',
        color: { r: 255, g: 255, b: 255, a: 1 },
      },
      connections: [],
      notes: 'This slide demonstrates shape rendering in LaTeX.',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    presentation.slides.push(shapeSlide);
    return presentation;
  }
}

// Export singleton instance
export const latexDemo = new LaTeXDemo();