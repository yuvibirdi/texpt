import {
  Presentation,
  Slide,
  SlideElement,
  Theme,
  Color,
  ElementType,
  ShapeType,
  ShapeConnection,
} from '../types/presentation';

export interface LaTeXGenerationOptions {
  includePackages?: boolean;
  includeDocumentClass?: boolean;
  optimizeCode?: boolean;
  minifyOutput?: boolean;
}

export interface LaTeXTemplate {
  id: string;
  name: string;
  documentClass: string;
  packages: string[];
  preamble: string;
  frameTemplate: string;
  titleSlideTemplate?: string;
}

/**
 * Core LaTeX code generation service for converting presentation elements to Beamer code
 */
export class LaTeXGenerator {
  private templates: Map<string, LaTeXTemplate> = new Map();
  
  constructor() {
    this.initializeDefaultTemplates();
  }

  /**
   * Generate complete LaTeX document from presentation
   */
  public generateDocument(presentation: Presentation, options: LaTeXGenerationOptions = {}): string {
    const opts = {
      includePackages: true,
      includeDocumentClass: true,
      optimizeCode: true,
      minifyOutput: false,
      ...options,
    };

    let latex = '';

    if (opts.includeDocumentClass) {
      latex += this.generateDocumentClass(presentation.theme);
      latex += '\n\n';
    }

    if (opts.includePackages) {
      latex += this.generatePackages(presentation);
      latex += '\n\n';
    }

    latex += this.generatePreamble(presentation);
    latex += '\n\n';

    latex += '\\begin{document}\n\n';

    // Generate title slide if metadata exists
    if (presentation.metadata.title) {
      latex += this.generateTitleSlide(presentation);
      latex += '\n\n';
    }

    // Generate content slides
    for (const slide of presentation.slides) {
      latex += this.generateSlide(slide, presentation.theme);
      latex += '\n\n';
    }

    latex += '\\end{document}';

    if (opts.optimizeCode) {
      latex = this.optimizeCode(latex);
    }

    if (opts.minifyOutput) {
      latex = this.minifyCode(latex);
    }

    return latex;
  }

  /**
   * Generate LaTeX code for a single slide
   */
  public generateSlide(slide: Slide, theme: Theme): string {
    let latex = `% Slide: ${slide.title}\n`;
    latex += `\\begin{frame}{${this.escapeLatex(slide.title)}}\n`;

    // Add slide background if not default
    if (slide.background.type !== 'color' || !this.isDefaultBackgroundColor(slide.background.color)) {
      latex += this.generateBackground(slide.background);
    }

    // Sort elements by z-index for proper layering
    const sortedElements = [...slide.elements].sort((a, b) => 
      (a.properties.zIndex || 0) - (b.properties.zIndex || 0)
    );

    // Generate elements
    for (const element of sortedElements) {
      latex += this.generateElement(element, theme);
    }

    // Generate connections between shapes
    if (slide.connections.length > 0) {
      latex += this.generateConnections(slide.connections, slide.elements);
    }

    latex += '\\end{frame}';
    return latex;
  }

  /**
   * Generate LaTeX code for a single element
   */
  public generateElement(element: SlideElement, theme: Theme): string {
    switch (element.type) {
      case 'text':
        return this.generateTextElement(element, theme);
      case 'image':
        return this.generateImageElement(element);
      case 'shape':
        return this.generateShapeElement(element, theme);
      default:
        return `% Unsupported element type: ${element.type}\n`;
    }
  }

  /**
   * Generate document class with theme options
   */
  private generateDocumentClass(theme: Theme): string {
    const options = [
      'aspectratio=169', // 16:9 aspect ratio
      'xcolor=dvipsnames',
      'professionalfonts',
    ];

    if (theme.latexOptions) {
      Object.entries(theme.latexOptions).forEach(([key, value]) => {
        // Avoid duplicate options
        if (!options.some(opt => opt.startsWith(`${key}=`))) {
          options.push(`${key}=${value}`);
        }
      });
    }

    return `\\documentclass[${options.join(',')}]{${theme.latexClass || 'beamer'}}`;
  }

