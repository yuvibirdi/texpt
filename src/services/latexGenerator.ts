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
      '[utf8]{inputenc}',
      '[T1]{fontenc}',
      '{babel}',
      '{amsmath}',
      '{amsfonts}',
      '{amssymb}',
      '{graphicx}',
      '{tikz}',
      '{xcolor}',
      '{hyperref}',
      '[absolute,overlay]{textpos}',
    ];

    // Add conditional packages based on content
    const hasImages = presentation.slides.some(slide =>
      slide.elements.some(element => element.type === 'image')
    );
    if (hasImages) {
      packages.push('{adjustbox}');
    }

    const hasMath = presentation.slides.some(slide =>
      slide.elements.some(element => element.properties.hasMath)
    );
    if (hasMath) {
      packages.push('{mathtools}', '{unicode-math}');
    }

    return packages.map(pkg => `\\usepackage${pkg}`).join('\n');
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
   * Generate text element LaTeX code with proper font size and newline handling
   */
  private generateTextElement(element: SlideElement, theme: Theme): string {
    const { position, size, properties, content } = element;

    if (!content) return '% Empty text element\n';

    let latex = '\n% Text Element\n';

    // Convert coordinates directly from canvas to LaTeX
    const coords = this.convertCanvasToLatexCoordinates(position, size);

    // Apply text margins to coordinates (0.3cm from each edge)
    const TEXT_MARGIN = 0.3;
    const TEXT_LEFT_BOUNDARY = 0.2 + TEXT_MARGIN;   // 0.5cm
    const TEXT_RIGHT_BOUNDARY = 15.5 - TEXT_MARGIN; // 15.2cm
    
    // Adjust text position to respect margins
    const textX = Math.max(TEXT_LEFT_BOUNDARY, coords.x);

    // Calculate dynamic text block width based on font size and content
    let dynamicWidth = this.calculateTextBlockWidth(content, properties, coords.width);

    // Ensure the text block doesn't extend beyond the right boundary
    const maxX = textX + dynamicWidth;

    if (maxX > TEXT_RIGHT_BOUNDARY) {
      // Adjust width to fit within boundaries
      const adjustedWidth = TEXT_RIGHT_BOUNDARY - textX;
      console.log(`⚠️ [Width Adjustment] Text would exceed boundary. Original: ${dynamicWidth.toFixed(2)}cm, Adjusted: ${adjustedWidth.toFixed(2)}cm`);
      dynamicWidth = Math.max(0.8, adjustedWidth); // Ensure minimum width
    }

    // Text formatting options
    let textFormatting = '';

    if (properties.fontSize) {
      // Use proper font size with appropriate line spacing
      const lineSpacing = properties.fontSize * 1.2;
      textFormatting += `\\fontsize{${properties.fontSize}}{${lineSpacing}}\\selectfont`;
    }

    if (properties.fontWeight === 'bold') {
      textFormatting += '\\bfseries ';
    }

    if (properties.fontStyle === 'italic') {
      textFormatting += '\\itshape ';
    }

    if (properties.textColor) {
      const colorName = this.getOrDefineColor(properties.textColor);
      textFormatting += `\\color{${colorName}} `;
    }

    // Use textblock with dynamic width and margin-adjusted position
    latex += `\\begin{textblock*}{${dynamicWidth.toFixed(2)}cm}(${textX.toFixed(2)}cm,${coords.y.toFixed(2)}cm)\n`;

    if (textFormatting) {
      latex += `{${textFormatting}`;
    }

    // Process content - handle line breaks and wrapping properly
    let processedContent = '';
    if (properties.listType && properties.listType !== 'none' && content) {
      processedContent = this.generateListContent(content, properties);
    } else if (properties.hasMath && content) {
      processedContent = this.processMathContent(content);
    } else if (content) {
      // Handle newlines properly - use \\ for line breaks within textblock
      // Also handle automatic text wrapping by preserving spaces
      processedContent = this.processTextContent(content);
      
      // Get text alignment command
      let alignmentCommand = '';
      if (properties.textAlign === 'center') {
        alignmentCommand = '\\centering ';
      } else if (properties.textAlign === 'right') {
        alignmentCommand = '\\raggedleft ';
      } else {
        alignmentCommand = '\\raggedright ';
      }
      
      console.log('📐 [LaTeXGenerator] Text alignment:', {
        textAlign: properties.textAlign,
        alignmentCommand: alignmentCommand.trim(),
        hasLineBreaks: processedContent.includes('\\\\')
      });
      
      // If content has line breaks, wrap it in a minipage for proper line break handling
      if (processedContent.includes('\\\\')) {
        processedContent = `\\begin{minipage}[t]{${dynamicWidth.toFixed(2)}cm}\n${alignmentCommand}${processedContent}\n\\end{minipage}`;
      } else {
        // For single-line text, apply alignment directly
        processedContent = alignmentCommand + processedContent;
      }
    }

    latex += processedContent;

    if (textFormatting) {
      latex += '}';
    }

    latex += '\n\\end{textblock*}\n';

    return latex;
  }

  /**
   * Generate image element LaTeX code with preserved aspect ratio
   */
  private generateImageElement(element: SlideElement): string {
    const { position, size, properties, content } = element;

    if (!content) return '% Image element without source\n';

    let latex = '\n% Image Element\n';

    // Use textpos for consistent positioning with text elements
    const coords = this.convertCanvasToLatexCoordinates(position, size);

    // Calculate aspect ratio from canvas size to maintain proper scaling
    const canvasAspectRatio = size.width / size.height;
    const latexAspectRatio = coords.width / coords.height;
    
    let imageOptions: string[] = [];
    
    // FIXED: Use only width OR height to maintain aspect ratio, not both
    // This prevents distortion between canvas and PDF output
    if (canvasAspectRatio > latexAspectRatio) {
      // Image is wider relative to the target area - constrain by width
      imageOptions.push(`width=${coords.width.toFixed(3)}cm`);
    } else {
      // Image is taller relative to the target area - constrain by height  
      imageOptions.push(`height=${coords.height.toFixed(3)}cm`);
    }
    
    // Always preserve aspect ratio
    imageOptions.push('keepaspectratio');

    if (properties.crop) {
      const { crop } = properties;
      imageOptions.push(`trim=${crop.x} ${crop.y} ${crop.width} ${crop.height}`);
      imageOptions.push('clip');
    }

    // Images should be processed by preview service before reaching here
    let imagePath = content;

    console.log('🖼️ [LaTeX Generator] Image generation:', {
      elementId: element.id,
      canvasSize: { width: size.width, height: size.height },
      latexCoords: coords,
      canvasAspectRatio: canvasAspectRatio.toFixed(3),
      latexAspectRatio: latexAspectRatio.toFixed(3),
      constrainBy: canvasAspectRatio > latexAspectRatio ? 'width' : 'height',
      imageOptions
    });

    latex += `\\begin{textblock*}{${coords.width.toFixed(3)}cm}(${coords.x.toFixed(3)}cm,${coords.y.toFixed(3)}cm)\n`;
    latex += `\\includegraphics[${imageOptions.join(',')}]{${imagePath}}\n`;
    latex += '\\end{textblock*}\n';

    return latex;
  }



  /**
   * Generate shape element LaTeX code using TikZ
   */
  private generateShapeElement(element: SlideElement, theme: Theme): string {
    const { position, size, properties } = element;

    let latex = '\n% Shape Element\n';
    latex += '\\begin{tikzpicture}[remember picture,overlay]\n';

    // Use smart coordinate conversion
    const coords = this.convertCanvasToLatexCoordinates(position, size);

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
        latex += this.generateRectangle(coords.x, coords.y, coords.width, coords.height, shapeOptions, properties);
        break;
      case 'circle':
        latex += this.generateCircle(coords.x, coords.y, Math.min(coords.width, coords.height) / 2, shapeOptions);
        break;
      case 'ellipse':
        latex += this.generateEllipse(coords.x, coords.y, coords.width / 2, coords.height / 2, shapeOptions);
        break;
      case 'line':
        latex += this.generateLine(coords.x, coords.y, coords.x + coords.width, coords.y - coords.height, shapeOptions, properties);
        break;
      case 'arrow':
        latex += this.generateArrow(coords.x, coords.y, coords.x + coords.width, coords.y - coords.height, shapeOptions, properties);
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
  /**
   * Correct coordinate conversion with proper margins for text positioning
   */
  private convertCanvasToLatexCoordinates(position: { x: number; y: number }, size: { width: number; height: number }) {
    // Canvas dimensions
    const CANVAS_WIDTH = 800;
    const CANVAS_HEIGHT = 600;

    // Absolute slide boundaries:
    // Left edge: 0.2cm, Right edge: 15.5cm
    // Top edge: 1cm, Bottom edge: 8.3cm

    const SLIDE_LEFT_EDGE = 0.2;   // Absolute left edge
    const SLIDE_RIGHT_EDGE = 15.5; // Absolute right edge
    const Y_OFFSET = 1.0;          // Top edge offset
    const USABLE_HEIGHT_CM = 7.3;  // 8.3 - 1.0 = 7.3cm usable height

    // For images, use the full slide area (no text margins)
    // For text, we'll add margins in the text generation function
    const USABLE_WIDTH_CM = SLIDE_RIGHT_EDGE - SLIDE_LEFT_EDGE; // 15.3cm

    // Scale factors based on full usable area
    const X_SCALE = USABLE_WIDTH_CM / CANVAS_WIDTH;   // 15.3 / 800 = 0.019125
    const Y_SCALE = USABLE_HEIGHT_CM / CANVAS_HEIGHT; // 7.3 / 600 = 0.012167

    // Convert coordinates using the full usable area
    const x = SLIDE_LEFT_EDGE + (position.x * X_SCALE);
    const y = Y_OFFSET + (position.y * Y_SCALE);
    const width = size.width * X_SCALE;
    const height = size.height * Y_SCALE;

    // Calculate dynamic center within usable area
    const centerX = SLIDE_LEFT_EDGE + (USABLE_WIDTH_CM / 2); // 0.2 + 15.3/2 = 7.85cm
    const centerY = Y_OFFSET + (USABLE_HEIGHT_CM / 2);       // 1.0 + 7.3/2 = 4.65cm

    console.log(`🔧 [LaTeX Generator] Coordinate conversion with margins:`, {
      input: { x: position.x, y: position.y, width: size.width, height: size.height },
      output: { x: x.toFixed(3), y: y.toFixed(3), width: width.toFixed(3), height: height.toFixed(3) },
      scales: { X_SCALE: X_SCALE.toFixed(6), Y_SCALE: Y_SCALE.toFixed(6) },
      boundaries: { SLIDE_LEFT_EDGE, SLIDE_RIGHT_EDGE, USABLE_WIDTH_CM },
      dynamicCenter: { centerX: centerX.toFixed(2), centerY: centerY.toFixed(2) }
    });

    return {
      x: Math.max(SLIDE_LEFT_EDGE, Math.min(x, SLIDE_RIGHT_EDGE)), // Clamp to slide area
      y: Math.max(Y_OFFSET, Math.min(y, Y_OFFSET + USABLE_HEIGHT_CM)), // Clamp to usable area
      width: Math.max(0.1, width), // Very small minimum width
      height: Math.max(0.1, height), // Very small minimum height
      maxAllowedWidth: USABLE_WIDTH_CM // Pass this for width calculations
    };
  }

  private pixelsToLatex(pixels: number, invertY: boolean = false): number {
    // Convert pixels to cm (assuming 96 DPI)
    // Standard conversion: 1 inch = 2.54 cm, 96 DPI means 96 pixels per inch
    const cm = pixels * 2.54 / 96;

    // For Y coordinates, we need to invert because:
    // - Canvas Y=0 is at top, LaTeX Y=0 is at bottom
    // - Beamer slide height is approximately 9.6cm (for 16:9 aspect ratio)
    if (invertY) {
      const slideHeightCm = 9.6; // Standard beamer slide height in cm
      return slideHeightCm - cm;
    }

    return cm;
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

    // Check if it's a standard color that's already defined
    if (rgb.r === 0 && rgb.g === 0 && rgb.b === 0) return 'black';
    if (rgb.r === 255 && rgb.g === 255 && rgb.b === 255) return 'white';
    if (rgb.r === 255 && rgb.g === 0 && rgb.b === 0) return 'red';
    if (rgb.r === 0 && rgb.g === 255 && rgb.b === 0) return 'green';
    if (rgb.r === 0 && rgb.g === 0 && rgb.b === 255) return 'blue';

    // For custom colors, create a safe color name
    const colorName = `customcolor${rgb.r}x${rgb.g}x${rgb.b}`;
    // Note: In a complete implementation, we'd track and define these colors in the preamble
    // For now, we'll use a basic color or fallback to black
    return 'black'; // Fallback to prevent undefined color errors
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

  /**
   * Calculate dynamic text block width with proper margin handling and text wrapping
   */
  private calculateTextBlockWidth(content: string, properties: any, defaultWidth: number): number {
    const fontSize = properties.fontSize || 12;
    const hasNewlines = content.includes('\n');
    const lines = content.split('\n');
    const maxLineLength = Math.max(...lines.map(line => line.length));

    // Text-safe area width (14.6cm with 0.3cm margins on each side: 15.2 - 0.5 = 14.7cm)
    const TEXT_USABLE_WIDTH = 14.7;

    // Base width calculation considering font size
    // More accurate character width estimation for different font sizes
    const avgCharWidthCm = (fontSize * 0.55) / 28.35; // Slightly tighter character width

    // Calculate minimum width needed for the longest line
    const estimatedMinWidth = maxLineLength * avgCharWidthCm;

    // Start with the larger of: estimated width or canvas-based width
    let calculatedWidth = Math.max(estimatedMinWidth, defaultWidth);

    // Adjustments based on content characteristics
    if (hasNewlines) {
      // Multi-line text needs consistent width for all lines
      calculatedWidth = Math.max(calculatedWidth, 2.0); // Minimum 2cm for readability

      // If we have many lines, might need more width to prevent awkward wrapping
      if (lines.length > 3) {
        calculatedWidth = Math.max(calculatedWidth, defaultWidth * 1.1);
      }
    } else {
      // Single line text - check if it needs wrapping
      if (content.length > 60) {
        // Long single line text should use more width to minimize wrapping
        calculatedWidth = Math.max(calculatedWidth, TEXT_USABLE_WIDTH * 0.8);
      } else if (content.length < 10) {
        // Short text can be more compact
        calculatedWidth = Math.max(1.0, calculatedWidth * 0.8);
      }
    }

    // Font size adjustments - larger fonts need proportionally more space
    if (fontSize > 18) {
      calculatedWidth *= 1.2; // Significantly more space for large fonts
    } else if (fontSize > 14) {
      calculatedWidth *= 1.1; // Moderately more space for medium-large fonts
    } else if (fontSize < 10) {
      calculatedWidth *= 0.85; // Smaller fonts can be more compact
    }

    // Ensure we don't exceed the text-safe area
    calculatedWidth = Math.min(calculatedWidth, TEXT_USABLE_WIDTH);

    // Ensure minimum width for readability
    calculatedWidth = Math.max(0.8, calculatedWidth);

    console.log(`📏 [Width Calculation] Content: "${content.substring(0, 20)}..." | Font: ${fontSize}pt | Lines: ${lines.length} | Estimated: ${estimatedMinWidth.toFixed(2)}cm | Final: ${calculatedWidth.toFixed(2)}cm | Max: ${TEXT_USABLE_WIDTH}cm`);

    return calculatedWidth;
  }

  /**
   * Process text content for LaTeX output with proper newline handling
   */
  private processTextContent(content: string): string {
    console.log('📝 [LaTeXGenerator] ===== PROCESSING TEXT CONTENT =====');
    console.log('📝 [LaTeXGenerator] Original content:', {
      content,
      length: content.length,
      hasNewlines: content.includes('\n'),
      newlineCount: (content.match(/\n/g) || []).length,
      contentAsArray: Array.from(content).map(char => char === '\n' ? '\\n' : char),
      contentCharCodes: Array.from(content).map(char => char.charCodeAt(0))
    });
    
    // Escape LaTeX special characters first
    let processed = this.escapeLatex(content);

    // Handle different types of newlines and line breaks
    // 1. Handle explicit line breaks (\\n or \n)
    processed = processed.replace(/\\\\n/g, '\\\\'); // Convert \\n to \\
    processed = processed.replace(/\n/g, '\\\\');    // Convert \n to \\

    // 2. Handle paragraph breaks (double newlines) - add proper spacing
    processed = processed.replace(/\\\\\\\\/g, '\\\\[0.5em]'); // Add spacing between paragraphs

    // 3. Handle multiple consecutive spaces (preserve formatting)
    processed = processed.replace(/  +/g, (match) => {
      // Convert multiple spaces to non-breaking spaces, but limit to avoid overly wide spacing
      const spaceCount = Math.min(match.length, 10); // Limit to 10 spaces max
      return '~'.repeat(spaceCount);
    });

    // 4. Handle tabs (convert to spaces)
    processed = processed.replace(/\t/g, '~~~~'); // Convert tabs to 4 non-breaking spaces

    // 5. Clean up any trailing line breaks
    processed = processed.replace(/\\\\+$/, ''); // Remove trailing \\

    console.log('📝 [LaTeXGenerator] Processed content:', {
      processed,
      length: processed.length,
      hasLatexBreaks: processed.includes('\\\\'),
      latexBreakCount: (processed.match(/\\\\/g) || []).length
    });

    return processed;
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