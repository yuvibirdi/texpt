import { LaTeXOptimizer } from '../latexOptimizer';

describe('LaTeXOptimizer', () => {
  let optimizer: LaTeXOptimizer;

  beforeEach(() => {
    optimizer = new LaTeXOptimizer();
  });

  describe('comment removal', () => {
    it('should remove single-line comments', () => {
      const latex = `
\\documentclass{beamer}
% This is a comment
\\usepackage{amsmath}
% Another comment
\\begin{document}
      `.trim();

      const result = optimizer.getOptimizedCode(latex, { removeComments: true });
      
      expect(result).not.toContain('% This is a comment');
      expect(result).not.toContain('% Another comment');
      expect(result).toContain('\\documentclass{beamer}');
      expect(result).toContain('\\usepackage{amsmath}');
    });

    it('should preserve structure comments', () => {
      const latex = `
\\documentclass{beamer}
% Slide: Introduction
\\begin{frame}
% Element: Title
\\node {Title};
\\end{frame}
      `.trim();

      const result = optimizer.getOptimizedCode(latex, { removeComments: true });
      
      expect(result).toContain('% Slide: Introduction');
      expect(result).toContain('% Element: Title');
    });

    it('should not remove escaped percent signs', () => {
      const latex = `
\\documentclass{beamer}
\\node {50\\% complete};
% This is a comment
      `.trim();

      const result = optimizer.getOptimizedCode(latex, { removeComments: true });
      
      expect(result).toContain('50\\% complete');
      expect(result).not.toContain('% This is a comment');
    });
  });

  describe('empty line removal', () => {
    it('should remove empty lines', () => {
      const latex = `
\\documentclass{beamer}


\\usepackage{amsmath}



\\begin{document}
      `.trim();

      const result = optimizer.getOptimizedCode(latex, { removeEmptyLines: true });
      
      const lines = result.split('\n');
      const emptyLines = lines.filter(line => line.trim() === '');
      
      expect(emptyLines.length).toBeLessThan(3);
    });

    it('should compress multiple consecutive newlines', () => {
      const latex = `
\\documentclass{beamer}




\\usepackage{amsmath}
      `.trim();

      const result = optimizer.getOptimizedCode(latex, { removeEmptyLines: true });
      
      expect(result).not.toMatch(/\n{3,}/);
    });
  });

  describe('color definition optimization', () => {
    it('should combine duplicate color definitions', () => {
      const latex = `
\\documentclass{beamer}
\\definecolor{red}{RGB}{255,0,0}
\\usepackage{amsmath}
\\definecolor{red}{RGB}{255,0,0}
\\definecolor{blue}{RGB}{0,0,255}
\\definecolor{red}{RGB}{255,0,0}
\\begin{document}
      `.trim();

      const result = optimizer.getOptimizedCode(latex, { combineColorDefinitions: true });
      
      const redDefinitions = (result.match(/\\definecolor\{red\}\{RGB\}\{255,0,0\}/g) || []).length;
      expect(redDefinitions).toBe(1);
      
      expect(result).toContain('\\definecolor{blue}{RGB}{0,0,255}');
    });

    it('should place color definitions after packages', () => {
      const latex = `
\\documentclass{beamer}
\\usepackage{amsmath}
\\definecolor{red}{RGB}{255,0,0}
\\usepackage{tikz}
\\definecolor{blue}{RGB}{0,0,255}
\\begin{document}
      `.trim();

      const result = optimizer.getOptimizedCode(latex, { combineColorDefinitions: true });
      
      const packageIndex = result.lastIndexOf('\\usepackage');
      const colorIndex = result.indexOf('\\definecolor');
      
      expect(colorIndex).toBeGreaterThan(packageIndex);
    });
  });

  describe('redundant command removal', () => {
    it('should remove duplicate package includes', () => {
      const latex = `
\\documentclass{beamer}
\\usepackage{amsmath}
\\usepackage{tikz}
\\usepackage{amsmath}
\\usepackage{graphicx}
\\usepackage{tikz}
\\begin{document}
      `.trim();

      const result = optimizer.getOptimizedCode(latex, { removeRedundantCommands: true });
      
      const amsmathCount = (result.match(/\\usepackage\{amsmath\}/g) || []).length;
      const tikzCount = (result.match(/\\usepackage\{tikz\}/g) || []).length;
      
      expect(amsmathCount).toBe(1);
      expect(tikzCount).toBe(1);
    });

    it('should remove duplicate TikZ library loads', () => {
      const latex = `
\\documentclass{beamer}
\\usetikzlibrary{shapes,arrows}
\\usetikzlibrary{positioning}
\\usetikzlibrary{shapes,calc}
\\usetikzlibrary{arrows}
\\begin{document}
      `.trim();

      const result = optimizer.getOptimizedCode(latex, { removeRedundantCommands: true });
      
      const shapesCount = (result.match(/shapes/g) || []).length;
      const arrowsCount = (result.match(/arrows/g) || []).length;
      
      expect(shapesCount).toBe(1);
      expect(arrowsCount).toBe(1);
    });
  });

  describe('code minification', () => {
    it('should remove all comments when minifying', () => {
      const latex = `
\\documentclass{beamer}
% This comment should be removed
\\usepackage{amsmath} % This too
\\begin{document}
      `.trim();

      const result = optimizer.getOptimizedCode(latex, { minify: true });
      
      expect(result).not.toContain('%');
    });

    it('should compress whitespace when minifying', () => {
      const latex = `
\\documentclass{beamer}
\\usepackage   {   amsmath   }
\\begin  {  document  }
      `.trim();

      const result = optimizer.getOptimizedCode(latex, { minify: true });
      
      expect(result).not.toMatch(/\s{2,}/);
      expect(result).toContain('\\usepackage{amsmath}');
      expect(result).toContain('\\begin{document}');
    });

    it('should remove unnecessary spaces around braces', () => {
      const latex = `
\\documentclass { beamer }
\\node [ draw ] { content }
      `.trim();

      const result = optimizer.getOptimizedCode(latex, { minify: true });
      
      expect(result).toContain('\\documentclass{beamer}');
      expect(result).toContain('\\node[draw]{content}');
    });
  });

  describe('code formatting', () => {
    it('should add consistent indentation', () => {
      const latex = `
\\begin{document}
\\begin{frame}
\\node {content};
\\end{frame}
\\end{document}
      `.trim();

      const result = optimizer.getOptimizedCode(latex, { formatCode: true });
      
      const lines = result.split('\n');
      const frameBeginLine = lines.find(line => line.includes('\\begin{frame}'));
      const nodeLine = lines.find(line => line.includes('\\node'));
      
      if (frameBeginLine && nodeLine) {
        const frameIndent = frameBeginLine.match(/^(\s*)/)?.[1]?.length || 0;
        const nodeIndent = nodeLine.match(/^(\s*)/)?.[1]?.length || 0;
        
        expect(nodeIndent).toBeGreaterThan(frameIndent);
      }
    });

    it('should add spacing around major sections', () => {
      const latex = `
\\usepackage{amsmath}
\\begin{document}
\\begin{frame}
\\end{frame}
\\end{document}
      `.trim();

      const result = optimizer.getOptimizedCode(latex, { formatCode: true });
      
      expect(result).toMatch(/\\begin\{document\}\n/);
      expect(result).toMatch(/\n\\end\{document\}/);
    });
  });

  describe('optimization results', () => {
    it('should return optimization statistics', () => {
      const latex = `
\\documentclass{beamer}
% This is a comment
% Another comment


\\usepackage{amsmath}



\\begin{document}
      `.trim();

      const result = optimizer.optimize(latex, {
        removeComments: true,
        removeEmptyLines: true,
      });
      
      expect(result.originalSize).toBeGreaterThan(0);
      expect(result.optimizedSize).toBeLessThan(result.originalSize);
      expect(result.reductionPercentage).toBeGreaterThan(0);
      expect(result.optimizations).toContain('Removed comments');
      expect(result.optimizations).toContain('Removed empty lines');
    });

    it('should track which optimizations were applied', () => {
      const latex = `
\\documentclass{beamer}
% Comment
\\definecolor{red}{RGB}{255,0,0}
\\definecolor{red}{RGB}{255,0,0}
\\begin{document}
      `.trim();

      const result = optimizer.optimize(latex, {
        removeComments: true,
        combineColorDefinitions: true,
        removeRedundantCommands: false,
      });
      
      expect(result.optimizations).toContain('Removed comments');
      expect(result.optimizations).toContain('Combined duplicate color definitions');
      expect(result.optimizations).not.toContain('Removed redundant commands');
    });
  });

  describe('syntax validation', () => {
    it('should validate balanced braces', () => {
      const validLatex = '\\documentclass{beamer}\\begin{document}\\end{document}';
      const invalidLatex = '\\documentclass{beamer\\begin{document}\\end{document}';
      
      const validResult = optimizer.validateSyntax(validLatex);
      const invalidResult = optimizer.validateSyntax(invalidLatex);
      
      expect(validResult.isValid).toBe(true);
      expect(validResult.errors).toHaveLength(0);
      
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors.length).toBeGreaterThan(0);
      expect(invalidResult.errors[0]).toContain('brace');
    });

    it('should validate balanced environments', () => {
      const validLatex = '\\begin{document}\\begin{frame}\\end{frame}\\end{document}';
      const invalidLatex = '\\begin{document}\\begin{frame}\\end{document}';
      
      const validResult = optimizer.validateSyntax(validLatex);
      const invalidResult = optimizer.validateSyntax(invalidLatex);
      
      expect(validResult.isValid).toBe(true);
      
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors.some(error => error.includes('Unclosed environment'))).toBe(true);
    });

    it('should detect environment mismatches', () => {
      const invalidLatex = '\\begin{document}\\begin{frame}\\end{itemize}\\end{document}';
      
      const result = optimizer.validateSyntax(invalidLatex);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('Environment mismatch'))).toBe(true);
    });

    it('should detect common typos', () => {
      const latexWithTypos = '\\beginn{document}\\endd{document}';
      
      const result = optimizer.validateSyntax(latexWithTypos);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('\\beginn'))).toBe(true);
      expect(result.errors.some(error => error.includes('\\endd'))).toBe(true);
    });

    it('should ignore comments when validating', () => {
      const latexWithComments = `
\\begin{document}
% This is a comment with unbalanced { brace
\\begin{frame}
% Another comment
\\end{frame}
\\end{document}
      `.trim();
      
      const result = optimizer.validateSyntax(latexWithComments);
      
      expect(result.isValid).toBe(true);
    });
  });

  describe('TikZ optimization', () => {
    it('should optimize coordinate precision', () => {
      const latex = `
\\begin{tikzpicture}
\\node at (1.23456789cm,2.98765432cm) {test};
\\draw (0.00000000cm,1.11111111cm) -- (3.33333333cm,4.44444444cm);
\\end{tikzpicture}
      `.trim();

      const result = optimizer.getOptimizedCode(latex, { optimizeTikZ: true });
      
      expect(result).toContain('1.23cm');
      expect(result).toContain('2.99cm');
      expect(result).toContain('3.33cm');
      expect(result).toContain('4.44cm');
    });

    it('should remove redundant TikZ options', () => {
      const latex = `
\\begin{tikzpicture}
\\draw[line width=1pt,opacity=1.0,fill=none] (0,0) rectangle (1,1);
\\end{tikzpicture}
      `.trim();

      const result = optimizer.getOptimizedCode(latex, { optimizeTikZ: true });
      
      expect(result).not.toContain('line width=1pt');
      expect(result).not.toContain('opacity=1.0');
      expect(result).not.toContain('fill=none');
    });

    it('should clean up empty option brackets', () => {
      const latex = `
\\begin{tikzpicture}
\\draw[] (0,0) -- (1,1);
\\node[,] at (0,0) {test};
\\end{tikzpicture}
      `.trim();

      const result = optimizer.getOptimizedCode(latex, { optimizeTikZ: true });
      
      expect(result).toContain('\\draw (0,0) -- (1,1)');
      expect(result).toContain('\\node at (0,0) {test}');
    });
  });

  describe('integration with different options', () => {
    it('should apply multiple optimizations together', () => {
      const latex = `
\\documentclass{beamer}
% Comment to remove
\\definecolor{red}{RGB}{255,0,0}


\\usepackage{amsmath}
\\definecolor{red}{RGB}{255,0,0}
% Another comment



\\begin{document}
      `.trim();

      const result = optimizer.getOptimizedCode(latex, {
        removeComments: true,
        removeEmptyLines: true,
        combineColorDefinitions: true,
        removeRedundantCommands: true,
      });
      
      expect(result).not.toContain('% Comment');
      expect(result).not.toMatch(/\n{3,}/);
      
      const colorDefinitions = (result.match(/\\definecolor\{red\}/g) || []).length;
      expect(colorDefinitions).toBe(1);
    });

    it('should not format when minifying', () => {
      const latex = `
\\begin{document}
\\begin{frame}
\\end{frame}
\\end{document}
      `.trim();

      const formatted = optimizer.getOptimizedCode(latex, { formatCode: true, minify: false });
      const minified = optimizer.getOptimizedCode(latex, { formatCode: true, minify: true });
      
      expect(minified.length).toBeLessThan(formatted.length);
      expect(minified).not.toMatch(/\s{2,}/);
    });
  });
});