  /**
   * Generate required packages
   */
  private generatePackages(presentation: Presentation): string {
    const packages = [
      'inputenc',
      'fontenc',
      'babel',
      'amsmath',
      'amsfonts',
      'amssymb',
      'graphicx',
      'tikz',
      'xcolor',
      'hyperref',
    ];

    // Add conditional packages based on content
    const hasImages = presentation.slides.some(slide => 
      slide.elements.some(element => element.type === 'image')
    );
    if (hasImages) {
      packages.push('adjustbox');
    }

    const hasMath = presentation.slides.some(slide =>
      slide.elements.some(element => element.properties.hasMath)
    );
    if (hasMath) {
      packages.push('mathtools', 'unicode-math');
    }

    return packages.map(pkg => `\\usepackage{${pkg}}`).join('\n');
  }

  /**
   * Generate preamble with theme configuration
   */
  private generatePreamble(presentation: Presentation): string {
    const { theme, metadata } = presentation;
    let preamble = '';

    // Theme colors
    preamble += this.generateColorDefinitions(theme);
    preamble += '\n';

    // Font configuration
    preamble += this.generateFontConfiguration(theme);
    preamble += '\n';

    // Beamer theme setup
    preamble += '\\usetheme{default}\n';
    preamble += '\\usecolortheme[named=primary]{structure}\n';
    preamble += '\n';

    // TikZ libraries for shapes and connections
    preamble += '\\usetikzlibrary{shapes.geometric,arrows.meta,positioning,calc}\n';
    preamble += '\n';

    // Document metadata
    if (metadata.title) {
      preamble += `\\title{${this.escapeLatex(metadata.title)}}\n`;
    }
    if (metadata.subtitle) {
      preamble += `\\subtitle{${this.escapeLatex(metadata.subtitle)}}\n`;
    }
    if (metadata.author) {
      preamble += `\\author{${this.escapeLatex(metadata.author)}}\n`;
    }
    if (metadata.institution) {
      preamble += `\\institute{${this.escapeLatex(metadata.institution)}}\n`;
    }
    if (metadata.date) {
      preamble += `\\date{${metadata.date.toLocaleDateString()}}\n`;
    }

    return preamble;
  }

  /**
   * Generate color definitions from theme
   */
  private generateColorDefinitions(theme: Theme): string {
    let colors = '';
    
    Object.entries(theme.colors).forEach(([name, color]) => {
      const rgb = this.colorToRgb(color);
      colors += `\\definecolor{${name}}{RGB}{${rgb.r},${rgb.g},${rgb.b}}\n`;
    });

    return colors;
  }

  /**
   * Generate font configuration
   */
  private generateFontConfiguration(theme: Theme): string {
    let fonts = '';
    
    if (theme.fonts.heading) {
      fonts += `\\setbeamerfont{title}{family=\\${this.mapFontFamily(theme.fonts.heading)}}\n`;
      fonts += `\\setbeamerfont{frametitle}{family=\\${this.mapFontFamily(theme.fonts.heading)}}\n`;
    }
    
    if (theme.fonts.body) {
      fonts += `\\setbeamerfont{normal text}{family=\\${this.mapFontFamily(theme.fonts.body)}}\n`;
    }

    return fonts;
  }

  /**
   * Generate title slide
   */
  private generateTitleSlide(presentation: Presentation): string {
    return '\\begin{frame}\n\\titlepage\n\\end{frame}';
  }

