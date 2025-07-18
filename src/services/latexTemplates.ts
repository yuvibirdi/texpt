import { Theme, Color } from '../types/presentation';

export interface LaTeXThemeTemplate {
  id: string;
  name: string;
  description: string;
  beamerTheme: string;
  colorTheme?: string;
  fontTheme?: string;
  customColors?: Record<string, Color>;
  customCommands?: string[];
  preambleAdditions?: string;
}

export interface LaTeXSlideTemplate {
  id: string;
  name: string;
  description: string;
  frameOptions?: string;
  layout: 'title-only' | 'title-content' | 'two-column' | 'full-content' | 'custom';
  tikzTemplate?: string;
  regions: {
    title?: { x: number; y: number; width: number; height: number };
    content?: { x: number; y: number; width: number; height: number };
    leftColumn?: { x: number; y: number; width: number; height: number };
    rightColumn?: { x: number; y: number; width: number; height: number };
    footer?: { x: number; y: number; width: number; height: number };
  };
}

/**
 * LaTeX Template Manager for handling themes and slide layouts
 */
export class LaTeXTemplateManager {
  private themeTemplates: Map<string, LaTeXThemeTemplate> = new Map();
  private slideTemplates: Map<string, LaTeXSlideTemplate> = new Map();

  constructor() {
    this.initializeDefaultThemes();
    this.initializeDefaultSlideTemplates();
  }

  /**
   * Get all available theme templates
   */
  public getThemeTemplates(): LaTeXThemeTemplate[] {
    return Array.from(this.themeTemplates.values());
  }

  /**
   * Get all available slide templates
   */
  public getSlideTemplates(): LaTeXSlideTemplate[] {
    return Array.from(this.slideTemplates.values());
  }

  /**
   * Get specific theme template
   */
  public getThemeTemplate(id: string): LaTeXThemeTemplate | undefined {
    return this.themeTemplates.get(id);
  }

  /**
   * Get specific slide template
   */
  public getSlideTemplate(id: string): LaTeXSlideTemplate | undefined {
    return this.slideTemplates.get(id);
  }

  /**
   * Add custom theme template
   */
  public addThemeTemplate(template: LaTeXThemeTemplate): void {
    this.themeTemplates.set(template.id, template);
  }

  /**
   * Add custom slide template
   */
  public addSlideTemplate(template: LaTeXSlideTemplate): void {
    this.slideTemplates.set(template.id, template);
  }

  /**
   * Generate LaTeX preamble for a theme template
   */
  public generateThemePreamble(template: LaTeXThemeTemplate, appTheme: Theme): string {
    let preamble = '';

    // Apply Beamer theme
    preamble += `\\usetheme{${template.beamerTheme}}\n`;

    if (template.colorTheme) {
      preamble += `\\usecolortheme{${template.colorTheme}}\n`;
    }

    if (template.fontTheme) {
      preamble += `\\usefonttheme{${template.fontTheme}}\n`;
    }

    // Define custom colors from app theme
    preamble += this.generateColorDefinitions(appTheme, template.customColors);

    // Add custom commands
    if (template.customCommands) {
      preamble += template.customCommands.join('\n') + '\n';
    }

    // Add preamble additions
    if (template.preambleAdditions) {
      preamble += template.preambleAdditions + '\n';
    }

    return preamble;
  }

  /**
   * Generate slide frame with template layout
   */
  public generateSlideFrame(
    template: LaTeXSlideTemplate,
    title: string,
    content: string,
    options?: string
  ): string {
    let frame = '';

    const frameOptions = [template.frameOptions, options].filter(Boolean).join(',');
    const frameStart = frameOptions 
      ? `\\begin{frame}[${frameOptions}]{${this.escapeLatex(title)}}`
      : `\\begin{frame}{${this.escapeLatex(title)}}`;

    frame += frameStart + '\n';

    switch (template.layout) {
      case 'title-only':
        frame += this.generateTitleOnlyLayout(content);
        break;
      case 'title-content':
        frame += this.generateTitleContentLayout(content);
        break;
      case 'two-column':
        frame += this.generateTwoColumnLayout(content);
        break;
      case 'full-content':
        frame += this.generateFullContentLayout(content);
        break;
      case 'custom':
        if (template.tikzTemplate) {
          frame += template.tikzTemplate.replace('%CONTENT%', content);
        } else {
          frame += content;
        }
        break;
      default:
        frame += content;
    }

    frame += '\n\\end{frame}';
    return frame;
  }

