import { Theme, SlideTemplate, SlideLayout, Color, createDefaultSlideLayout } from '../types/presentation';

/**
 * Service for managing presentation themes and slide templates
 */
export class TemplateService {
  private themes: Map<string, Theme> = new Map();
  private slideTemplates: Map<string, SlideTemplate> = new Map();

  constructor() {
    this.initializeDefaultThemes();
    this.initializeDefaultSlideTemplates();
  }

  // Theme management
  public getThemes(): Theme[] {
    return Array.from(this.themes.values());
  }

  public getTheme(id: string): Theme | undefined {
    return this.themes.get(id);
  }

  public addTheme(theme: Theme): void {
    this.themes.set(theme.id, {
      ...theme,
      isCustom: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  public updateTheme(id: string, updates: Partial<Theme>): boolean {
    const theme = this.themes.get(id);
    if (!theme) return false;

    this.themes.set(id, {
      ...theme,
      ...updates,
      updatedAt: new Date(),
    });
    return true;
  }

  public deleteTheme(id: string): boolean {
    const theme = this.themes.get(id);
    if (!theme || !theme.isCustom) return false;
    
    return this.themes.delete(id);
  }

  // Slide template management
  public getSlideTemplates(): SlideTemplate[] {
    return Array.from(this.slideTemplates.values());
  }

  public getSlideTemplate(id: string): SlideTemplate | undefined {
    return this.slideTemplates.get(id);
  }

  public addSlideTemplate(template: SlideTemplate): void {
    this.slideTemplates.set(template.id, {
      ...template,
      isCustom: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  public updateSlideTemplate(id: string, updates: Partial<SlideTemplate>): boolean {
    const template = this.slideTemplates.get(id);
    if (!template) return false;

    this.slideTemplates.set(id, {
      ...template,
      ...updates,
      updatedAt: new Date(),
    });
    return true;
  }

  public deleteSlideTemplate(id: string): boolean {
    const template = this.slideTemplates.get(id);
    if (!template || !template.isCustom) return false;
    
    return this.slideTemplates.delete(id);
  }

  private initializeDefaultThemes(): void {
    const themes: Theme[] = [
      {
        id: 'default',
        name: 'Default',
        description: 'Clean and simple default theme',
        colors: {
          primary: { r: 59, g: 130, b: 246 },
          secondary: { r: 107, g: 114, b: 128 },
          accent: { r: 16, g: 185, b: 129 },
          background: { r: 255, g: 255, b: 255 },
          text: { r: 17, g: 24, b: 39 },
        },
        fonts: {
          heading: 'Inter',
          body: 'Inter',
          monospace: 'JetBrains Mono',
        },
        latexClass: 'beamer',
        latexOptions: { theme: 'default' },
      },
      {
        id: 'professional',
        name: 'Professional',
        description: 'Corporate and professional presentation theme',
        colors: {
          primary: { r: 30, g: 58, b: 138 },
          secondary: { r: 71, g: 85, b: 105 },
          accent: { r: 239, g: 68, b: 68 },
          background: { r: 248, g: 250, b: 252 },
          text: { r: 15, g: 23, b: 42 },
        },
        fonts: {
          heading: 'Roboto',
          body: 'Open Sans',
          monospace: 'Source Code Pro',
        },
        latexClass: 'beamer',
        latexOptions: { theme: 'Madrid', colortheme: 'beaver' },
      },
      {
        id: 'academic',
        name: 'Academic',
        description: 'Traditional academic presentation theme',
        colors: {
          primary: { r: 127, g: 29, b: 29 },
          secondary: { r: 75, g: 85, b: 99 },
          accent: { r: 245, g: 158, b: 11 },
          background: { r: 255, g: 255, b: 255 },
          text: { r: 31, g: 41, b: 55 },
        },
        fonts: {
          heading: 'Times New Roman',
          body: 'Times New Roman',
          monospace: 'Courier New',
        },
        latexClass: 'beamer',
        latexOptions: { theme: 'Warsaw', colortheme: 'seahorse', fonttheme: 'serif' },
      },
      {
        id: 'modern',
        name: 'Modern',
        description: 'Contemporary design with bold colors',
        colors: {
          primary: { r: 99, g: 102, b: 241 },
          secondary: { r: 156, g: 163, b: 175 },
          accent: { r: 236, g: 72, b: 153 },
          background: { r: 17, g: 24, b: 39 },
          text: { r: 243, g: 244, b: 246 },
        },
        fonts: {
          heading: 'Montserrat',
          body: 'Lato',
          monospace: 'Fira Code',
        },
        latexClass: 'beamer',
        latexOptions: { theme: 'metropolis' },
      },
      {
        id: 'minimal',
        name: 'Minimal',
        description: 'Clean and minimal design',
        colors: {
          primary: { r: 55, g: 65, b: 81 },
          secondary: { r: 156, g: 163, b: 175 },
          accent: { r: 34, g: 197, b: 94 },
          background: { r: 255, g: 255, b: 255 },
          text: { r: 17, g: 24, b: 39 },
        },
        fonts: {
          heading: 'Helvetica',
          body: 'Helvetica',
          monospace: 'Monaco',
        },
        latexClass: 'beamer',
        latexOptions: { theme: 'default' },
      },
    ];

    themes.forEach(theme => this.themes.set(theme.id, theme));
  }

  private initializeDefaultSlideTemplates(): void {
    const templates: SlideTemplate[] = [
      {
        id: 'title-slide',
        name: 'Title Slide',
        description: 'Standard title slide with centered content',
        layout: {
          name: 'title-slide',
          template: 'title-only',
          regions: {
            title: { x: 100, y: 250, width: 600, height: 100 },
            content: { x: 100, y: 350, width: 600, height: 100 },
          },
        },
        defaultElements: [
          {
            type: 'text',
            position: { x: 100, y: 250 },
            size: { width: 600, height: 100 },
            content: 'Presentation Title',
            properties: {
              fontSize: 32,
              fontWeight: 'bold',
              textAlign: 'center',
              textColor: { r: 17, g: 24, b: 39 },
            },
          },
          {
            type: 'text',
            position: { x: 100, y: 350 },
            size: { width: 600, height: 50 },
            content: 'Subtitle or Author',
            properties: {
              fontSize: 18,
              textAlign: 'center',
              textColor: { r: 107, g: 114, b: 128 },
            },
          },
        ],
      },
      {
        id: 'content-slide',
        name: 'Content Slide',
        description: 'Standard slide with title and content area',
        layout: {
          name: 'content-slide',
          template: 'title-content',
          regions: {
            title: { x: 50, y: 50, width: 700, height: 60 },
            content: { x: 50, y: 130, width: 700, height: 420 },
          },
        },
        defaultElements: [
          {
            type: 'text',
            position: { x: 50, y: 50 },
            size: { width: 700, height: 60 },
            content: 'Slide Title',
            properties: {
              fontSize: 24,
              fontWeight: 'bold',
              textColor: { r: 17, g: 24, b: 39 },
            },
          },
        ],
      },
      {
        id: 'two-column',
        name: 'Two Column',
        description: 'Slide with two equal columns',
        layout: {
          name: 'two-column',
          template: 'two-column',
          regions: {
            title: { x: 50, y: 50, width: 700, height: 60 },
            content: { x: 50, y: 130, width: 340, height: 420 },
            footer: { x: 410, y: 130, width: 340, height: 420 },
          },
        },
        defaultElements: [
          {
            type: 'text',
            position: { x: 50, y: 50 },
            size: { width: 700, height: 60 },
            content: 'Slide Title',
            properties: {
              fontSize: 24,
              fontWeight: 'bold',
              textColor: { r: 17, g: 24, b: 39 },
            },
          },
        ],
      },
      {
        id: 'image-focus',
        name: 'Image Focus',
        description: 'Layout optimized for large images',
        layout: {
          name: 'image-focus',
          template: 'image-focus',
          regions: {
            title: { x: 50, y: 50, width: 700, height: 60 },
            content: { x: 50, y: 130, width: 700, height: 420 },
          },
        },
        defaultElements: [
          {
            type: 'text',
            position: { x: 50, y: 50 },
            size: { width: 700, height: 60 },
            content: 'Image Title',
            properties: {
              fontSize: 24,
              fontWeight: 'bold',
              textColor: { r: 17, g: 24, b: 39 },
            },
          },
        ],
      },
      {
        id: 'section-divider',
        name: 'Section Divider',
        description: 'Section break slide with large centered text',
        layout: {
          name: 'section-divider',
          template: 'full-content',
          regions: {
            content: { x: 100, y: 200, width: 600, height: 200 },
          },
        },
        defaultElements: [
          {
            type: 'text',
            position: { x: 100, y: 250 },
            size: { width: 600, height: 100 },
            content: 'Section Title',
            properties: {
              fontSize: 36,
              fontWeight: 'bold',
              textAlign: 'center',
              textColor: { r: 59, g: 130, b: 246 },
            },
          },
        ],
      },
      {
        id: 'comparison',
        name: 'Comparison',
        description: 'Side-by-side comparison layout',
        layout: {
          name: 'comparison',
          template: 'two-column',
          regions: {
            title: { x: 50, y: 50, width: 700, height: 60 },
            content: { x: 50, y: 130, width: 340, height: 420 },
            footer: { x: 410, y: 130, width: 340, height: 420 },
          },
        },
        defaultElements: [
          {
            type: 'text',
            position: { x: 50, y: 50 },
            size: { width: 700, height: 60 },
            content: 'Comparison',
            properties: {
              fontSize: 24,
              fontWeight: 'bold',
              textColor: { r: 17, g: 24, b: 39 },
            },
          },
          {
            type: 'text',
            position: { x: 50, y: 130 },
            size: { width: 340, height: 40 },
            content: 'Option A',
            properties: {
              fontSize: 18,
              fontWeight: 'bold',
              textAlign: 'center',
              textColor: { r: 59, g: 130, b: 246 },
            },
          },
          {
            type: 'text',
            position: { x: 410, y: 130 },
            size: { width: 340, height: 40 },
            content: 'Option B',
            properties: {
              fontSize: 18,
              fontWeight: 'bold',
              textAlign: 'center',
              textColor: { r: 239, g: 68, b: 68 },
            },
          },
        ],
      },
    ];

    templates.forEach(template => this.slideTemplates.set(template.id, template));
  }
}

// Export singleton instance
export const templateService = new TemplateService();