  /**
   * Generate text element LaTeX code
   */
  private generateTextElement(element: SlideElement, theme: Theme): string {
    const { position, size, properties, content } = element;
    
    let latex = '\n% Text Element\n';
    latex += '\\begin{tikzpicture}[remember picture,overlay]\n';
    
    // Calculate position (convert from pixels to LaTeX coordinates)
    const x = this.pixelsToLatex(position.x);
    const y = this.pixelsToLatex(position.y, true); // Invert Y for LaTeX
    const width = this.pixelsToLatex(size.width);
    
    // Text formatting options
    const textOptions = [];
    
    if (properties.textAlign) {
      textOptions.push(`align=${properties.textAlign}`);
    }
    
    if (properties.textColor) {
      const colorName = this.getOrDefineColor(properties.textColor);
      textOptions.push(`text=${colorName}`);
    }
    
    if (properties.fontSize) {
      textOptions.push(`font=\\fontsize{${properties.fontSize}}{${properties.fontSize * 1.2}}\\selectfont`);
    }
    
    if (properties.fontWeight === 'bold') {
      textOptions.push('font=\\bfseries');
    }
    
    if (properties.fontStyle === 'italic') {
      textOptions.push('font=\\itshape');
    }

    const nodeOptions = [
      `anchor=north west`,
      `text width=${width}cm`,
      ...textOptions
    ].join(',');

    latex += `\\node[${nodeOptions}] at (${x}cm,${y}cm) {\n`;
    
    // Process content based on list type
    if (properties.listType && properties.listType !== 'none' && content) {
      latex += this.generateListContent(content, properties);
    } else if (properties.hasMath && content) {
      latex += this.processMathContent(content);
    } else if (content) {
      latex += this.escapeLatex(content);
    }
    
    latex += '\n};\n';
    latex += '\\end{tikzpicture}\n';
    
    return latex;
  }

  /**
   * Generate image element LaTeX code
   */
  private generateImageElement(element: SlideElement): string {
    const { position, size, properties, content } = element;
    
    if (!content) return '% Image element without source\n';
    
    let latex = '\n% Image Element\n';
    latex += '\\begin{tikzpicture}[remember picture,overlay]\n';
    
    const x = this.pixelsToLatex(position.x);
    const y = this.pixelsToLatex(position.y, true);
    const width = this.pixelsToLatex(size.width);
    const height = this.pixelsToLatex(size.height);
    
    const imageOptions = [`width=${width}cm`, `height=${height}cm`];
    
    if (properties.crop) {
      const { crop } = properties;
      imageOptions.push(`trim=${crop.x} ${crop.y} ${crop.width} ${crop.height}`);
      imageOptions.push('clip');
    }
    
    latex += `\\node[anchor=north west] at (${x}cm,${y}cm) {\n`;
    latex += `\\includegraphics[${imageOptions.join(',')}]{${content}}\n`;
    latex += '};\n';
    latex += '\\end{tikzpicture}\n';
    
    return latex;
  }

  /**
   * Generate shape element LaTeX code using TikZ
   */
  private generateShapeElement(element: SlideElement, theme: Theme): string {
    const { position, size, properties } = element;
    
    let latex = '\n% Shape Element\n';
    latex += '\\begin{tikzpicture}[remember picture,overlay]\n';
    
    const x = this.pixelsToLatex(position.x);
    const y = this.pixelsToLatex(position.y, true);
    const width = this.pixelsToLatex(size.width);
    const height = this.pixelsToLatex(size.height);
    
    const shapeOptions = [];
    
    if (properties.fillColor) {
      const fillColor = this.getOrDefineColor(properties.fillColor);
      shapeOptions.push(`fill=${fillColor}`);
    }
    
    if (properties.strokeColor) {
      const strokeColor = this.getOrDefineColor(properties.strokeColor);
      shapeOptions.push(`draw=${strokeColor}`);
    }
    
    if (properties.strokeWidth) {
      shapeOptions.push(`line width=${properties.strokeWidth}pt`);
    }
    
    const shapeType = properties.shapeType || 'rectangle';
    
    switch (shapeType) {
      case 'rectangle':
        latex += this.generateRectangle(x, y, width, height, shapeOptions, properties);
        break;
      case 'circle':
        latex += this.generateCircle(x, y, Math.min(width, height) / 2, shapeOptions);
        break;
      case 'ellipse':
        latex += this.generateEllipse(x, y, width / 2, height / 2, shapeOptions);
        break;
      case 'line':
        latex += this.generateLine(x, y, x + width, y - height, shapeOptions, properties);
        break;
      case 'arrow':
        latex += this.generateArrow(x, y, x + width, y - height, shapeOptions, properties);
        break;
      default:
        latex += `% Unsupported shape type: ${shapeType}\n`;
    }
    
    latex += '\\end{tikzpicture}\n';
    
    return latex;
  }