  /**
   * Initialize default theme templates
   */
  private initializeDefaultThemes(): void {
    // Default theme
    this.themeTemplates.set('default', {
      id: 'default',
      name: 'Default',
      description: 'Clean and simple default Beamer theme',
      beamerTheme: 'default',
    });

    // Madrid theme
    this.themeTemplates.set('madrid', {
      id: 'madrid',
      name: 'Madrid',
      description: 'Professional theme with navigation bars',
      beamerTheme: 'Madrid',
      colorTheme: 'default',
    });

    // Berlin theme
    this.themeTemplates.set('berlin', {
      id: 'berlin',
      name: 'Berlin',
      description: 'Modern theme with sidebar navigation',
      beamerTheme: 'Berlin',
      colorTheme: 'default',
    });

    // Metropolis theme (modern)
    this.themeTemplates.set('metropolis', {
      id: 'metropolis',
      name: 'Metropolis',
      description: 'Modern, minimal theme inspired by Material Design',
      beamerTheme: 'metropolis',
      preambleAdditions: `
\\metroset{block=fill}
\\setbeamercolor{background canvas}{bg=white}
\\setbeamercolor{progress bar}{fg=blue!50!black}`,
    });

    // Academic theme
    this.themeTemplates.set('academic', {
      id: 'academic',
      name: 'Academic',
      description: 'Traditional academic presentation theme',
      beamerTheme: 'Warsaw',
      colorTheme: 'seahorse',
      fontTheme: 'serif',
    });

    // Corporate theme
    this.themeTemplates.set('corporate', {
      id: 'corporate',
      name: 'Corporate',
      description: 'Professional corporate presentation theme',
      beamerTheme: 'CambridgeUS',
      colorTheme: 'beaver',
      customCommands: [
        '\\setbeamertemplate{navigation symbols}{}',
        '\\setbeamertemplate{footline}[frame number]',
      ],
    });
  }

  /**
   * Initialize default slide templates
   */
  private initializeDefaultSlideTemplates(): void {
    // Title slide template
    this.slideTemplates.set('title-slide', {
      id: 'title-slide',
      name: 'Title Slide',
      description: 'Standard title slide layout',
      layout: 'title-only',
      regions: {
        title: { x: 0, y: 0, width: 100, height: 100 },
      },
    });

    // Standard content slide
    this.slideTemplates.set('content', {
      id: 'content',
      name: 'Content Slide',
      description: 'Standard slide with title and content area',
      layout: 'title-content',
      regions: {
        title: { x: 5, y: 85, width: 90, height: 10 },
        content: { x: 5, y: 10, width: 90, height: 70 },
      },
    });

    // Two column layout
    this.slideTemplates.set('two-column', {
      id: 'two-column',
      name: 'Two Column',
      description: 'Slide with two equal columns',
      layout: 'two-column',
      regions: {
        title: { x: 5, y: 85, width: 90, height: 10 },
        leftColumn: { x: 5, y: 10, width: 42.5, height: 70 },
        rightColumn: { x: 52.5, y: 10, width: 42.5, height: 70 },
      },
    });

    // Full content (no title)
    this.slideTemplates.set('full-content', {
      id: 'full-content',
      name: 'Full Content',
      description: 'Full slide content without title',
      layout: 'full-content',
      regions: {
        content: { x: 5, y: 5, width: 90, height: 90 },
      },
    });

    // Image focus layout
    this.slideTemplates.set('image-focus', {
      id: 'image-focus',
      name: 'Image Focus',
      description: 'Layout optimized for large images',
      layout: 'custom',
      tikzTemplate: `
\\begin{tikzpicture}[remember picture,overlay]
  \\node[anchor=north west] at (0.5cm,-1cm) {
    \\begin{minipage}{0.6\\textwidth}
      %CONTENT%
    \\end{minipage}
  };
\\end{tikzpicture}`,
      regions: {
        title: { x: 5, y: 90, width: 60, height: 8 },
        content: { x: 5, y: 15, width: 60, height: 70 },
      },
    });
  }

  /**
   * Generate layout-specific content
   */
  private generateTitleOnlyLayout(content: string): string {
    return `\\begin{center}\n${content}\n\\end{center}`;
  }

  private generateTitleContentLayout(content: string): string {
    return content;
  }

  private generateTwoColumnLayout(content: string): string {
    return `\\begin{columns}
\\begin{column}{0.48\\textwidth}
${content}
\\end{column}
\\begin{column}{0.48\\textwidth}
% Right column content
\\end{column}
\\end{columns}`;
  }

  private generateFullContentLayout(content: string): string {
    return `\\begin{center}\n${content}\n\\end{center}`;
  }

  /**
   * Generate color definitions
   */
  private generateColorDefinitions(appTheme: Theme, customColors?: Record<string, Color>): string {
    let colors = '';

    // App theme colors
    Object.entries(appTheme.colors).forEach(([name, color]) => {
      colors += `\\definecolor{${name}}{RGB}{${Math.round(color.r)},${Math.round(color.g)},${Math.round(color.b)}}\n`;
    });

    // Custom template colors
    if (customColors) {
      Object.entries(customColors).forEach(([name, color]) => {
        colors += `\\definecolor{${name}}{RGB}{${Math.round(color.r)},${Math.round(color.g)},${Math.round(color.b)}}\n`;
      });
    }

    // Set Beamer colors
    colors += `\\setbeamercolor{structure}{fg=primary}\n`;
    colors += `\\setbeamercolor{title}{fg=text}\n`;
    colors += `\\setbeamercolor{frametitle}{fg=text}\n`;
    colors += `\\setbeamercolor{normal text}{fg=text,bg=background}\n`;

    return colors;
  }

  /**
   * Escape LaTeX special characters
   */
  private escapeLatex(text: string): string {
    return text
      .replace(/\\/g, '\\textbackslash{}')
      .replace(/[{}]/g, '\\$&')
      .replace(/[$&%#^_~]/g, '\\$&');
  }
}

// Export singleton instance
export const latexTemplateManager = new LaTeXTemplateManager();