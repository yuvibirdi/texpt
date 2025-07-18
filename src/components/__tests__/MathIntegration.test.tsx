import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import presentationSlice from '../../store/slices/presentationSlice';
import uiSlice from '../../store/slices/uiSlice';
import TextFormattingToolbar from '../TextFormattingToolbar';
import { parseMathContent, containsMath, extractMathExpressions } from '../../utils/mathRenderer';

// Mock KaTeX
jest.mock('katex', () => ({
  renderToString: jest.fn((expression: string) => {
    if (expression === 'invalid') {
      throw new Error('Invalid LaTeX');
    }
    return `<span class="katex">${expression}</span>`;
  }),
}));

// Mock CSS imports
jest.mock('../MathInput.css', () => ({}));
jest.mock('../TextFormattingToolbar.css', () => ({}));

describe('Math Integration Tests', () => {
  let store: any;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        presentation: presentationSlice,
        ui: uiSlice,
      },
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
          serializableCheck: false,
        }),
    });

    // Create a test presentation with a slide and text element
    store.dispatch({
      type: 'presentation/createPresentation',
      payload: { title: 'Test Presentation' }
    });

    store.dispatch({
      type: 'presentation/addElement',
      payload: {
        slideId: store.getState().presentation.currentPresentation.slides[0].id,
        element: {
          type: 'text',
          position: { x: 10, y: 10 },
          size: { width: 200, height: 50 },
          properties: {
            fontSize: 16,
            fontFamily: 'Arial',
            textColor: { r: 0, g: 0, b: 0 },
          },
          content: 'Test text',
        }
      }
    });
  });

  describe('Math Utility Functions', () => {
    test('parseMathContent correctly identifies math and text segments', () => {
      const content = 'The equation $x^2 + y^2 = z^2$ is famous.';
      const segments = parseMathContent(content);

      expect(segments).toHaveLength(3);
      expect(segments[0]).toEqual({ type: 'text', content: 'The equation ' });
      expect(segments[1]).toEqual({ 
        type: 'math', 
        content: 'x^2 + y^2 = z^2',
        rendered: '<span class="katex">x^2 + y^2 = z^2</span>'
      });
      expect(segments[2]).toEqual({ type: 'text', content: ' is famous.' });
    });

    test('containsMath correctly detects math expressions', () => {
      expect(containsMath('Plain text')).toBe(false);
      expect(containsMath('Text with $x^2$ math')).toBe(true);
      expect(containsMath('Display math $$\\frac{a}{b}$$')).toBe(true);
      expect(containsMath('No math here')).toBe(false);
    });

    test('extractMathExpressions extracts all math expressions', () => {
      const content = 'First $a = b$ then $$c = d$$ finally $e = f$.';
      const expressions = extractMathExpressions(content);

      expect(expressions).toEqual(['a = b', 'c = d', 'e = f']);
    });

    test('handles mixed inline and display math', () => {
      const content = 'Inline $x^2$ and display $$\\int_0^1 f(x) dx$$';
      const segments = parseMathContent(content);

      expect(segments).toHaveLength(4);
      expect(segments[1].type).toBe('math');
      expect(segments[1].content).toBe('x^2');
      expect(segments[3].type).toBe('math');
      expect(segments[3].content).toBe('\\int_0^1 f(x) dx');
    });

    test('handles empty and whitespace-only content', () => {
      expect(parseMathContent('')).toEqual([{ type: 'text', content: '' }]);
      expect(parseMathContent('   ')).toEqual([{ type: 'text', content: '   ' }]);
      expect(containsMath('')).toBe(false);
      expect(extractMathExpressions('')).toEqual([]);
    });

    test('handles malformed math expressions gracefully', () => {
      const content = 'Bad math $invalid$ here';
      const segments = parseMathContent(content);

      expect(segments).toHaveLength(3);
      expect(segments[1].type).toBe('text'); // Should fallback to text for invalid math
    });
  });

  describe('TextFormattingToolbar Math Integration', () => {
    const renderToolbar = (elementId: string) => {
      const state = store.getState();
      const slide = state.presentation.currentPresentation.slides[0];
      const element = slide.elements.find((el: any) => el.id === elementId);

      return render(
        <Provider store={store}>
          <TextFormattingToolbar
            slideId={slide.id}
            elementId={elementId}
            currentProperties={element?.properties || {}}
            onPropertyChange={() => {}}
          />
        </Provider>
      );
    };

    test('shows math controls when text element is selected', () => {
      const state = store.getState();
      const elementId = state.presentation.currentPresentation.slides[0].elements[0].id;

      renderToolbar(elementId);

      expect(screen.getByTitle('Insert Math Expression (Ctrl+M)')).toBeInTheDocument();
      expect(screen.getByTitle('Insert Fraction')).toBeInTheDocument();
      expect(screen.getByTitle('Insert Square Root')).toBeInTheDocument();
      expect(screen.getByTitle('Insert Superscript')).toBeInTheDocument();
      expect(screen.getByTitle('Insert Summation')).toBeInTheDocument();
      expect(screen.getByTitle('Insert Integral')).toBeInTheDocument();
    });

    test('opens math input dialog when math button is clicked', async () => {
      const user = userEvent.setup();
      const state = store.getState();
      const elementId = state.presentation.currentPresentation.slides[0].elements[0].id;

      renderToolbar(elementId);

      const mathButton = screen.getByTitle('Insert Math Expression (Ctrl+M)');
      await user.click(mathButton);

      expect(screen.getByText('Math Expression Editor')).toBeInTheDocument();
      expect(screen.getByLabelText('LaTeX Expression:')).toBeInTheDocument();
    });

    test('inserts quick math templates', async () => {
      const user = userEvent.setup();
      const state = store.getState();
      const elementId = state.presentation.currentPresentation.slides[0].elements[0].id;

      renderToolbar(elementId);

      const fractionButton = screen.getByTitle('Insert Fraction');
      await user.click(fractionButton);

      // Check that the element content was updated with the fraction
      const updatedState = store.getState();
      const updatedElement = updatedState.presentation.currentPresentation.slides[0].elements
        .find((el: any) => el.id === elementId);

      expect(updatedElement.content).toContain('$\\frac{a}{b}$');
    });

    test('shows math indicator when element has math content', () => {
      const state = store.getState();
      const elementId = state.presentation.currentPresentation.slides[0].elements[0].id;

      // Update element to have math content
      store.dispatch({
        type: 'presentation/updateElement',
        payload: {
          slideId: state.presentation.currentPresentation.slides[0].id,
          elementId,
          updates: {
            content: 'Math: $x^2$',
            properties: {
              hasMath: true,
              mathExpressions: ['x^2']
            }
          }
        }
      });

      renderToolbar(elementId);

      expect(screen.getByTitle('This element contains math expressions')).toBeInTheDocument();
      expect(screen.getByText('📐 1')).toBeInTheDocument(); // Shows count of math expressions
    });

    test('handles keyboard shortcut for math input', () => {
      const state = store.getState();
      const elementId = state.presentation.currentPresentation.slides[0].elements[0].id;

      renderToolbar(elementId);

      // Simulate Ctrl+M keypress
      fireEvent.keyDown(document, { key: 'm', ctrlKey: true });

      expect(screen.getByText('Math Expression Editor')).toBeInTheDocument();
    });

    test('handles keyboard shortcuts for text formatting', () => {
      const state = store.getState();
      const elementId = state.presentation.currentPresentation.slides[0].elements[0].id;

      renderToolbar(elementId);

      // Test Ctrl+B for bold
      fireEvent.keyDown(document, { key: 'b', ctrlKey: true });
      
      // Test Ctrl+I for italic
      fireEvent.keyDown(document, { key: 'i', ctrlKey: true });
      
      // Test Ctrl+U for underline
      fireEvent.keyDown(document, { key: 'u', ctrlKey: true });

      // These should not throw errors and should update the element properties
      const updatedState = store.getState();
      expect(updatedState.presentation.currentPresentation).toBeDefined();
    });
  });

  describe('Math Content Processing', () => {
    test('processes complex mathematical expressions', () => {
      const complexMath = 'The integral $\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}$ and the sum $\\sum_{n=1}^{\\infty} \\frac{1}{n^2} = \\frac{\\pi^2}{6}$.';
      
      const segments = parseMathContent(complexMath);
      const expressions = extractMathExpressions(complexMath);

      expect(containsMath(complexMath)).toBe(true);
      expect(expressions).toHaveLength(2);
      expect(expressions[0]).toBe('\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}');
      expect(expressions[1]).toBe('\\sum_{n=1}^{\\infty} \\frac{1}{n^2} = \\frac{\\pi^2}{6}');
      
      expect(segments.filter(s => s.type === 'math')).toHaveLength(2);
      expect(segments.filter(s => s.type === 'text')).toHaveLength(3);
    });

    test('handles nested braces and complex structures', () => {
      const nestedMath = 'Matrix: $\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}$';
      
      expect(containsMath(nestedMath)).toBe(true);
      
      const expressions = extractMathExpressions(nestedMath);
      expect(expressions[0]).toBe('\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}');
    });

    test('preserves spacing and formatting in text segments', () => {
      const content = '  Before   $x^2$   after  ';
      const segments = parseMathContent(content);

      expect(segments[0].content).toBe('  Before   ');
      expect(segments[2].content).toBe('   after  ');
    });

    test('handles multiple consecutive math expressions', () => {
      const content = '$a$$b$$c$';
      const segments = parseMathContent(content);

      expect(segments).toHaveLength(3);
      expect(segments.every(s => s.type === 'math')).toBe(true);
      expect(segments.map(s => s.content)).toEqual(['a', 'b', 'c']);
    });

    test('handles escaped dollar signs', () => {
      const content = 'Price: \\$5 and math: $x^2$';
      const segments = parseMathContent(content);

      expect(segments).toHaveLength(3);
      expect(segments[0].content).toBe('Price: \\$5 and math: ');
      expect(segments[1].type).toBe('math');
      expect(segments[1].content).toBe('x^2');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('handles invalid LaTeX gracefully', () => {
      const content = 'Bad math: $\\invalidcommand{x}$';
      const segments = parseMathContent(content);

      // Should fallback to text when LaTeX is invalid
      expect(segments.some(s => s.type === 'text' && s.content.includes('invalidcommand'))).toBe(true);
    });

    test('handles unmatched delimiters', () => {
      const content1 = 'Unmatched: $x^2';
      const content2 = 'Unmatched: x^2$';
      
      expect(containsMath(content1)).toBe(false);
      expect(containsMath(content2)).toBe(false);
      
      expect(extractMathExpressions(content1)).toEqual([]);
      expect(extractMathExpressions(content2)).toEqual([]);
    });

    test('handles very long expressions', () => {
      const longExpression = 'x^{' + 'a'.repeat(1000) + '}';
      const content = `Long: $${longExpression}$`;
      
      const segments = parseMathContent(content);
      expect(segments).toHaveLength(3);
      expect(segments[1].content).toBe(longExpression);
    });

    test('handles special characters in math', () => {
      const content = 'Special: $\\alpha + \\beta \\neq \\gamma$';
      const segments = parseMathContent(content);

      expect(segments[1].type).toBe('math');
      expect(segments[1].content).toBe('\\alpha + \\beta \\neq \\gamma');
    });
  });
});