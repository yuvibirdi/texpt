import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import MathRenderer, { createMathFabricObject, createEnhancedMathTextElement } from '../MathRenderer';

// Mock KaTeX
jest.mock('katex', () => ({
  renderToString: jest.fn((expression: string, options: any) => {
    if (expression === 'invalid') {
      throw new Error('Invalid LaTeX');
    }
    return `<span class="katex">${expression}</span>`;
  }),
}));

// Mock Fabric.js
jest.mock('fabric', () => ({
  fabric: {
    Text: jest.fn().mockImplementation((text, options) => ({
      ...options,
      text,
      data: {},
      set: jest.fn(),
    })),
    loadSVGFromString: jest.fn((svg, callback) => {
      const mockObject = {
        set: jest.fn(),
        data: {},
      };
      callback([mockObject], {});
    }),
    util: {
      groupSVGElements: jest.fn((objects) => objects[0]),
    },
  },
}));

describe('MathRenderer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('MathRenderer Component', () => {
    test('renders math expression correctly', async () => {
      render(
        <MathRenderer 
          expression="x^2 + y^2 = z^2" 
          fontSize={16}
          color="#000000"
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/x\^2 \+ y\^2 = z\^2/)).toBeInTheDocument();
      });
    });

    test('renders error for invalid expression', async () => {
      render(
        <MathRenderer 
          expression="invalid" 
          fontSize={16}
          color="#000000"
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Error: Invalid LaTeX/)).toBeInTheDocument();
      });
    });

    test('handles empty expression', () => {
      render(
        <MathRenderer 
          expression="" 
          fontSize={16}
          color="#000000"
        />
      );

      // Should not render anything for empty expression
      expect(screen.queryByText(/Error/)).not.toBeInTheDocument();
    });

    test('applies correct styling', async () => {
      render(
        <MathRenderer 
          expression="x^2" 
          fontSize={20}
          color="#ff0000"
        />
      );

      await waitFor(() => {
        const element = screen.getByText(/x\^2/);
        expect(element).toHaveStyle({
          fontSize: '20px',
          color: '#ff0000',
        });
      });
    });

    test('calls onRender callback when provided', async () => {
      const onRenderMock = jest.fn();
      
      render(
        <MathRenderer 
          expression="x^2" 
          fontSize={16}
          color="#000000"
          onRender={onRenderMock}
        />
      );

      await waitFor(() => {
        expect(onRenderMock).toHaveBeenCalled();
      });
    });
  });

  describe('createMathFabricObject', () => {
    test('creates fabric object for valid math expression', async () => {
      const result = await createMathFabricObject('x^2', {
        left: 10,
        top: 20,
        fontSize: 16,
        color: '#000000',
      });

      expect(result).toBeDefined();
      expect(result.data).toEqual({
        type: 'math',
        expression: 'x^2',
        fontSize: 16,
        color: '#000000',
        displayMode: false,
      });
    });

    test('creates fallback text object for invalid expression', async () => {
      // Mock document methods
      const mockDiv = {
        style: {},
        innerHTML: '',
        getBoundingClientRect: () => ({ width: 100, height: 20 }),
      };
      
      const originalCreateElement = document.createElement;
      document.createElement = jest.fn().mockReturnValue(mockDiv);
      document.body.appendChild = jest.fn();
      document.body.removeChild = jest.fn();

      // Mock KaTeX to throw error
      const katex = require('katex');
      katex.renderToString.mockImplementationOnce(() => {
        throw new Error('Invalid LaTeX');
      });

      const result = await createMathFabricObject('invalid', {
        left: 10,
        top: 20,
        fontSize: 16,
        color: '#000000',
      });

      expect(result).toBeDefined();
      expect(result.data.type).toBe('math');
      expect(result.data.error).toBe('Invalid LaTeX');

      // Restore
      document.createElement = originalCreateElement;
    });

    test('uses default options when not provided', async () => {
      const result = await createMathFabricObject('x^2');

      expect(result.data).toEqual(
        expect.objectContaining({
          type: 'math',
          expression: 'x^2',
          fontSize: 16,
          color: '#000000',
          displayMode: false,
        })
      );
    });
  });

  describe('createEnhancedMathTextElement', () => {
    test('creates objects for mixed text and math content', async () => {
      // Mock the math renderer utility
      jest.doMock('../utils/mathRenderer', () => ({
        parseMathContent: jest.fn().mockReturnValue([
          { type: 'text', content: 'The equation ' },
          { type: 'math', content: 'x^2 + y^2 = z^2' },
          { type: 'text', content: ' is famous.' },
        ]),
      }));

      const result = await createEnhancedMathTextElement(
        'The equation $x^2 + y^2 = z^2$ is famous.',
        { x: 10, y: 20 },
        { fontSize: 16, textColor: { r: 0, g: 0, b: 0 } }
      );

      expect(result).toHaveLength(3); // Two text objects and one math object
      expect(result[0].text).toBe('The equation ');
      expect(result[2].text).toBe(' is famous.');
    });

    test('handles text-only content', async () => {
      // Mock the math renderer utility
      jest.doMock('../utils/mathRenderer', () => ({
        parseMathContent: jest.fn().mockReturnValue([
          { type: 'text', content: 'Plain text only' },
        ]),
      }));

      const result = await createEnhancedMathTextElement(
        'Plain text only',
        { x: 10, y: 20 },
        { fontSize: 16 }
      );

      expect(result).toHaveLength(1);
      expect(result[0].text).toBe('Plain text only');
    });

    test('handles math-only content', async () => {
      // Mock the math renderer utility
      jest.doMock('../utils/mathRenderer', () => ({
        parseMathContent: jest.fn().mockReturnValue([
          { type: 'math', content: 'x^2 + y^2 = z^2' },
        ]),
      }));

      const result = await createEnhancedMathTextElement(
        '$x^2 + y^2 = z^2$',
        { x: 10, y: 20 },
        { fontSize: 16 }
      );

      expect(result).toHaveLength(1);
      expect(result[0].data.type).toBe('math');
    });

    test('applies properties correctly', async () => {
      // Mock the math renderer utility
      jest.doMock('../utils/mathRenderer', () => ({
        parseMathContent: jest.fn().mockReturnValue([
          { type: 'text', content: 'Test text' },
        ]),
      }));

      const properties = {
        fontSize: 20,
        fontFamily: 'Arial',
        textColor: { r: 255, g: 0, b: 0 },
        fontWeight: 'bold',
        fontStyle: 'italic',
      };

      const result = await createEnhancedMathTextElement(
        'Test text',
        { x: 10, y: 20 },
        properties
      );

      expect(result[0].fontSize).toBe(20);
      expect(result[0].fontFamily).toBe('Arial');
      expect(result[0].fill).toBe('rgba(255, 0, 0, 1)');
      expect(result[0].fontWeight).toBe('bold');
      expect(result[0].fontStyle).toBe('italic');
    });

    test('handles errors gracefully', async () => {
      // Mock the math renderer utility to throw an error
      jest.doMock('../utils/mathRenderer', () => ({
        parseMathContent: jest.fn().mockImplementation(() => {
          throw new Error('Parsing error');
        }),
      }));

      // Should not throw, but return empty array or handle gracefully
      const result = await createEnhancedMathTextElement(
        'Test content',
        { x: 10, y: 20 },
        {}
      );

      // The function should handle errors gracefully
      expect(result).toBeDefined();
    });
  });

  describe('Integration', () => {
    test('math renderer integrates with fabric objects', async () => {
      const mathObject = await createMathFabricObject('\\frac{a}{b}', {
        left: 50,
        top: 100,
        fontSize: 18,
        color: '#0066cc',
        displayMode: true,
      });

      expect(mathObject.data).toEqual({
        type: 'math',
        expression: '\\frac{a}{b}',
        fontSize: 18,
        color: '#0066cc',
        displayMode: true,
      });
    });

    test('enhanced text element handles complex expressions', async () => {
      // Mock complex parsing
      jest.doMock('../utils/mathRenderer', () => ({
        parseMathContent: jest.fn().mockReturnValue([
          { type: 'text', content: 'Consider the integral ' },
          { type: 'math', content: '\\int_{0}^{\\infty} e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}' },
          { type: 'text', content: ' which is fundamental.' },
        ]),
      }));

      const result = await createEnhancedMathTextElement(
        'Consider the integral $\\int_{0}^{\\infty} e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}$ which is fundamental.',
        { x: 0, y: 0 },
        { fontSize: 14 }
      );

      expect(result).toHaveLength(3);
      expect(result[1].data.type).toBe('math');
      expect(result[1].data.expression).toBe('\\int_{0}^{\\infty} e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}');
    });
  });
});