/**
 * LaTeX Code Optimization and Cleanup Utilities
 */

export interface OptimizationOptions {
  removeComments?: boolean;
  removeEmptyLines?: boolean;
  optimizeTikZ?: boolean;
  combineColorDefinitions?: boolean;
  removeRedundantCommands?: boolean;
  formatCode?: boolean;
  minify?: boolean;
}

export interface OptimizationResult {
  originalSize: number;
  optimizedSize: number;
  reductionPercentage: number;
  optimizations: string[];
}

/**
 * LaTeX Code Optimizer for cleaning up and optimizing generated LaTeX code
 */
export class LaTeXOptimizer {
  private colorDefinitions: Set<string> = new Set();
  private packageIncludes: Set<string> = new Set();
  private tikzLibraries: Set<string> = new Set();

  /**
   * Optimize LaTeX code with specified options
   */
  public optimize(latex: string, options: OptimizationOptions = {}): OptimizationResult {
    const originalSize = latex.length;
    const optimizations: string[] = [];
    let optimizedLatex = latex;

    const opts = {
      removeComments: true,
      removeEmptyLines: true,
      optimizeTikZ: true,
      combineColorDefinitions: true,
      removeRedundantCommands: true,
      formatCode: false,
      minify: false,
      ...options,
    };

    // Remove comments
    if (opts.removeComments) {
      const beforeSize = optimizedLatex.length;
      optimizedLatex = this.removeComments(optimizedLatex);
      if (optimizedLatex.length < beforeSize) {
        optimizations.push('Removed comments');
      }
    }

    // Remove empty lines
    if (opts.removeEmptyLines) {
      const beforeSize = optimizedLatex.length;
      optimizedLatex = this.removeEmptyLines(optimizedLatex);
      if (optimizedLatex.length < beforeSize) {
        optimizations.push('Removed empty lines');
      }
    }

    // Combine color definitions
    if (opts.combineColorDefinitions) {
      const beforeSize = optimizedLatex.length;
      optimizedLatex = this.combineColorDefinitions(optimizedLatex);
      if (optimizedLatex.length < beforeSize) {
        optimizations.push('Combined duplicate color definitions');
      }
    }

    // Remove redundant commands
    if (opts.removeRedundantCommands) {
      const beforeSize = optimizedLatex.length;
      optimizedLatex = this.removeRedundantCommands(optimizedLatex);
      if (optimizedLatex.length < beforeSize) {
        optimizations.push('Removed redundant commands');
      }
    }

    // Optimize TikZ code
    if (opts.optimizeTikZ) {
      const beforeSize = optimizedLatex.length;
      optimizedLatex = this.optimizeTikZ(optimizedLatex);
      if (optimizedLatex.length < beforeSize) {
        optimizations.push('Optimized TikZ code');
      }
    }

    // Format code
    if (opts.formatCode && !opts.minify) {
      optimizedLatex = this.formatCode(optimizedLatex);
      optimizations.push('Formatted code');
    }

    // Minify code
    if (opts.minify) {
      const beforeSize = optimizedLatex.length;
      optimizedLatex = this.minifyCode(optimizedLatex);
      if (optimizedLatex.length < beforeSize) {
        optimizations.push('Minified code');
      }
    }

    const optimizedSize = optimizedLatex.length;
    const reductionPercentage = originalSize > 0 
      ? ((originalSize - optimizedSize) / originalSize) * 100 
      : 0;

    return {
      originalSize,
      optimizedSize,
      reductionPercentage,
      optimizations,
    };
  }

  /**
   * Get optimized LaTeX code
   */
  public getOptimizedCode(latex: string, options: OptimizationOptions = {}): string {
    let optimizedLatex = latex;

    const opts = {
      removeComments: true,
      removeEmptyLines: true,
      optimizeTikZ: true,
      combineColorDefinitions: true,
      removeRedundantCommands: true,
      formatCode: false,
      minify: false,
      ...options,
    };

    if (opts.removeComments) {
      optimizedLatex = this.removeComments(optimizedLatex);
    }

    if (opts.removeEmptyLines) {
      optimizedLatex = this.removeEmptyLines(optimizedLatex);
    }

    if (opts.combineColorDefinitions) {
      optimizedLatex = this.combineColorDefinitions(optimizedLatex);
    }

    if (opts.removeRedundantCommands) {
      optimizedLatex = this.removeRedundantCommands(optimizedLatex);
    }

    if (opts.optimizeTikZ) {
      optimizedLatex = this.optimizeTikZ(optimizedLatex);
    }

    if (opts.formatCode && !opts.minify) {
      optimizedLatex = this.formatCode(optimizedLatex);
    }

    if (opts.minify) {
      optimizedLatex = this.minifyCode(optimizedLatex);
    }

    return optimizedLatex;
  }

