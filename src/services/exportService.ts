import { Presentation } from '../types/presentation';
import { latexGenerator } from './latexGenerator';
import { latexCompiler } from './latexCompiler';

export interface ExportOptions {
  format: 'pdf' | 'latex' | 'pptx' | 'html' | 'json' | 'markdown';
  outputPath?: string;
  quality?: 'low' | 'medium' | 'high';
  includeNotes?: boolean;
  embedFonts?: boolean;
  optimizeImages?: boolean;
  standalone?: boolean;
  theme?: 'light' | 'dark' | 'auto';
  slideTransitions?: boolean;
  exportRange?: {
    start: number;
    end: number;
  };
}

export interface ExportResult {
  success: boolean;
  outputPath?: string;
  error?: string;
  warnings?: string[];
  metadata?: {
    fileSize: number;
    duration: number;
    format: string;
    slideCount: number;
    quality?: 'low' | 'medium' | 'high';
    compiler?: 'pdflatex' | 'xelatex' | 'lualatex';
    passes?: number;
    cleanFormatting?: boolean;
    linesOfCode?: number;
  };
}

export interface ExportProgress {
  stage: 'preparing' | 'generating' | 'compiling' | 'finalizing' | 'completed';
  progress: number; // 0-100
  message: string;
  currentSlide?: number;
  totalSlides?: number;
}

export class ExportService {
  private static instance: ExportService;
  private progressCallback?: (progress: ExportProgress) => void;

  private constructor() {}

  public static getInstance(): ExportService {
    if (!ExportService.instance) {
      ExportService.instance = new ExportService();
    }
    return ExportService.instance;
  }

  /**
   * Set progress callback for export operations
   */
  public setProgressCallback(callback: (progress: ExportProgress) => void): void {
    this.progressCallback = callback;
  }

  /**
   * Report progress during export
   */
  private reportProgress(progress: ExportProgress): void {
    if (this.progressCallback) {
      this.progressCallback(progress);
    }
  }

