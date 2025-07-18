import React, { useEffect, useRef, useState } from 'react';
import katex from 'katex';
import { fabric } from 'fabric';

interface MathRendererProps {
  expression: string;
  fontSize?: number;
  color?: string;
  displayMode?: boolean;
  onRender?: (element: HTMLElement) => void;
}

/**
 * Component that renders LaTeX math expressions and converts them to canvas-compatible format
 */
const MathRenderer: React.FC<MathRendererProps> = ({
  expression,
  fontSize = 16,
  color = '#000000',
  displayMode = false,
  onRender
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [renderedHtml, setRenderedHtml] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!expression.trim()) {
      setRenderedHtml('');
      setError(null);
      return;
    }

    try {
      const html = katex.renderToString(expression, {
        displayMode,
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
      setRenderedHtml(html);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Rendering error');
      setRenderedHtml('');
    }
  }, [expression, displayMode]);

  useEffect(() => {
    if (containerRef.current && renderedHtml && onRender) {
      containerRef.current.style.fontSize = `${fontSize}px`;
      containerRef.current.style.color = color;
      onRender(containerRef.current);
    }
  }, [renderedHtml, fontSize, color, onRender]);

  if (error) {
    return (
      <div 
        ref={containerRef}
        style={{ 
          color: '#cc0000', 
          fontSize: `${fontSize}px`,
          fontFamily: 'monospace',
          backgroundColor: 'rgba(255, 200, 200, 0.3)',
          padding: '2px 4px',
          borderRadius: '2px'
        }}
      >
        Error: {error}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{ 
        fontSize: `${fontSize}px`,
        color,
        display: 'inline-block'
      }}
      dangerouslySetInnerHTML={{ __html: renderedHtml }}
    />
  );
};

/**
 * Utility function to create a Fabric.js object from a math expression
 */
export const createMathFabricObject = async (
  expression: string,
  options: {
    left?: number;
    top?: number;
    fontSize?: number;
    color?: string;
    displayMode?: boolean;
  } = {}
): Promise<fabric.Object> => {
  const {
    left = 0,
    top = 0,
    fontSize = 16,
    color = '#000000',
    displayMode = false
  } = options;

  return new Promise((resolve, reject) => {
    try {
      // Create a temporary container to render the math
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.fontSize = `${fontSize}px`;
      container.style.color = color;
      document.body.appendChild(container);

      // Render the math expression
      const html = katex.renderToString(expression, {
        displayMode,
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

      container.innerHTML = html;

      // Convert to SVG for better canvas compatibility
      const svgData = htmlToSvg(container, fontSize);
      
      // Clean up
      document.body.removeChild(container);

      // Create Fabric.js object from SVG
      fabric.loadSVGFromString(svgData, (objects, options) => {
        const mathObject = fabric.util.groupSVGElements(objects, options);
        mathObject.set({
          left,
          top,
          selectable: true,
        });
        
        // Store math expression data
        mathObject.data = {
          type: 'math',
          expression,
          fontSize,
          color,
          displayMode
        };

        resolve(mathObject);
      });

    } catch (error) {
      // Fallback to text representation
      const fallbackText = new fabric.Text(`[Math: ${expression}]`, {
        left,
        top,
        fontSize,
        fill: color,
        fontFamily: 'monospace',
        backgroundColor: 'rgba(255, 255, 200, 0.5)',
      });
      
      fallbackText.data = {
        type: 'math',
        expression,
        fontSize,
        color,
        displayMode,
        error: error instanceof Error ? error.message : 'Rendering error'
      };

      resolve(fallbackText);
    }
  });
};

/**
 * Convert HTML element to SVG string for canvas rendering
 */
const htmlToSvg = (element: HTMLElement, fontSize: number): string => {
  const rect = element.getBoundingClientRect();
  const width = Math.max(rect.width, 50);
  const height = Math.max(rect.height, fontSize * 1.2);
  
  // Create a simple SVG representation
  // This is a simplified approach - in a production app, you might use html2canvas or similar
  const svgContent = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <foreignObject width="100%" height="100%">
        <div xmlns="http://www.w3.org/1999/xhtml" style="font-size: ${fontSize}px;">
          ${element.innerHTML}
        </div>
      </foreignObject>
    </svg>
  `;
  
  return svgContent;
};

/**
 * Enhanced math text element creator that uses proper math rendering
 */
export const createEnhancedMathTextElement = async (
  content: string,
  position: { x: number; y: number },
  properties: any = {}
): Promise<fabric.Object[]> => {
  const { parseMathContent } = await import('../utils/mathRenderer');
  const segments = parseMathContent(content);
  const objects: fabric.Object[] = [];
  
  let currentY = 0;
  const lineHeight = (properties.fontSize || 16) * 1.4;
  
  for (const segment of segments) {
    if (segment.type === 'text') {
      // Create regular text object
      const textObj = new fabric.Text(segment.content, {
        left: position.x,
        top: position.y + currentY,
        fontSize: properties.fontSize || 16,
        fontFamily: properties.fontFamily || 'Arial',
        fill: properties.textColor ? 
          `rgba(${properties.textColor.r}, ${properties.textColor.g}, ${properties.textColor.b}, ${properties.textColor.a || 1})` : 
          '#000000',
        fontWeight: properties.fontWeight || 'normal',
        fontStyle: properties.fontStyle || 'normal',
      });
      objects.push(textObj);
      currentY += lineHeight;
    } else if (segment.type === 'math') {
      // Create math object
      try {
        const mathObj = await createMathFabricObject(segment.content, {
          left: position.x,
          top: position.y + currentY,
          fontSize: properties.fontSize || 16,
          color: properties.textColor ? 
            `rgba(${properties.textColor.r}, ${properties.textColor.g}, ${properties.textColor.b}, ${properties.textColor.a || 1})` : 
            '#000000',
          displayMode: segment.content.includes('\\') && segment.content.length > 10, // Heuristic for display mode
        });
        objects.push(mathObj);
        currentY += lineHeight;
      } catch (error) {
        // Fallback to text representation
        const fallbackText = new fabric.Text(`[Math: ${segment.content}]`, {
          left: position.x,
          top: position.y + currentY,
          fontSize: properties.fontSize || 16,
          fill: '#cc0000',
          fontFamily: 'monospace',
          backgroundColor: 'rgba(255, 200, 200, 0.3)',
        });
        objects.push(fallbackText);
        currentY += lineHeight;
      }
    }
  }
  
  return objects;
};

export default MathRenderer;