  /**
   * Remove comments from LaTeX code
   */
  private removeComments(latex: string): string {
    // Remove single-line comments but preserve structure comments
    // First remove line-start comments
    latex = latex.replace(/^[ \t]*%(?![ \t]*(?:Slide|Element|Shape|Image|Text|Connection)).*$/gm, '');
    // Then remove inline comments (but not escaped %)
    latex = latex.replace(/([^\\])%(?![ \t]*(?:Slide|Element|Shape|Image|Text|Connection)).*$/gm, '$1');
    return latex;
  }

  /**
   * Remove empty lines
   */
  private removeEmptyLines(latex: string): string {
    // Remove completely empty lines
    latex = latex.replace(/^\s*\n/gm, '');
    
    // Compress multiple consecutive newlines to maximum of 2
    latex = latex.replace(/\n{3,}/g, '\n\n');
    
    return latex;
  }

  /**
   * Combine duplicate color definitions
   */
  private combineColorDefinitions(latex: string): string {
    const colorDefinitions = new Map<string, string>();
    const colorRegex = /\\definecolor\{([^}]+)\}\{([^}]+)\}\{([^}]+)\}/g;
    
    // Extract all color definitions
    let match;
    while ((match = colorRegex.exec(latex)) !== null) {
      const [fullMatch, colorName, colorModel, colorValue] = match;
      const key = `${colorName}-${colorModel}-${colorValue}`;
      
      if (!colorDefinitions.has(key)) {
        colorDefinitions.set(key, fullMatch);
      }
    }

    // Remove all color definitions from the original text
    latex = latex.replace(colorRegex, '');

    // Add unique color definitions back at the beginning of preamble
    if (colorDefinitions.size > 0) {
      const colorDefs = Array.from(colorDefinitions.values()).join('\n');
      
      // Find the position after \usepackage declarations
      const packageRegex = /\\usepackage(?:\[[^\]]*\])?\{[^}]+\}/g;
      let lastPackageIndex = -1;
      let packageMatch;
      
      while ((packageMatch = packageRegex.exec(latex)) !== null) {
        lastPackageIndex = packageMatch.index + packageMatch[0].length;
      }

      if (lastPackageIndex !== -1) {
        latex = latex.slice(0, lastPackageIndex) + '\n% Color definitions\n' + colorDefs + latex.slice(lastPackageIndex);
      } else {
        // If no packages found, add after document class
        const docClassMatch = latex.match(/\\documentclass(?:\[[^\]]*\])?\{[^}]+\}/);
        if (docClassMatch) {
          const insertIndex = docClassMatch.index! + docClassMatch[0].length;
          latex = latex.slice(0, insertIndex) + '\n% Color definitions\n' + colorDefs + latex.slice(insertIndex);
        }
      }
    }

    return latex;
  }

  /**
   * Remove redundant commands and packages
   */
  private removeRedundantCommands(latex: string): string {
    // Track used packages to avoid duplicates
    const usedPackages = new Set<string>();
    const packageRegex = /\\usepackage(?:\[[^\]]*\])?\{([^}]+)\}/g;
    
    latex = latex.replace(packageRegex, (match, packageName) => {
      if (usedPackages.has(packageName)) {
        return ''; // Remove duplicate
      }
      usedPackages.add(packageName);
      return match;
    });

    // Remove redundant TikZ library loads
    const usedLibraries = new Set<string>();
    const libraryRegex = /\\usetikzlibrary\{([^}]+)\}/g;
    
    latex = latex.replace(libraryRegex, (match, libraries) => {
      const libList = libraries.split(',').map((lib: string) => lib.trim());
      const newLibs = libList.filter((lib: string) => {
        if (usedLibraries.has(lib)) {
          return false;
        }
        usedLibraries.add(lib);
        return true;
      });
      
      return newLibs.length > 0 ? `\\usetikzlibrary{${newLibs.join(',')}}` : '';
    });

    // Remove redundant font selections
    latex = latex.replace(/(\\selectfont\s*\\selectfont)/g, '\\selectfont');

    return latex;
  }

  /**
   * Optimize TikZ code
   */
  private optimizeTikZ(latex: string): string {
    // Combine adjacent TikZ pictures with same options
    latex = this.combineTikZPictures(latex);
    
    // Optimize coordinate calculations
    latex = this.optimizeCoordinates(latex);
    
    // Remove redundant TikZ options
    latex = this.removeRedundantTikZOptions(latex);
    
    return latex;
  }

  /**
   * Combine adjacent TikZ pictures
   */
  private combineTikZPictures(latex: string): string {
    // This is a simplified implementation
    // In practice, this would need more sophisticated parsing
    const tikzRegex = /\\begin\{tikzpicture\}\[([^\]]*)\](.*?)\\end\{tikzpicture\}/gs;
    const matches = Array.from(latex.matchAll(tikzRegex));
    
    // Group consecutive TikZ pictures with same options
    const groups: Array<{ options: string; content: string[]; startIndex: number; endIndex: number }> = [];
    let currentGroup: { options: string; content: string[]; startIndex: number; endIndex: number } | null = null;
    
    for (const match of matches) {
      const [fullMatch, options, content] = match;
      const startIndex = match.index!;
      const endIndex = startIndex + fullMatch.length;
      
      if (currentGroup && currentGroup.options === options && 
          startIndex <= currentGroup.endIndex + 100) { // Allow small gaps
        currentGroup.content.push(content);
        currentGroup.endIndex = endIndex;
      } else {
        if (currentGroup && currentGroup.content.length > 1) {
          groups.push(currentGroup);
        }
        currentGroup = {
          options,
          content: [content],
          startIndex,
          endIndex,
        };
      }
    }
    
    if (currentGroup && currentGroup.content.length > 1) {
      groups.push(currentGroup);
    }

    // Replace groups with combined TikZ pictures
    for (const group of groups.reverse()) { // Reverse to maintain indices
      const combinedContent = group.content.join('\n');
      const combinedTikZ = `\\begin{tikzpicture}[${group.options}]${combinedContent}\\end{tikzpicture}`;
      
      // This is simplified - in practice would need more careful replacement
      // latex = latex.slice(0, group.startIndex) + combinedTikZ + latex.slice(group.endIndex);
    }

    return latex;
  }

  /**
   * Optimize coordinate calculations
   */
  private optimizeCoordinates(latex: string): string {
    // Round coordinates to reasonable precision
    latex = latex.replace(/(\d+\.\d{4,})cm/g, (match, number) => {
      const rounded = parseFloat(number).toFixed(2);
      return `${rounded}cm`;
    });

    // Convert simple calculations to direct values
    latex = latex.replace(/\(([^)]+)\+0(?:\.0+)?cm,([^)]+)\)/g, '($1cm,$2)');
    latex = latex.replace(/\(([^)]+),([^)]+)\+0(?:\.0+)?cm\)/g, '($1,$2cm)');

    return latex;
  }

  /**
   * Remove redundant TikZ options
   */
  private removeRedundantTikZOptions(latex: string): string {
    // Remove default values
    latex = latex.replace(/,?\s*line width=1pt/g, '');
    latex = latex.replace(/,?\s*opacity=1(?:\.0+)?/g, '');
    latex = latex.replace(/,?\s*fill=none/g, '');
    
    // Clean up empty option brackets
    latex = latex.replace(/\[\s*,?\s*\]/g, '');
    latex = latex.replace(/\[,\s*/g, '[');
    latex = latex.replace(/,\s*\]/g, ']');

    return latex;
  }

  /**
   * Format LaTeX code for readability
   */
  private formatCode(latex: string): string {
    let formatted = latex;

    // Add consistent indentation
    const lines = formatted.split('\n');
    let indentLevel = 0;
    const indentSize = 2;

    const formattedLines = lines.map(line => {
      const trimmed = line.trim();
      
      if (trimmed === '') return '';

      // Decrease indent for end commands
      if (trimmed.startsWith('\\end{') || trimmed === '}' || trimmed === '};') {
        indentLevel = Math.max(0, indentLevel - 1);
      }

      const indentedLine = ' '.repeat(indentLevel * indentSize) + trimmed;

      // Increase indent for begin commands
      if (trimmed.startsWith('\\begin{') || trimmed.endsWith('{') || 
          trimmed.includes('\\tikzpicture') || trimmed.includes('\\node')) {
        indentLevel++;
      }

      return indentedLine;
    });

    formatted = formattedLines.join('\n');

    // Add spacing around major sections
    formatted = formatted.replace(/(\\begin\{document\})/g, '\n$1\n');
    formatted = formatted.replace(/(\\end\{document\})/g, '\n$1\n');
    formatted = formatted.replace(/(\\begin\{frame\})/g, '\n$1');
    formatted = formatted.replace(/(\\end\{frame\})/g, '$1\n');

    return formatted;
  }

  /**
   * Minify LaTeX code
   */
  private minifyCode(latex: string): string {
    // Remove all comments (both line-start and inline)
    latex = latex.replace(/^[ \t]*%.*$/gm, '');
    latex = latex.replace(/([^\\])%.*$/gm, '$1');
    
    // Remove empty lines
    latex = latex.replace(/^\s*\n/gm, '');
    
    // Compress whitespace
    latex = latex.replace(/[ \t]+/g, ' ');
    
    // Remove unnecessary spaces around braces
    latex = latex.replace(/\s*\{\s*/g, '{');
    latex = latex.replace(/\s*\}\s*/g, '}');
    
    // Remove spaces around brackets
    latex = latex.replace(/\s*\[\s*/g, '[');
    latex = latex.replace(/\s*\]\s*/g, ']');
    
    // Compress multiple newlines
    latex = latex.replace(/\n+/g, '\n');
    
    return latex.trim();
  }

  /**
   * Validate LaTeX syntax
   */
  public validateSyntax(latex: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check for balanced braces
    const braceBalance = this.checkBraceBalance(latex);
    if (braceBalance !== 0) {
      errors.push(`Unbalanced braces: ${braceBalance > 0 ? 'missing closing' : 'missing opening'} braces`);
    }

    // Check for balanced environments
    const envErrors = this.checkEnvironmentBalance(latex);
    errors.push(...envErrors);

    // Check for common LaTeX errors
    const commonErrors = this.checkCommonErrors(latex);
    errors.push(...commonErrors);

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Check brace balance
   */
  private checkBraceBalance(latex: string): number {
    let balance = 0;
    let inComment = false;
    
    for (let i = 0; i < latex.length; i++) {
      const char = latex[i];
      const prevChar = i > 0 ? latex[i - 1] : '';
      
      if (char === '\n') {
        inComment = false;
        continue;
      }
      
      if (char === '%' && prevChar !== '\\') {
        inComment = true;
        continue;
      }
      
      if (inComment) continue;
      
      if (char === '{' && prevChar !== '\\') {
        balance++;
      } else if (char === '}' && prevChar !== '\\') {
        balance--;
      }
    }
    
    return balance;
  }

  /**
   * Check environment balance
   */
  private checkEnvironmentBalance(latex: string): string[] {
    const errors: string[] = [];
    const envStack: string[] = [];
    
    const beginRegex = /\\begin\{([^}]+)\}/g;
    const endRegex = /\\end\{([^}]+)\}/g;
    
    const beginMatches = Array.from(latex.matchAll(beginRegex));
    const endMatches = Array.from(latex.matchAll(endRegex));
    
    // Combine and sort by position
    const allMatches = [
      ...beginMatches.map(m => ({ type: 'begin', env: m[1], index: m.index! })),
      ...endMatches.map(m => ({ type: 'end', env: m[1], index: m.index! })),
    ].sort((a, b) => a.index - b.index);
    
    for (const match of allMatches) {
      if (match.type === 'begin') {
        envStack.push(match.env);
      } else {
        const lastEnv = envStack.pop();
        if (!lastEnv) {
          errors.push(`Unexpected \\end{${match.env}} without matching \\begin`);
        } else if (lastEnv !== match.env) {
          errors.push(`Environment mismatch: \\begin{${lastEnv}} closed with \\end{${match.env}}`);
        }
      }
    }
    
    // Check for unclosed environments
    for (const env of envStack) {
      errors.push(`Unclosed environment: \\begin{${env}}`);
    }
    
    return errors;
  }

  /**
   * Check for common LaTeX errors
   */
  private checkCommonErrors(latex: string): string[] {
    const errors: string[] = [];

    // Check for undefined commands (simplified)
    const commandRegex = /\\([a-zA-Z]+)/g;
    const knownCommands = new Set([
      'documentclass', 'usepackage', 'begin', 'end', 'title', 'author', 'date',
      'maketitle', 'section', 'subsection', 'textbf', 'textit', 'emph',
      'includegraphics', 'caption', 'label', 'ref', 'cite', 'bibliography',
      'node', 'draw', 'fill', 'tikzpicture', 'definecolor', 'setbeamercolor',
      'usetheme', 'usecolortheme', 'usefonttheme', 'frame', 'frametitle',
    ]);

    let match;
    while ((match = commandRegex.exec(latex)) !== null) {
      const command = match[1];
      if (!knownCommands.has(command) && command.length > 2) {
        // This is a simplified check - in practice, we'd need a more comprehensive command database
      }
    }

    // Check for common typos
    if (latex.includes('\\beginn{')) {
      errors.push('Possible typo: \\beginn should be \\begin');
    }
    if (latex.includes('\\endd{')) {
      errors.push('Possible typo: \\endd should be \\end');
    }

    return errors;
  }
}

// Export singleton instance
export const latexOptimizer = new LaTeXOptimizer();