  /**
   * Generate connections between shapes
   */
  private generateConnections(connections: ShapeConnection[], elements: SlideElement[]): string {
    let latex = '\n% Shape Connections\n';
    latex += '\\begin{tikzpicture}[remember picture,overlay]\n';
    
    for (const connection of connections) {
      const fromElement = elements.find(e => e.id === connection.fromElementId);
      const toElement = elements.find(e => e.id === connection.toElementId);
      
      if (!fromElement || !toElement) continue;
      
      const fromPos = this.getConnectionPoint(fromElement, connection.fromConnectionPointId);
      const toPos = this.getConnectionPoint(toElement, connection.toConnectionPointId);
      
      const connectionOptions = [];
      
      if (connection.style.strokeColor) {
        const color = this.getOrDefineColor(connection.style.strokeColor);
        connectionOptions.push(`draw=${color}`);
      }
      
      if (connection.style.strokeWidth) {
        connectionOptions.push(`line width=${connection.style.strokeWidth}pt`);
      }
      
      if (connection.style.arrowType && connection.style.arrowType !== 'none') {
        connectionOptions.push(`-{${this.mapArrowType(connection.style.arrowType)}}`);
      }
      
      latex += `\\draw[${connectionOptions.join(',')}] (${fromPos.x}cm,${fromPos.y}cm) -- (${toPos.x}cm,${toPos.y}cm);\n`;
    }
    
    latex += '\\end{tikzpicture}\n';
    
    return latex;
  }

  // Helper methods for shape generation
  private generateRectangle(x: number, y: number, width: number, height: number, options: string[], properties: any): string {
    const cornerRadius = properties.cornerRadius ? `, rounded corners=${properties.cornerRadius}pt` : '';
    return `\\draw[${options.join(',')}${cornerRadius}] (${x}cm,${y}cm) rectangle (${x + width}cm,${y - height}cm);\n`;
  }

  private generateCircle(x: number, y: number, radius: number, options: string[]): string {
    const centerX = x + radius;
    const centerY = y - radius;
    return `\\draw[${options.join(',')}] (${centerX}cm,${centerY}cm) circle (${this.pixelsToLatex(radius)}cm);\n`;
  }

  private generateEllipse(x: number, y: number, radiusX: number, radiusY: number, options: string[]): string {
    const centerX = x + radiusX;
    const centerY = y - radiusY;
    return `\\draw[${options.join(',')}] (${centerX}cm,${centerY}cm) ellipse (${this.pixelsToLatex(radiusX)}cm and ${this.pixelsToLatex(radiusY)}cm);\n`;
  }

  private generateLine(x1: number, y1: number, x2: number, y2: number, options: string[], properties: any): string {
    return `\\draw[${options.join(',')}] (${x1}cm,${y1}cm) -- (${x2}cm,${y2}cm);\n`;
  }

  private generateArrow(x1: number, y1: number, x2: number, y2: number, options: string[], properties: any): string {
    const arrowOptions = [...options];
    if (!arrowOptions.some(opt => opt.includes('->'))) {
      arrowOptions.push('-{Stealth}');
    }
    return `\\draw[${arrowOptions.join(',')}] (${x1}cm,${y1}cm) -- (${x2}cm,${y2}cm);\n`;
  }

  // Utility methods
  private pixelsToLatex(pixels: number, invertY: boolean = false): number {
    // Convert pixels to cm (assuming 96 DPI)
    const cm = pixels / 37.795275591;
    return invertY ? -cm : cm;
  }

  private colorToRgb(color: Color): { r: number; g: number; b: number } {
    return {
      r: Math.round(color.r),
      g: Math.round(color.g),
      b: Math.round(color.b),
    };
  }

