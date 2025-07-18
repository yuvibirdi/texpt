import katex from 'katex';

export interface MathSegment {
  type: 'text' | 'math';
  content: string;
  rendered?: string;
}

/**
 * Parse text content that may contain LaTeX math expressions
 * Math expressions are expected to be wrapped in $$ ... $$ for display math
 * or $ ... $ for inline math
 */
export function parseMathContent(content: string): MathSegment[] {
  const segments: MathSegment[] = [];
  let currentIndex = 0;
  
  // Regular expression to match both inline ($...$) and display ($$...$$) math
  const mathRegex = /\$\$([^$]+)\$\$|\$([^$]+)\$/g;
  let match;
  
  while ((match = mathRegex.exec(content)) !== null) {
    // Add text before the math expression
    if (match.index > currentIndex) {
      const textContent = content.substring(currentIndex, match.index);
      if (textContent) {
        segments.push({
          type: 'text',
          content: textContent
        });
      }
    }
    
    // Add the math expression
    const mathContent = match[1] || match[2]; // Display math ($$) or inline math ($)
    const isDisplayMath = !!match[1];
    
    try {
      const rendered = katex.renderToString(mathContent, {
        displayMode: isDisplayMath,
        throwOnError: true,
        errorColor: '#cc0000',
        macros: {
          '\\RR': '\\mathbb{R}',
          '\\NN': '\\mathbb{N}',
          '\\ZZ': '\\mathbb{Z}',
          '\\QQ': '\\mathbb{Q}',
          '\\CC': '\\mathbb{C}',
          '\\eps': '\\varepsilon',
          '\\phi': '\\varphi',
          '\\implies': '\\Rightarrow',
          '\\iff': '\\Leftrightarrow',
        },
      });
      
      segments.push({
        type: 'math',
        content: mathContent,
        rendered: rendered
      });
    } catch (error) {
      // If rendering fails, treat as text
      segments.push({
        type: 'text',
        content: match[0] // Include the original $$ or $ markers
      });
    }
    
    currentIndex = match.index + match[0].length;
  }
  
  // Add remaining text after the last math expression
  if (currentIndex < content.length) {
    const remainingText = content.substring(currentIndex);
    if (remainingText) {
      segments.push({
        type: 'text',
        content: remainingText
      });
    }
  }
  
  // If no math expressions were found, return the entire content as text
  if (segments.length === 0) {
    segments.push({
      type: 'text',
      content: content
    });
  }
  
  return segments;
}

/**
 * Render math content to HTML string for display
 */
export function renderMathToHTML(content: string): string {
  const segments = parseMathContent(content);
  
  return segments.map(segment => {
    if (segment.type === 'math' && segment.rendered) {
      return segment.rendered;
    } else {
      // Escape HTML in text segments
      return segment.content
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }
  }).join('');
}

/**
 * Check if content contains math expressions
 */
export function containsMath(content: string): boolean {
  return /\$\$[^$]+\$\$|\$[^$]+\$/.test(content);
}

/**
 * Extract all math expressions from content
 */
export function extractMathExpressions(content: string): string[] {
  const segments = parseMathContent(content);
  return segments
    .filter(segment => segment.type === 'math')
    .map(segment => segment.content);
}

/**
 * Validate a LaTeX math expression
 */
export function validateMathExpression(expression: string): { isValid: boolean; error?: string } {
  try {
    katex.renderToString(expression, {
      displayMode: true,
      throwOnError: true,
    });
    return { isValid: true };
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Invalid LaTeX syntax'
    };
  }
}

/**
 * Convert math content to LaTeX for export
 */
export function convertToLaTeX(content: string): string {
  const segments = parseMathContent(content);
  
  return segments.map(segment => {
    if (segment.type === 'math') {
      // For LaTeX export, we want to preserve the math delimiters
      return `$${segment.content}$`;
    } else {
      // Escape special LaTeX characters in text
      return segment.content
        .replace(/\\/g, '\\textbackslash{}')
        .replace(/\{/g, '\\{')
        .replace(/\}/g, '\\}')
        .replace(/\$/g, '\\$')
        .replace(/&/g, '\\&')
        .replace(/%/g, '\\%')
        .replace(/#/g, '\\#')
        .replace(/\^/g, '\\textasciicircum{}')
        .replace(/_/g, '\\_')
        .replace(/~/g, '\\textasciitilde{}');
    }
  }).join('');
}