  /**
   * Export presentation to specified format
   */
  public async exportPresentation(
    presentation: Presentation,
    options: ExportOptions
  ): Promise<ExportResult> {
    const startTime = Date.now();

    try {
      this.reportProgress({
        stage: 'preparing',
        progress: 0,
        message: 'Preparing export...'
      });

      // Filter slides based on export range
      const filteredPresentation = this.filterSlidesByRange(presentation, options.exportRange);

      switch (options.format) {
        case 'pdf':
          return await this.exportToPDF(filteredPresentation, options);
        case 'latex':
          return await this.exportToLaTeX(filteredPresentation, options);
        case 'pptx':
          return await this.exportToPowerPoint(filteredPresentation, options);
        case 'html':
          return await this.exportToHTML(filteredPresentation, options);
        case 'json':
          return await this.exportToJSON(filteredPresentation, options);
        case 'markdown':
          return await this.exportToMarkdown(filteredPresentation, options);
        default:
          return {
            success: false,
            error: `Unsupported export format: ${options.format}`
          };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Filter slides by export range
   */
  private filterSlidesByRange(presentation: Presentation, range?: { start: number; end: number }): Presentation {
    if (!range) return presentation;

    const filteredSlides = presentation.slides.slice(
      Math.max(0, range.start - 1),
      Math.min(presentation.slides.length, range.end)
    );

    return {
      ...presentation,
      slides: filteredSlides
    };
  }

  /**
   * Export to PDF via LaTeX compilation with high-quality options
   */
  private async exportToPDF(
    presentation: Presentation,
    options: ExportOptions
  ): Promise<ExportResult> {
    const startTime = Date.now();

    this.reportProgress({
      stage: 'generating',
      progress: 10,
      message: 'Preparing high-quality PDF export...'
    });

    // Enhanced LaTeX generation options based on quality setting
    const latexOptions = this.getLatexOptionsForQuality(options.quality || 'high');
    
    this.reportProgress({
      stage: 'generating',
      progress: 20,
      message: 'Generating optimized LaTeX source...'
    });

    // Generate LaTeX source with quality-specific optimizations
    const latexSource = latexGenerator.generateDocument(presentation, {
      includePackages: true,
      includeDocumentClass: true,
      optimizeCode: true,
      minifyOutput: false,
      quality: options.quality || 'high',
      embedFonts: options.embedFonts !== false, // Default to true for PDF
      optimizeImages: options.optimizeImages !== false, // Default to true
      includeNotes: options.includeNotes || false,
      ...latexOptions
    });

    this.reportProgress({
      stage: 'compiling',
      progress: 30,
      message: 'Compiling LaTeX to high-quality PDF...'
    });

    // Enhanced compilation options
    const compilationOptions = {
      compiler: this.selectOptimalCompiler(options.quality || 'high'),
      timeout: this.getTimeoutForQuality(options.quality || 'high'),
      outputDir: options.outputPath ? require('path').dirname(options.outputPath) : undefined,
      embedFonts: options.embedFonts !== false,
      optimizeImages: options.optimizeImages !== false,
      quality: options.quality || 'high',
      passes: this.getCompilationPasses(options.quality || 'high'),
      dpi: this.getDpiForQuality(options.quality || 'high'),
      colorProfile: 'sRGB', // Ensure consistent color reproduction
      pdfVersion: '1.7', // Modern PDF version with better features
      compression: options.quality === 'low' ? 'high' : 'medium' // Inverse relationship for file size
    };

    try {
      const jobId = await latexCompiler.compile(latexSource, compilationOptions);
      
      // Wait for compilation to complete with enhanced progress tracking
      return new Promise((resolve) => {
        const handleProgress = (progress: any) => {
          if (progress.jobId === jobId) {
            this.reportProgress({
              stage: 'compiling',
              progress: 30 + (progress.progress * 0.6),
              message: this.getQualitySpecificMessage(progress.stage, options.quality || 'high')
            });
          }
        };

        const handleCompletion = (result: any) => {
          if (result.jobId === jobId) {
            latexCompiler.off('job-completed', handleCompletion);
            latexCompiler.off('progress', handleProgress);
            
            if (result.success) {
              this.reportProgress({
                stage: 'finalizing',
                progress: 95,
                message: 'Finalizing PDF export...'
              });

              // Post-process PDF if needed
              this.postProcessPDF(result.pdfPath, options).then((finalPath) => {
                this.reportProgress({
                  stage: 'completed',
                  progress: 100,
                  message: 'High-quality PDF export completed successfully'
                });

                resolve({
                  success: true,
                  outputPath: finalPath || result.pdfPath,
                  metadata: {
                    fileSize: result.fileSize || 0,
                    duration: Date.now() - startTime,
                    format: 'pdf',
                    slideCount: presentation.slides.length,
                    quality: options.quality || 'high',
                    compiler: compilationOptions.compiler,
                    passes: compilationOptions.passes
                  }
                });
              }).catch((postProcessError) => {
                // If post-processing fails, still return the original PDF
                console.warn('PDF post-processing failed:', postProcessError);
                resolve({
                  success: true,
                  outputPath: result.pdfPath,
                  warnings: [`Post-processing failed: ${postProcessError.message}`],
                  metadata: {
                    fileSize: result.fileSize || 0,
                    duration: Date.now() - startTime,
                    format: 'pdf',
                    slideCount: presentation.slides.length,
                    quality: options.quality || 'high',
                    compiler: compilationOptions.compiler
                  }
                });
              });
            } else {
              resolve({
                success: false,
                error: result.errors.map((e: any) => e.message).join('; '),
                warnings: result.warnings.map((w: any) => w.message)
              });
            }
          }
        };

        latexCompiler.on('job-completed', handleCompletion);
        latexCompiler.on('progress', handleProgress);
      });
    } catch (error) {
      return {
        success: false,
        error: `High-quality PDF compilation failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Export to LaTeX source file with clean formatting
   */
  private async exportToLaTeX(
    presentation: Presentation,
    options: ExportOptions
  ): Promise<ExportResult> {
    const startTime = Date.now();

    try {
      this.reportProgress({
        stage: 'generating',
        progress: 20,
        message: 'Preparing LaTeX source generation...'
      });

      // Enhanced LaTeX generation options for clean formatting
      const latexGenerationOptions = {
        includePackages: true,
        includeDocumentClass: true,
        optimizeCode: true,
        minifyOutput: false,
        cleanFormatting: true,
        includeComments: true,
        indentLevel: 2,
        quality: options.quality || 'high',
        includeNotes: options.includeNotes || false,
        standalone: options.standalone !== false, // Default to true for LaTeX export
        embedFonts: options.embedFonts,
        optimizeImages: options.optimizeImages,
        ...this.getLatexOptionsForQuality(options.quality || 'high')
      };

      this.reportProgress({
        stage: 'generating',
        progress: 40,
        message: 'Generating clean LaTeX source code...'
      });

      // Generate LaTeX source with enhanced formatting
      let latexSource = latexGenerator.generateDocument(presentation, latexGenerationOptions);

      this.reportProgress({
        stage: 'generating',
        progress: 70,
        message: 'Applying code formatting and optimization...'
      });

      // Apply additional formatting and cleanup
      latexSource = this.formatLatexSource(latexSource, options);

      // Add export metadata as comments
      latexSource = this.addLatexExportMetadata(latexSource, presentation, options);

      this.reportProgress({
        stage: 'finalizing',
        progress: 90,
        message: 'Finalizing LaTeX export...'
      });

      // Save to file
      let outputPath = options.outputPath;
      if (!outputPath) {
        const saveResult = await this.saveFileWithDialog(latexSource, {
          format: 'latex',
          defaultFileName: `${presentation.title || 'presentation'}.tex`
        });
        
        if (!saveResult.success) {
          if (saveResult.canceled) {
            return { success: false, error: 'Export canceled by user' };
          }
          return { success: false, error: saveResult.error || 'Failed to save file' };
        }
        outputPath = saveResult.filePath;
      } else {
        await this.writeFile(outputPath, latexSource);
      }

      this.reportProgress({
        stage: 'completed',
        progress: 100,
        message: 'Clean LaTeX export completed successfully'
      });

      return {
        success: true,
        outputPath: outputPath,
        metadata: {
          fileSize: Buffer.byteLength(latexSource, 'utf8'),
          duration: Date.now() - startTime,
          format: 'latex',
          slideCount: presentation.slides.length,
          quality: options.quality || 'high',
          cleanFormatting: true,
          linesOfCode: latexSource.split('\n').length
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `LaTeX export failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Export to PowerPoint format using PptxGenJS
   */
  private async exportToPowerPoint(
    presentation: Presentation,
    options: ExportOptions
  ): Promise<ExportResult> {
    try {
      this.reportProgress({
        stage: 'generating',
        progress: 20,
        message: 'Initializing PowerPoint export...'
      });

      // Dynamic import to handle potential missing dependency
      let PptxGenJS: any;
      try {
        PptxGenJS = require('pptxgenjs');
      } catch (error) {
        return {
          success: false,
          error: 'PowerPoint export requires the pptxgenjs library. Please install it with: npm install pptxgenjs',
          warnings: [
            'Consider using PDF or HTML export as alternatives',
            'PDF export provides the best fidelity to your original design'
          ]
        };
      }

      const pptx = new PptxGenJS();
      
      // Set presentation properties
      pptx.author = presentation.metadata.author || 'LaTeX Presentation Editor';
      pptx.company = 'LaTeX Presentation Editor';
      pptx.title = presentation.metadata.title || presentation.title;
      pptx.subject = 'Presentation created with LaTeX Presentation Editor';

      this.reportProgress({
        stage: 'generating',
        progress: 40,
        message: 'Converting slides to PowerPoint format...'
      });

      // Process each slide
      for (let i = 0; i < presentation.slides.length; i++) {
        const slide = presentation.slides[i];
        
        this.reportProgress({
          stage: 'generating',
          progress: 40 + (i / presentation.slides.length) * 40,
          message: `Processing slide ${i + 1} of ${presentation.slides.length}...`,
          currentSlide: i + 1,
          totalSlides: presentation.slides.length
        });

        await this.convertSlideToPowerPoint(pptx, slide, presentation.theme, options);
      }

      this.reportProgress({
        stage: 'finalizing',
        progress: 90,
        message: 'Finalizing PowerPoint export...'
      });

      // Generate the PPTX file
      let outputPath = options.outputPath;
      if (!outputPath) {
        const saveResult = await this.saveFileWithDialog('', {
          format: 'pptx',
          defaultFileName: `${presentation.title || 'presentation'}.pptx`
        });
        
        if (!saveResult.success) {
          if (saveResult.canceled) {
            return { success: false, error: 'Export canceled by user' };
          }
          return { success: false, error: saveResult.error || 'Failed to save file' };
        }
        outputPath = saveResult.filePath;
      }

      // Write the PPTX file
      const pptxBuffer = await pptx.write('nodebuffer');
      await this.writeFileBuffer(outputPath!, pptxBuffer);

      this.reportProgress({
        stage: 'completed',
        progress: 100,
        message: 'PowerPoint export completed successfully'
      });

      return {
        success: true,
        outputPath: outputPath,
        metadata: {
          fileSize: pptxBuffer.length,
          duration: 0,
          format: 'pptx',
          slideCount: presentation.slides.length
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `PowerPoint export failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Export to HTML format
   */
  private async exportToHTML(
    presentation: Presentation,
    options: ExportOptions
  ): Promise<ExportResult> {
    try {
      this.reportProgress({
        stage: 'generating',
        progress: 30,
        message: 'Generating HTML content...'
      });

      const htmlContent = this.generateHTML(presentation, options);

      this.reportProgress({
        stage: 'finalizing',
        progress: 90,
        message: 'Finalizing HTML export...'
      });

      // Save to file
      let outputPath = options.outputPath;
      if (!outputPath) {
        const saveResult = await this.saveFileWithDialog(htmlContent, {
          format: 'html',
          defaultFileName: `${presentation.title || 'presentation'}.html`
        });
        
        if (!saveResult.success) {
          if (saveResult.canceled) {
            return { success: false, error: 'Export canceled by user' };
          }
          return { success: false, error: saveResult.error || 'Failed to save file' };
        }
        outputPath = saveResult.filePath;
      } else {
        await this.writeFile(outputPath, htmlContent);
      }

      this.reportProgress({
        stage: 'completed',
        progress: 100,
        message: 'HTML export completed successfully'
      });

      return {
        success: true,
        outputPath: options.outputPath,
        metadata: {
          fileSize: Buffer.byteLength(htmlContent, 'utf8'),
          duration: 0,
          format: 'html',
          slideCount: presentation.slides.length
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `HTML export failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Export to JSON format
   */
  private async exportToJSON(
    presentation: Presentation,
    options: ExportOptions
  ): Promise<ExportResult> {
    try {
      this.reportProgress({
        stage: 'generating',
        progress: 50,
        message: 'Generating JSON export...'
      });

      const exportData = {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        presentation,
        metadata: {
          slideCount: presentation.slides.length,
          exportOptions: options
        }
      };

      const jsonContent = JSON.stringify(exportData, null, 2);

      // Save to file
      let outputPath = options.outputPath;
      if (!outputPath) {
        const saveResult = await this.saveFileWithDialog(jsonContent, {
          format: 'json',
          defaultFileName: `${presentation.title || 'presentation'}.json`
        });
        
        if (!saveResult.success) {
          if (saveResult.canceled) {
            return { success: false, error: 'Export canceled by user' };
          }
          return { success: false, error: saveResult.error || 'Failed to save file' };
        }
        outputPath = saveResult.filePath;
      } else {
        await this.writeFile(outputPath, jsonContent);
      }

      this.reportProgress({
        stage: 'completed',
        progress: 100,
        message: 'JSON export completed successfully'
      });

      return {
        success: true,
        outputPath: options.outputPath,
        metadata: {
          fileSize: Buffer.byteLength(jsonContent, 'utf8'),
          duration: 0,
          format: 'json',
          slideCount: presentation.slides.length
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `JSON export failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Export to Markdown format
   */
  private async exportToMarkdown(
    presentation: Presentation,
    options: ExportOptions
  ): Promise<ExportResult> {
    try {
      this.reportProgress({
        stage: 'generating',
        progress: 30,
        message: 'Generating Markdown content...'
      });

      const markdownContent = this.generateMarkdown(presentation, options);

      this.reportProgress({
        stage: 'finalizing',
        progress: 90,
        message: 'Finalizing Markdown export...'
      });

      // Save to file
      let outputPath = options.outputPath;
      if (!outputPath) {
        const saveResult = await this.saveFileWithDialog(markdownContent, {
          format: 'markdown',
          defaultFileName: `${presentation.title || 'presentation'}.md`
        });
        
        if (!saveResult.success) {
          if (saveResult.canceled) {
            return { success: false, error: 'Export canceled by user' };
          }
          return { success: false, error: saveResult.error || 'Failed to save file' };
        }
        outputPath = saveResult.filePath;
      } else {
        await this.writeFile(outputPath, markdownContent);
      }

      this.reportProgress({
        stage: 'completed',
        progress: 100,
        message: 'Markdown export completed successfully'
      });

      return {
        success: true,
        outputPath: options.outputPath,
        metadata: {
          fileSize: Buffer.byteLength(markdownContent, 'utf8'),
          duration: 0,
          format: 'markdown',
          slideCount: presentation.slides.length
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Markdown export failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Generate Markdown content from presentation
   */
  private generateMarkdown(presentation: Presentation, options: ExportOptions): string {
    const { slides, metadata } = presentation;
    
    let markdown = `# ${metadata.title || presentation.title}\n\n`;
    
    if (metadata.author) {
      markdown += `**Author:** ${metadata.author}\n\n`;
    }
    
    if (metadata.date) {
      markdown += `**Date:** ${metadata.date.toLocaleDateString()}\n\n`;
    }
    
    markdown += '---\n\n';
    
    slides.forEach((slide, index) => {
      markdown += `## Slide ${index + 1}: ${slide.title}\n\n`;
      
      // Sort elements by z-index
      const sortedElements = [...slide.elements].sort((a, b) => 
        (a.properties.zIndex || 0) - (b.properties.zIndex || 0)
      );
      
      for (const element of sortedElements) {
        markdown += this.generateElementMarkdown(element);
      }
      
      if (options.includeNotes && slide.notes) {
        markdown += `\n**Notes:** ${slide.notes}\n`;
      }
      
      markdown += '\n---\n\n';
    });
    
    return markdown;
  }

  /**
   * Generate Markdown for a slide element
   */
  private generateElementMarkdown(element: any): string {
    switch (element.type) {
      case 'text':
        return this.generateTextElementMarkdown(element);
      case 'image':
        return this.generateImageElementMarkdown(element);
      case 'shape':
        return '<!-- Shape elements not supported in Markdown -->\n\n';
      default:
        return `<!-- Unsupported element type: ${element.type} -->\n\n`;
    }
  }

  /**
   * Generate Markdown for text element
   */
  private generateTextElementMarkdown(element: any): string {
    const { content, properties } = element;
    
    if (!content) return '';
    
    let markdown = '';
    
    // Handle lists
    if (properties.listType && properties.listType !== 'none') {
      const lines = content.split('\n').filter((line: string) => line.trim());
      if (lines.length > 0) {
        const prefix = properties.listType === 'bullet' ? '- ' : '1. ';
        markdown = lines.map((line: string, index: number) => {
          const actualPrefix = properties.listType === 'numbered' ? `${index + 1}. ` : prefix;
          return `${actualPrefix}${line.trim()}`;
        }).join('\n') + '\n\n';
      }
    } else {
      // Regular text with formatting
      let processedContent = content;
      
      if (properties.fontWeight === 'bold') {
        processedContent = `**${processedContent}**`;
      }
      
      if (properties.fontStyle === 'italic') {
        processedContent = `*${processedContent}*`;
      }
      
      markdown = `${processedContent}\n\n`;
    }
    
    return markdown;
  }

  /**
   * Generate Markdown for image element
   */
  private generateImageElementMarkdown(element: any): string {
    const { content } = element;
    
    if (!content) return '';
    
    return `![Slide Image](${content})\n\n`;
  }

  /**
   * Generate HTML content from presentation
   */
  private generateHTML(presentation: Presentation, options: ExportOptions): string {
    const { theme, slides, metadata } = presentation;
    
    let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this.escapeHtml(metadata.title || presentation.title)}</title>
    <style>
        ${this.generateCSS(theme, options)}
    </style>
</head>
<body>
    <div class="presentation">
        <header class="presentation-header">
            <h1>${this.escapeHtml(metadata.title || presentation.title)}</h1>
            ${metadata.author ? `<p class="author">${this.escapeHtml(metadata.author)}</p>` : ''}
            ${metadata.date ? `<p class="date">${metadata.date.toLocaleDateString()}</p>` : ''}
        </header>
        
        <main class="slides-container">
            ${slides.map((slide, index) => this.generateSlideHTML(slide, index, options)).join('\n')}
        </main>
        
        <nav class="slide-navigation">
            <button id="prev-slide" onclick="previousSlide()">Previous</button>
            <span id="slide-counter">1 / ${slides.length}</span>
            <button id="next-slide" onclick="nextSlide()">Next</button>
        </nav>
        
        ${options.standalone ? this.generateFullscreenControls() : ''}
    </div>
    
    <script>
        ${this.generateJavaScript(options)}
    </script>
</body>
</html>`;

    return html;
  }

  /**
   * Generate fullscreen controls for standalone HTML
   */
  private generateFullscreenControls(): string {
    return `
        <div class="fullscreen-controls">
            <button id="fullscreen-btn" onclick="toggleFullscreen()">Fullscreen</button>
            <button id="theme-toggle" onclick="toggleTheme()">Toggle Theme</button>
        </div>
    `;
  } 
 /**
   * Generate CSS for HTML export
   */
  private generateCSS(theme: any, options: ExportOptions): string {
    const colors = theme.colors;
    const fonts = theme.fonts;
    const isDark = options.theme === 'dark';

    const bgColor = isDark ? 'rgb(30, 30, 30)' : `rgb(${colors.background.r}, ${colors.background.g}, ${colors.background.b})`;
    const textColor = isDark ? 'rgb(240, 240, 240)' : `rgb(${colors.text.r}, ${colors.text.g}, ${colors.text.b})`;

    return `
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: ${fonts.body || 'Arial, sans-serif'};
            background-color: ${bgColor};
            color: ${textColor};
            line-height: 1.6;
            transition: all 0.3s ease;
        }
        
        .presentation {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .presentation-header {
            text-align: center;
            margin-bottom: 40px;
            padding: 20px;
            border-bottom: 2px solid rgb(${colors.primary.r}, ${colors.primary.g}, ${colors.primary.b});
        }
        
        .presentation-header h1 {
            font-family: ${fonts.heading || 'Arial, sans-serif'};
            font-size: 2.5em;
            color: rgb(${colors.primary.r}, ${colors.primary.g}, ${colors.primary.b});
            margin-bottom: 10px;
        }
        
        .author, .date {
            color: rgb(${colors.secondary.r}, ${colors.secondary.g}, ${colors.secondary.b});
            font-size: 1.1em;
        }
        
        .slide {
            display: none;
            min-height: 600px;
            padding: 40px;
            margin-bottom: 20px;
            border: 1px solid ${isDark ? '#555' : '#ddd'};
            border-radius: 8px;
            background: ${isDark ? 'rgb(40, 40, 40)' : 'white'};
            box-shadow: 0 4px 6px rgba(0, 0, 0, ${isDark ? '0.3' : '0.1'});
            ${options.slideTransitions ? 'transition: all 0.5s ease;' : ''}
        }
        
        .slide.active {
            display: block;
            ${options.slideTransitions ? 'animation: slideIn 0.5s ease;' : ''}
        }
        
        @keyframes slideIn {
            from { opacity: 0; transform: translateX(20px); }
            to { opacity: 1; transform: translateX(0); }
        }
        
        .slide h2 {
            font-family: ${fonts.heading || 'Arial, sans-serif'};
            color: rgb(${colors.primary.r}, ${colors.primary.g}, ${colors.primary.b});
            font-size: 2em;
            margin-bottom: 20px;
            border-bottom: 2px solid rgb(${colors.accent.r}, ${colors.accent.g}, ${colors.accent.b});
            padding-bottom: 10px;
        }
        
        .slide-content {
            font-size: 1.2em;
            line-height: 1.8;
        }
        
        .slide-navigation {
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            align-items: center;
            gap: 20px;
            background: rgba(0, 0, 0, 0.8);
            padding: 10px 20px;
            border-radius: 25px;
            color: white;
            z-index: 1000;
        }
        
        .slide-navigation button {
            background: rgb(${colors.primary.r}, ${colors.primary.g}, ${colors.primary.b});
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            transition: background 0.2s ease;
        }
        
        .slide-navigation button:hover {
            background: rgb(${Math.max(0, colors.primary.r - 20)}, ${Math.max(0, colors.primary.g - 20)}, ${Math.max(0, colors.primary.b - 20)});
        }
        
        .slide-navigation button:disabled {
            background: #666;
            cursor: not-allowed;
        }
        
        .fullscreen-controls {
            position: fixed;
            top: 20px;
            right: 20px;
            display: flex;
            gap: 10px;
            z-index: 1000;
        }
        
        .fullscreen-controls button {
            background: rgba(0, 0, 0, 0.7);
            color: white;
            border: none;
            padding: 8px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
        }
        
        ul, ol {
            margin-left: 30px;
            margin-bottom: 15px;
        }
        
        li {
            margin-bottom: 8px;
        }
        
        .math {
            font-family: ${fonts.monospace || 'monospace'};
            background: ${isDark ? '#333' : '#f5f5f5'};
            padding: 2px 4px;
            border-radius: 3px;
        }
        
        .slide-notes {
            margin-top: 30px;
            padding: 15px;
            background: ${isDark ? '#333' : '#f9f9f9'};
            border-left: 4px solid rgb(${colors.accent.r}, ${colors.accent.g}, ${colors.accent.b});
            border-radius: 4px;
        }
        
        .slide-notes h4 {
            color: rgb(${colors.accent.r}, ${colors.accent.g}, ${colors.accent.b});
            margin-bottom: 8px;
        }
        
        @media print {
            .slide {
                display: block !important;
                page-break-after: always;
                box-shadow: none;
                border: none;
            }
            
            .slide-navigation,
            .fullscreen-controls {
                display: none;
            }
        }
        
        @media (max-width: 768px) {
            .presentation {
                padding: 10px;
            }
            
            .slide {
                padding: 20px;
                min-height: 400px;
            }
            
            .slide h2 {
                font-size: 1.5em;
            }
            
            .slide-content {
                font-size: 1em;
            }
        }
    `;
  }

  /**
   * Generate HTML for a single slide
   */
  private generateSlideHTML(slide: any, index: number, options: ExportOptions): string {
    const isActive = index === 0 ? ' active' : '';
    
    let slideContent = '';
    
    // Sort elements by z-index
    const sortedElements = [...slide.elements].sort((a, b) => 
      (a.properties.zIndex || 0) - (b.properties.zIndex || 0)
    );
    
    for (const element of sortedElements) {
      slideContent += this.generateElementHTML(element);
    }
    
    let notesSection = '';
    if (options.includeNotes && slide.notes) {
      notesSection = `
        <div class="slide-notes">
            <h4>Notes:</h4>
            <p>${this.escapeHtml(slide.notes)}</p>
        </div>
      `;
    }
    
    return `
        <div class="slide${isActive}" data-slide="${index}">
            <h2>${this.escapeHtml(slide.title)}</h2>
            <div class="slide-content">
                ${slideContent}
            </div>
            ${notesSection}
        </div>
    `;
  }

  /**
   * Generate HTML for a slide element
   */
  private generateElementHTML(element: any): string {
    switch (element.type) {
      case 'text':
        return this.generateTextElementHTML(element);
      case 'image':
        return this.generateImageElementHTML(element);
      case 'shape':
        return this.generateShapeElementHTML(element);
      default:
        return `<!-- Unsupported element type: ${element.type} -->`;
    }
  }

  /**
   * Generate HTML for text element
   */
  private generateTextElementHTML(element: any): string {
    const { content, properties } = element;
    
    if (!content) return '';
    
    let html = '';
    const styles = [];
    
    if (properties.fontSize) {
      styles.push(`font-size: ${properties.fontSize}px`);
    }
    
    if (properties.textColor) {
      const color = properties.textColor;
      styles.push(`color: rgb(${color.r}, ${color.g}, ${color.b})`);
    }
    
    if (properties.textAlign) {
      styles.push(`text-align: ${properties.textAlign}`);
    }
    
    if (properties.fontWeight === 'bold') {
      styles.push('font-weight: bold');
    }
    
    if (properties.fontStyle === 'italic') {
      styles.push('font-style: italic');
    }
    
    const styleAttr = styles.length > 0 ? ` style="${styles.join('; ')}"` : '';
    
    // Handle lists
    if (properties.listType && properties.listType !== 'none') {
      const lines = content.split('\n').filter((line: string) => line.trim());
      if (lines.length > 0) {
        const listTag = properties.listType === 'bullet' ? 'ul' : 'ol';
        const listItems = lines.map((line: string) => 
          `<li>${this.escapeHtml(line.trim())}</li>`
        ).join('\n');
        
        html = `<${listTag}${styleAttr}>\n${listItems}\n</${listTag}>`;
      }
    } else {
      // Handle math content
      if (properties.hasMath) {
        const processedContent = this.processMathForHTML(content);
        html = `<div${styleAttr}>${processedContent}</div>`;
      } else {
        const processedContent = this.escapeHtml(content).replace(/\n/g, '<br>');
        html = `<div${styleAttr}>${processedContent}</div>`;
      }
    }
    
    return html;
  }

  /**
   * Generate HTML for image element
   */
  private generateImageElementHTML(element: any): string {
    const { content, size, properties } = element;
    
    if (!content) return '';
    
    const styles = [];
    
    if (size.width) {
      styles.push(`width: ${size.width}px`);
    }
    
    if (size.height) {
      styles.push(`height: ${size.height}px`);
    }
    
    const styleAttr = styles.length > 0 ? ` style="${styles.join('; ')}"` : '';
    
    return `<img src="${this.escapeHtml(content)}" alt="Slide image"${styleAttr}>`;
  }

  /**
   * Generate HTML for shape element
   */
  private generateShapeElementHTML(element: any): string {
    const { size, properties } = element;
    
    const styles = [
      `width: ${size.width}px`,
      `height: ${size.height}px`,
      'display: inline-block'
    ];
    
    if (properties.fillColor) {
      const color = properties.fillColor;
      styles.push(`background-color: rgb(${color.r}, ${color.g}, ${color.b})`);
    }
    
    if (properties.strokeColor && properties.strokeWidth) {
      const color = properties.strokeColor;
      styles.push(`border: ${properties.strokeWidth}px solid rgb(${color.r}, ${color.g}, ${color.b})`);
    }
    
    if (properties.cornerRadius) {
      styles.push(`border-radius: ${properties.cornerRadius}px`);
    }
    
    const styleAttr = ` style="${styles.join('; ')}"`;
    
    return `<div class="shape"${styleAttr}></div>`;
  }

  /**
   * Generate JavaScript for HTML export
   */
  private generateJavaScript(options: ExportOptions): string {
    return `
        let currentSlide = 0;
        const slides = document.querySelectorAll('.slide');
        const totalSlides = slides.length;
        let isDarkTheme = ${options.theme === 'dark'};
        
        function showSlide(index) {
            slides.forEach(slide => slide.classList.remove('active'));
            slides[index].classList.add('active');
            
            document.getElementById('slide-counter').textContent = \`\${index + 1} / \${totalSlides}\`;
            document.getElementById('prev-slide').disabled = index === 0;
            document.getElementById('next-slide').disabled = index === totalSlides - 1;
        }
        
        function nextSlide() {
            if (currentSlide < totalSlides - 1) {
                currentSlide++;
                showSlide(currentSlide);
            }
        }
        
        function previousSlide() {
            if (currentSlide > 0) {
                currentSlide--;
                showSlide(currentSlide);
            }
        }
        
        function toggleFullscreen() {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen();
            } else {
                document.exitFullscreen();
            }
        }
        
        function toggleTheme() {
            isDarkTheme = !isDarkTheme;
            document.body.style.backgroundColor = isDarkTheme ? 'rgb(30, 30, 30)' : 'rgb(255, 255, 255)';
            document.body.style.color = isDarkTheme ? 'rgb(240, 240, 240)' : 'rgb(17, 24, 39)';
            
            slides.forEach(slide => {
                slide.style.backgroundColor = isDarkTheme ? 'rgb(40, 40, 40)' : 'white';
                slide.style.borderColor = isDarkTheme ? '#555' : '#ddd';
            });
        }
        
        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowRight' || e.key === ' ') {
                e.preventDefault();
                nextSlide();
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                previousSlide();
            } else if (e.key === 'Home') {
                e.preventDefault();
                currentSlide = 0;
                showSlide(currentSlide);
            } else if (e.key === 'End') {
                e.preventDefault();
                currentSlide = totalSlides - 1;
                showSlide(currentSlide);
            } else if (e.key === 'F11') {
                e.preventDefault();
                toggleFullscreen();
            }
        });
        
        // Touch/swipe support for mobile
        let startX = 0;
        let startY = 0;
        
        document.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
        });
        
        document.addEventListener('touchend', (e) => {
            const endX = e.changedTouches[0].clientX;
            const endY = e.changedTouches[0].clientY;
            const diffX = startX - endX;
            const diffY = startY - endY;
            
            // Only trigger if horizontal swipe is dominant
            if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
                if (diffX > 0) {
                    nextSlide();
                } else {
                    previousSlide();
                }
            }
        });
        
        // Initialize
        showSlide(0);
        
        // Auto-save scroll position
        window.addEventListener('beforeunload', () => {
            localStorage.setItem('presentationSlide', currentSlide.toString());
        });
        
        // Restore scroll position
        window.addEventListener('load', () => {
            const savedSlide = localStorage.getItem('presentationSlide');
            if (savedSlide) {
                currentSlide = parseInt(savedSlide, 10);
                showSlide(currentSlide);
            }
        });
    `;
  }

  /**
   * Process math content for HTML display
   */
  private processMathForHTML(content: string): string {
    // Simple math processing - in a real implementation, you'd use KaTeX or MathJax
    return content.replace(/\$([^$]+)\$/g, '<span class="math">$1</span>');
  }

  /**
   * Escape HTML special characters
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Convert a slide to PowerPoint format
   */
  private async convertSlideToPowerPoint(pptx: any, slide: any, theme: any, options: ExportOptions): Promise<void> {
    const pptxSlide = pptx.addSlide();
    
    // Set slide background if specified
    if (slide.background && slide.background.color) {
      const bg = slide.background.color;
      pptxSlide.background = { color: this.rgbToHex(bg.r, bg.g, bg.b) };
    } else if (theme.colors.background) {
      const bg = theme.colors.background;
      pptxSlide.background = { color: this.rgbToHex(bg.r, bg.g, bg.b) };
    }

    // Sort elements by z-index
    const sortedElements = [...slide.elements].sort((a, b) => 
      (a.properties.zIndex || 0) - (b.properties.zIndex || 0)
    );

    // Convert each element
    for (const element of sortedElements) {
      await this.convertElementToPowerPoint(pptxSlide, element, options);
    }

    // Add slide notes if available
    if (options.includeNotes && slide.notes) {
      pptxSlide.addNotes(slide.notes);
    }
  }

  /**
   * Convert a slide element to PowerPoint format
   */
  private async convertElementToPowerPoint(pptxSlide: any, element: any, options: ExportOptions): Promise<void> {
    const { position, size, properties } = element;
    
    // Convert position and size from pixels to inches (PowerPoint uses inches)
    const x = (position.x || 0) / 96; // 96 DPI conversion
    const y = (position.y || 0) / 96;
    const w = (size.width || 100) / 96;
    const h = (size.height || 50) / 96;

    switch (element.type) {
      case 'text':
        await this.convertTextElementToPowerPoint(pptxSlide, element, x, y, w, h);
        break;
      case 'image':
        await this.convertImageElementToPowerPoint(pptxSlide, element, x, y, w, h);
        break;
      case 'shape':
        await this.convertShapeElementToPowerPoint(pptxSlide, element, x, y, w, h);
        break;
      default:
        // Skip unsupported elements
        break;
    }
  }

  /**
   * Convert text element to PowerPoint
   */
  private async convertTextElementToPowerPoint(pptxSlide: any, element: any, x: number, y: number, w: number, h: number): Promise<void> {
    const { content, properties } = element;
    
    if (!content) return;

    const textOptions: any = {
      x: x,
      y: y,
      w: w,
      h: h,
      fontSize: properties.fontSize || 18,
      bold: properties.fontWeight === 'bold',
      italic: properties.fontStyle === 'italic',
      align: properties.textAlign || 'left',
      valign: properties.verticalAlign || 'top'
    };

    // Set text color
    if (properties.textColor) {
      textOptions.color = this.rgbToHex(
        properties.textColor.r,
        properties.textColor.g,
        properties.textColor.b
      );
    }

    // Set font family
    if (properties.fontFamily) {
      textOptions.fontFace = properties.fontFamily;
    }

    // Handle lists
    if (properties.listType && properties.listType !== 'none') {
      const lines = content.split('\n').filter((line: string) => line.trim());
      const bulletOptions = {
        ...textOptions,
        bullet: properties.listType === 'bullet' ? true : { type: 'number' }
      };
      
      pptxSlide.addText(lines, bulletOptions);
    } else {
      // Handle math content by converting LaTeX to plain text (simplified)
      let processedContent = content;
      if (properties.hasMath) {
        processedContent = this.convertMathToPlainText(content);
      }
      
      pptxSlide.addText(processedContent, textOptions);
    }
  }

  /**
   * Convert image element to PowerPoint
   */
  private async convertImageElementToPowerPoint(pptxSlide: any, element: any, x: number, y: number, w: number, h: number): Promise<void> {
    const { content } = element;
    
    if (!content) return;

    try {
      // For local files, we need to read the file data
      if (content.startsWith('file://') || content.startsWith('/') || content.includes(':\\')) {
        // Local file path - would need to read file data
        pptxSlide.addImage({
          path: content,
          x: x,
          y: y,
          w: w,
          h: h
        });
      } else if (content.startsWith('data:')) {
        // Base64 data URL
        pptxSlide.addImage({
          data: content,
          x: x,
          y: y,
          w: w,
          h: h
        });
      } else {
        // URL - PowerPoint will try to embed it
        pptxSlide.addImage({
          path: content,
          x: x,
          y: y,
          w: w,
          h: h
        });
      }
    } catch (error) {
      // If image fails, add a placeholder text
      pptxSlide.addText(`[Image: ${content}]`, {
        x: x,
        y: y,
        w: w,
        h: h,
        fontSize: 12,
        color: '999999',
        align: 'center',
        valign: 'middle'
      });
    }
  }

  /**
   * Convert shape element to PowerPoint
   */
  private async convertShapeElementToPowerPoint(pptxSlide: any, element: any, x: number, y: number, w: number, h: number): Promise<void> {
    const { properties } = element;
    
    const shapeOptions: any = {
      x: x,
      y: y,
      w: w,
      h: h
    };

    // Set fill color
    if (properties.fillColor) {
      shapeOptions.fill = {
        color: this.rgbToHex(
          properties.fillColor.r,
          properties.fillColor.g,
          properties.fillColor.b
        )
      };
    }

    // Set border
    if (properties.strokeColor && properties.strokeWidth) {
      shapeOptions.line = {
        color: this.rgbToHex(
          properties.strokeColor.r,
          properties.strokeColor.g,
          properties.strokeColor.b
        ),
        width: properties.strokeWidth
      };
    }

    // Determine shape type
    let shapeType = 'rect'; // default
    if (properties.shapeType) {
      switch (properties.shapeType) {
        case 'circle':
        case 'ellipse':
          shapeType = 'ellipse';
          break;
        case 'rectangle':
        case 'square':
          shapeType = 'rect';
          break;
        case 'line':
          shapeType = 'line';
          break;
        case 'arrow':
          shapeType = 'rightArrow';
          break;
        default:
          shapeType = 'rect';
      }
    }

    pptxSlide.addShape(shapeType, shapeOptions);
  }

  /**
   * Convert RGB values to hex color
   */
  private rgbToHex(r: number, g: number, b: number): string {
    const toHex = (n: number) => {
      const hex = Math.round(Math.max(0, Math.min(255, n))).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    return toHex(r) + toHex(g) + toHex(b);
  }

  /**
   * Convert LaTeX math to plain text (simplified)
   */
  private convertMathToPlainText(content: string): string {
    // Simple conversion - remove LaTeX commands and keep the content
    return content
      .replace(/\$([^$]+)\$/g, '$1') // Remove inline math delimiters
      .replace(/\\([a-zA-Z]+)/g, '') // Remove LaTeX commands
      .replace(/[{}]/g, '') // Remove braces
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Write file using Electron API
   */
  private async writeFile(filePath: string, content: string): Promise<void> {
    if (typeof window !== 'undefined' && window.electronAPI) {
      const result = await window.electronAPI.exportWriteFile(filePath, content);
      if (!result.success) {
        throw new Error(result.error || 'Failed to write file');
      }
    } else {
      throw new Error('Electron API not available');
    }
  }

  /**
   * Write binary file using Electron API
   */
  private async writeFileBuffer(filePath: string, buffer: Buffer): Promise<void> {
    if (typeof window !== 'undefined' && window.electronAPI) {
      const result = await window.electronAPI.exportWriteFileBuffer(filePath, buffer);
      if (!result.success) {
        throw new Error(result.error || 'Failed to write file');
      }
    } else {
      throw new Error('Electron API not available');
    }
  }

  /**
   * Get LaTeX generation options based on quality setting
   */
  private getLatexOptionsForQuality(quality: 'low' | 'medium' | 'high'): any {
    switch (quality) {
      case 'high':
        return {
          useHighQualityFonts: true,
          enableMicrotype: true,
          useVectorGraphics: true,
          optimizeForPrint: true,
          includeHyperlinks: true,
          useAdvancedMath: true
        };
      case 'medium':
        return {
          useHighQualityFonts: true,
          enableMicrotype: false,
          useVectorGraphics: true,
          optimizeForPrint: false,
          includeHyperlinks: true,
          useAdvancedMath: false
        };
      case 'low':
        return {
          useHighQualityFonts: false,
          enableMicrotype: false,
          useVectorGraphics: false,
          optimizeForPrint: false,
          includeHyperlinks: false,
          useAdvancedMath: false
        };
      default:
        return this.getLatexOptionsForQuality('medium');
    }
  }

  /**
   * Select optimal LaTeX compiler based on quality setting
   */
  private selectOptimalCompiler(quality: 'low' | 'medium' | 'high'): 'pdflatex' | 'xelatex' | 'lualatex' {
    switch (quality) {
      case 'high':
        return 'xelatex'; // Best for fonts and Unicode support
      case 'medium':
        return 'pdflatex'; // Good balance of speed and quality
      case 'low':
        return 'pdflatex'; // Fastest compilation
      default:
        return 'pdflatex';
    }
  }

  /**
   * Get compilation timeout based on quality setting
   */
  private getTimeoutForQuality(quality: 'low' | 'medium' | 'high'): number {
    switch (quality) {
      case 'high':
        return 120; // 2 minutes for high quality
      case 'medium':
        return 60;  // 1 minute for medium quality
      case 'low':
        return 30;  // 30 seconds for low quality
      default:
        return 60;
    }
  }

  /**
   * Get number of compilation passes based on quality
   */
  private getCompilationPasses(quality: 'low' | 'medium' | 'high'): number {
    switch (quality) {
      case 'high':
        return 3; // Multiple passes for perfect cross-references and TOC
      case 'medium':
        return 2; // Two passes for basic cross-references
      case 'low':
        return 1; // Single pass for speed
      default:
        return 2;
    }
  }

  /**
   * Get DPI setting based on quality
   */
  private getDpiForQuality(quality: 'low' | 'medium' | 'high'): number {
    switch (quality) {
      case 'high':
        return 300; // Print quality
      case 'medium':
        return 150; // Good screen quality
      case 'low':
        return 96;  // Basic screen quality
      default:
        return 150;
    }
  }

  /**
   * Get quality-specific progress messages
   */
  private getQualitySpecificMessage(stage: string, quality: 'low' | 'medium' | 'high'): string {
    const qualityLabel = quality.charAt(0).toUpperCase() + quality.slice(1);
    
    switch (stage) {
      case 'preparing':
        return `Preparing ${qualityLabel.toLowerCase()}-quality compilation...`;
      case 'compiling':
        return `Compiling with ${qualityLabel.toLowerCase()}-quality settings...`;
      case 'processing':
        return `Processing ${qualityLabel.toLowerCase()}-quality output...`;
      default:
        return `${qualityLabel} quality PDF compilation in progress...`;
    }
  }

  /**
   * Post-process PDF for quality enhancements
   */
  private async postProcessPDF(pdfPath: string, options: ExportOptions): Promise<string | null> {
    // This is a placeholder for PDF post-processing
    // In a real implementation, you might:
    // - Optimize PDF size
    // - Add metadata
    // - Apply security settings
    // - Validate PDF/A compliance
    
    if (options.quality === 'high') {
      // For high quality, we might want to add metadata or optimize
      // For now, just return the original path
      return pdfPath;
    }
    
    return null; // No post-processing needed
  }

  /**
   * Format LaTeX source code for clean output
   */
  private formatLatexSource(latexSource: string, options: ExportOptions): string {
    let formatted = latexSource;

    // Normalize line endings
    formatted = formatted.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // Remove excessive blank lines
    formatted = formatted.replace(/\n{3,}/g, '\n\n');

    // Ensure proper indentation
    const lines = formatted.split('\n');
    let indentLevel = 0;
    const indentSize = 2;

    const formattedLines = lines.map(line => {
      const trimmed = line.trim();
      
      if (!trimmed) return '';

      // Decrease indent for closing braces/environments
      if (trimmed.startsWith('}') || trimmed.startsWith('\\end{')) {
        indentLevel = Math.max(0, indentLevel - 1);
      }

      const indentedLine = ' '.repeat(indentLevel * indentSize) + trimmed;

      // Increase indent for opening braces/environments
      if (trimmed.endsWith('{') || trimmed.startsWith('\\begin{')) {
        indentLevel++;
      }

      return indentedLine;
    });

    formatted = formattedLines.join('\n');

    // Clean up spacing around commands
    formatted = formatted.replace(/\\([a-zA-Z]+)\s*{/g, '\\$1{');
    formatted = formatted.replace(/}\s*{/g, '}{');

    return formatted;
  }

  /**
   * Add export metadata as LaTeX comments
   */
  private addLatexExportMetadata(latexSource: string, presentation: Presentation, options: ExportOptions): string {
    const timestamp = new Date().toISOString();
    const metadata = `% Generated by LaTeX Presentation Editor
% Export Date: ${timestamp}
% Format: LaTeX (${options.quality || 'high'} quality)
% Slides: ${presentation.slides.length}
% Title: ${presentation.title || 'Untitled Presentation'}
${presentation.metadata.author ? `% Author: ${presentation.metadata.author}` : ''}
% 
% This file was automatically generated from a visual presentation.
% You can edit this LaTeX source code directly or re-import it
% back into the LaTeX Presentation Editor.
%
% For best results when compiling manually, use:
% ${this.selectOptimalCompiler(options.quality || 'high')} presentation.tex
%

`;

    return metadata + latexSource;
  }

  /**
   * Show save dialog and write file
   */
  private async saveFileWithDialog(content: string, options: { format: string; defaultFileName?: string }): Promise<{ success: boolean; filePath?: string; error?: string; canceled?: boolean }> {
    if (typeof window !== 'undefined' && window.electronAPI) {
      return await window.electronAPI.exportSaveFile(content, options);
    } else {
      return {
        success: false,
        error: 'Electron API not available'
      };
    }
  }

  /**
   * Get supported export formats
   */
  public getSupportedFormats(): Array<{
    id: string;
    name: string;
    extension: string;
    description: string;
    features: string[];
  }> {
    return [
      {
        id: 'pdf',
        name: 'PDF',
        extension: 'pdf',
        description: 'Portable Document Format via LaTeX compilation',
        features: ['High quality', 'Print ready', 'Vector graphics', 'Math support']
      },
      {
        id: 'latex',
        name: 'LaTeX',
        extension: 'tex',
        description: 'LaTeX source code for Beamer presentations',
        features: ['Editable source', 'Professional typesetting', 'Math support', 'Customizable']
      },
      {
        id: 'html',
        name: 'HTML',
        extension: 'html',
        description: 'Interactive HTML presentation',
        features: ['Interactive', 'Responsive', 'Web compatible', 'Keyboard navigation']
      },
      {
        id: 'markdown',
        name: 'Markdown',
        extension: 'md',
        description: 'Markdown format for documentation',
        features: ['Lightweight', 'Version control friendly', 'Platform independent']
      },
      {
        id: 'json',
        name: 'JSON',
        extension: 'json',
        description: 'Structured data format',
        features: ['Machine readable', 'API compatible', 'Backup format']
      },
      {
        id: 'pptx',
        name: 'PowerPoint',
        extension: 'pptx',
        description: 'Microsoft PowerPoint format (coming soon)',
        features: ['Office compatible', 'Widely supported', 'Editable']
      }
    ];
  }

  /**
   * Validate export options
   */
  public validateExportOptions(options: ExportOptions): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!options.format) {
      errors.push('Export format is required');
    }

    if (options.exportRange) {
      if (options.exportRange.start < 1) {
        errors.push('Export range start must be at least 1');
      }
      if (options.exportRange.end < options.exportRange.start) {
        errors.push('Export range end must be greater than or equal to start');
      }
    }

    if (options.quality && !['low', 'medium', 'high'].includes(options.quality)) {
      errors.push('Quality must be low, medium, or high');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

// Export singleton instance
export const exportService = ExportService.getInstance();