  private getOrDefineColor(color: Color): string {
    const rgb = this.colorToRgb(color);
    const colorName = `color${rgb.r}${rgb.g}${rgb.b}`;
    // In a real implementation, we'd track defined colors to avoid redefinition
    return colorName;
  }

  private mapFontFamily(fontFamily: string): string {
    const fontMap: Record<string, string> = {
      'Inter': 'sffamily',
      'Times': 'rmfamily',
      'JetBrains Mono': 'ttfamily',
      'Arial': 'sffamily',
      'Helvetica': 'sffamily',
    };
    return fontMap[fontFamily] || 'sffamily';
  }

  private mapArrowType(arrowType: string): string {
    const arrowMap: Record<string, string> = {
      'arrow': 'Stealth',
      'diamond': 'Diamond',
      'circle': 'Circle',
    };
    return arrowMap[arrowType] || 'Stealth';
  }

  private escapeLatex(text: string): string {
    return text
      .replace(/\\/g, '\\textbackslash{}')
      .replace(/[{}]/g, '\\$&')
      .replace(/[$&%#^_~]/g, '\\$&');
  }

  private processMathContent(content: string): string {
    // Process math content while preserving LaTeX math delimiters
    // Convert display math $$ to \[ \] and inline math $ to \( \) only if needed
    // For now, keep original format to maintain compatibility
    return content;
  }

  /**
   * Generate LaTeX list content from text content and list properties
   */
  private generateListContent(content: string, properties: any): string {
    const { listType, listStyle, listIndentLevel, customBulletSymbol } = properties;
    
    // Split content into lines for list items
    const lines = content.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) return '';
    
    let latex = '';
    const indentLevel = listIndentLevel || 0;
    
    // Generate appropriate list environment based on type
    if (listType === 'bullet') {
      latex += this.generateBulletList(lines, listStyle, indentLevel, customBulletSymbol);
    } else if (listType === 'numbered') {
      latex += this.generateNumberedList(lines, listStyle, indentLevel);
    }
    
    return latex;
  }

  /**
   * Generate bullet list LaTeX code
   */
  private generateBulletList(items: string[], style: string, indentLevel: number, customSymbol?: string): string {
    let latex = '';
    
    // Determine bullet symbol based on style and indent level
    let bulletSymbol = this.getBulletSymbol(style, indentLevel, customSymbol);
    
    // Use itemize environment with custom bullet
    latex += '\\begin{itemize}\n';
    
    if (bulletSymbol !== '\\textbullet') {
      latex += `\\renewcommand{\\labelitemi}{${bulletSymbol}}\n`;
    }
    
    // Add indentation for nested lists
    if (indentLevel > 0) {
      latex += `\\addtolength{\\leftmargini}{${indentLevel * 0.5}cm}\n`;
    }
    
    // Generate list items
    for (const item of items) {
      latex += `\\item ${this.escapeLatex(item.trim())}\n`;
    }
    
    latex += '\\end{itemize}';
    
    return latex;
  }

  /**
   * Generate numbered list LaTeX code
   */
  private generateNumberedList(items: string[], style: string, indentLevel: number): string {
    let latex = '';
    
    // Use enumerate environment with custom numbering
    latex += '\\begin{enumerate}\n';
    
    // Set numbering style
    const numberingStyle = this.getNumberingStyle(style);
    if (numberingStyle !== '\\arabic*.') {
      latex += `\\renewcommand{\\labelenumi}{${numberingStyle}}\n`;
    }
    
    // Add indentation for nested lists
    if (indentLevel > 0) {
      latex += `\\addtolength{\\leftmargini}{${indentLevel * 0.5}cm}\n`;
    }
    
    // Generate list items
    for (const item of items) {
      latex += `\\item ${this.escapeLatex(item.trim())}\n`;
    }
    
    latex += '\\end{enumerate}';
    
    return latex;
  }

  /**
   * Get bullet symbol based on style and indent level
   */
  private getBulletSymbol(style: string, indentLevel: number, customSymbol?: string): string {
    if (style === 'custom' && customSymbol) {
      return this.escapeLatex(customSymbol);
    }
    
    // For different styles, use the base symbol regardless of indent level
    // Indent level affects spacing, not symbol choice for different styles
    const bulletMap: Record<string, string> = {
      'disc': '\\textbullet',
      'circle': '\\textopenbullet',
      'square': '\\textbullet', // LaTeX doesn't have a distinct square bullet, use textbullet
    };
    
    // For disc style, vary symbol by indent level (traditional nested list behavior)
    if (style === 'disc') {
      const discSymbols = ['\\textbullet', '\\textendash', '\\textasteriskcentered'];
      return discSymbols[Math.min(indentLevel, discSymbols.length - 1)];
    }
    
    return bulletMap[style] || bulletMap['disc'];
  }

  /**
   * Get numbering style for enumerate lists
   */
  private getNumberingStyle(style: string): string {
    const styleMap: Record<string, string> = {
      'decimal': '\\arabic*.',
      'lower-alpha': '\\alph*)',
      'upper-alpha': '\\Alph*)',
      'lower-roman': '\\roman*)',
      'upper-roman': '\\Roman*)',
    };
    
    return styleMap[style] || styleMap['decimal'];
  }

  private getConnectionPoint(element: SlideElement, pointId: string): { x: number; y: number } {
    // Simplified connection point calculation
    const centerX = this.pixelsToLatex(element.position.x + element.size.width / 2);
    const centerY = this.pixelsToLatex(element.position.y + element.size.height / 2, true);
    return { x: centerX, y: centerY };
  }

  private generateBackground(background: any): string {
    // Simplified background generation
    return '% Background styling would go here\n';
  }

  private isDefaultBackgroundColor(color: Color | undefined): boolean {
    if (!color) return true;
    return color.r === 255 && color.g === 255 && color.b === 255;
  }

  /**
   * Initialize default LaTeX templates
   */
  private initializeDefaultTemplates(): void {
    // Default Beamer template
    this.templates.set('default', {
      id: 'default',
      name: 'Default Beamer',
      documentClass: 'beamer',
      packages: ['inputenc', 'fontenc', 'amsmath', 'graphicx', 'tikz'],
      preamble: '\\usetheme{default}',
      frameTemplate: '\\begin{frame}{%TITLE%}\n%CONTENT%\n\\end{frame}',
      titleSlideTemplate: '\\begin{frame}\n\\titlepage\n\\end{frame}',
    });

    // Modern template
    this.templates.set('modern', {
      id: 'modern',
      name: 'Modern',
      documentClass: 'beamer',
      packages: ['inputenc', 'fontenc', 'amsmath', 'graphicx', 'tikz', 'xcolor'],
      preamble: '\\usetheme{metropolis}',
      frameTemplate: '\\begin{frame}{%TITLE%}\n%CONTENT%\n\\end{frame}',
    });
  }

  /**
   * Optimize generated LaTeX code
   */
  private optimizeCode(latex: string): string {
    // Remove excessive whitespace
    latex = latex.replace(/\n\s*\n\s*\n/g, '\n\n');
    
    // Remove trailing whitespace
    latex = latex.replace(/[ \t]+$/gm, '');
    
    // Optimize TikZ pictures by combining when possible
    // This is a simplified optimization
    
    return latex;
  }

  /**
   * Minify LaTeX code by removing comments and extra whitespace
   */
  private minifyCode(latex: string): string {
    // Remove comments (but preserve structure)
    latex = latex.replace(/^%.*$/gm, '');
    
    // Remove empty lines
    latex = latex.replace(/^\s*$/gm, '');
    
    // Compress multiple newlines
    latex = latex.replace(/\n+/g, '\n');
    
    return latex.trim();
  }

  /**
   * Get available templates
   */
  public getTemplates(): LaTeXTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Add custom template
   */
  public addTemplate(template: LaTeXTemplate): void {
    this.templates.set(template.id, template);
  }
}

// Export singleton instance
export const latexGenerator = new LaTeXGenerator();