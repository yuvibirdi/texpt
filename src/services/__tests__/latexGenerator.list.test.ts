import { LaTeXGenerator } from '../latexGenerator';
import { SlideElement, Theme, ElementProperties } from '../../types/presentation';
import { createDefaultTheme } from '../../types/presentation';

describe('LaTeXGenerator - List Functionality', () => {
  let generator: LaTeXGenerator;
  let mockTheme: Theme;

  beforeEach(() => {
    generator = new LaTeXGenerator();
    mockTheme = createDefaultTheme();
  });

  const createMockTextElement = (properties: Partial<ElementProperties>, content: string = 'Item 1\nItem 2\nItem 3'): SlideElement => ({
    id: 'test-element',
    type: 'text',
    position: { x: 100, y: 100 },
    size: { width: 300, height: 200 },
    properties: {
      fontSize: 16,
      fontFamily: 'Arial',
      textColor: { r: 0, g: 0, b: 0 },
      ...properties,
    },
    content,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  describe('Bullet Lists', () => {
    it('generates basic bullet list LaTeX code', () => {
      const element = createMockTextElement({
        listType: 'bullet',
        listStyle: 'disc',
        listIndentLevel: 0,
      });

      const latex = generator.generateElement(element, mockTheme);

      expect(latex).toContain('\\begin{itemize}');
      expect(latex).toContain('\\item Item 1');
      expect(latex).toContain('\\item Item 2');
      expect(latex).toContain('\\item Item 3');
      expect(latex).toContain('\\end{itemize}');
    });

    it('generates bullet list with circle style', () => {
      const element = createMockTextElement({
        listType: 'bullet',
        listStyle: 'circle',
        listIndentLevel: 0,
      });

      const latex = generator.generateElement(element, mockTheme);

      expect(latex).toContain('\\begin{itemize}');
      expect(latex).toContain('\\renewcommand{\\labelitemi}{\\textopenbullet}');
      expect(latex).toContain('\\end{itemize}');
    });

    it('generates bullet list with square style', () => {
      const element = createMockTextElement({
        listType: 'bullet',
        listStyle: 'square',
        listIndentLevel: 0,
      });

      const latex = generator.generateElement(element, mockTheme);

      expect(latex).toContain('\\begin{itemize}');
      // Square style uses textbullet which is the default, so no renewcommand needed
      expect(latex).toContain('\\end{itemize}');
    });

    it('generates bullet list with custom symbol', () => {
      const element = createMockTextElement({
        listType: 'bullet',
        listStyle: 'custom',
        customBulletSymbol: '★',
        listIndentLevel: 0,
      });

      const latex = generator.generateElement(element, mockTheme);

      expect(latex).toContain('\\begin{itemize}');
      expect(latex).toContain('\\renewcommand{\\labelitemi}{★}');
      expect(latex).toContain('\\end{itemize}');
    });

    it('generates indented bullet list', () => {
      const element = createMockTextElement({
        listType: 'bullet',
        listStyle: 'disc',
        listIndentLevel: 2,
      });

      const latex = generator.generateElement(element, mockTheme);

      expect(latex).toContain('\\begin{itemize}');
      expect(latex).toContain('\\addtolength{\\leftmargini}{1cm}'); // 2 * 0.5cm
      expect(latex).toContain('\\end{itemize}');
    });

    it('uses different bullet symbols for different indent levels with disc style', () => {
      const element1 = createMockTextElement({
        listType: 'bullet',
        listStyle: 'disc',
        listIndentLevel: 0,
      });

      const element2 = createMockTextElement({
        listType: 'bullet',
        listStyle: 'disc',
        listIndentLevel: 1,
      });

      const element3 = createMockTextElement({
        listType: 'bullet',
        listStyle: 'disc',
        listIndentLevel: 2,
      });

      const latex1 = generator.generateElement(element1, mockTheme);
      const latex2 = generator.generateElement(element2, mockTheme);
      const latex3 = generator.generateElement(element3, mockTheme);

      // Level 0 should use textbullet (default)
      expect(latex1).not.toContain('\\renewcommand{\\labelitemi}');
      
      // Level 1 should use textendash
      expect(latex2).toContain('\\renewcommand{\\labelitemi}{\\textendash}');
      
      // Level 2 should use textasteriskcentered
      expect(latex3).toContain('\\renewcommand{\\labelitemi}{\\textasteriskcentered}');
    });
  });

  describe('Numbered Lists', () => {
    it('generates basic numbered list LaTeX code', () => {
      const element = createMockTextElement({
        listType: 'numbered',
        listStyle: 'decimal',
        listIndentLevel: 0,
      });

      const latex = generator.generateElement(element, mockTheme);

      expect(latex).toContain('\\begin{enumerate}');
      expect(latex).toContain('\\item Item 1');
      expect(latex).toContain('\\item Item 2');
      expect(latex).toContain('\\item Item 3');
      expect(latex).toContain('\\end{enumerate}');
    });

    it('generates numbered list with lower-alpha style', () => {
      const element = createMockTextElement({
        listType: 'numbered',
        listStyle: 'lower-alpha',
        listIndentLevel: 0,
      });

      const latex = generator.generateElement(element, mockTheme);

      expect(latex).toContain('\\begin{enumerate}');
      expect(latex).toContain('\\renewcommand{\\labelenumi}{\\alph*)}');
      expect(latex).toContain('\\end{enumerate}');
    });

    it('generates numbered list with upper-alpha style', () => {
      const element = createMockTextElement({
        listType: 'numbered',
        listStyle: 'upper-alpha',
        listIndentLevel: 0,
      });

      const latex = generator.generateElement(element, mockTheme);

      expect(latex).toContain('\\begin{enumerate}');
      expect(latex).toContain('\\renewcommand{\\labelenumi}{\\Alph*)}');
      expect(latex).toContain('\\end{enumerate}');
    });

    it('generates numbered list with lower-roman style', () => {
      const element = createMockTextElement({
        listType: 'numbered',
        listStyle: 'lower-roman',
        listIndentLevel: 0,
      });

      const latex = generator.generateElement(element, mockTheme);

      expect(latex).toContain('\\begin{enumerate}');
      expect(latex).toContain('\\renewcommand{\\labelenumi}{\\roman*)}');
      expect(latex).toContain('\\end{enumerate}');
    });

    it('generates numbered list with upper-roman style', () => {
      const element = createMockTextElement({
        listType: 'numbered',
        listStyle: 'upper-roman',
        listIndentLevel: 0,
      });

      const latex = generator.generateElement(element, mockTheme);

      expect(latex).toContain('\\begin{enumerate}');
      expect(latex).toContain('\\renewcommand{\\labelenumi}{\\Roman*)}');
      expect(latex).toContain('\\end{enumerate}');
    });

    it('generates indented numbered list', () => {
      const element = createMockTextElement({
        listType: 'numbered',
        listStyle: 'decimal',
        listIndentLevel: 1,
      });

      const latex = generator.generateElement(element, mockTheme);

      expect(latex).toContain('\\begin{enumerate}');
      expect(latex).toContain('\\addtolength{\\leftmargini}{0.5cm}'); // 1 * 0.5cm
      expect(latex).toContain('\\end{enumerate}');
    });
  });

  describe('List Content Processing', () => {
    it('handles empty content gracefully', () => {
      const element = createMockTextElement({
        listType: 'bullet',
        listStyle: 'disc',
        listIndentLevel: 0,
      }, '');

      const latex = generator.generateElement(element, mockTheme);

      // Should not contain list markup for empty content
      expect(latex).not.toContain('\\begin{itemize}');
      expect(latex).not.toContain('\\end{itemize}');
    });

    it('handles single line content', () => {
      const element = createMockTextElement({
        listType: 'bullet',
        listStyle: 'disc',
        listIndentLevel: 0,
      }, 'Single item');

      const latex = generator.generateElement(element, mockTheme);

      expect(latex).toContain('\\begin{itemize}');
      expect(latex).toContain('\\item Single item');
      expect(latex).toContain('\\end{itemize}');
    });

    it('filters out empty lines', () => {
      const element = createMockTextElement({
        listType: 'bullet',
        listStyle: 'disc',
        listIndentLevel: 0,
      }, 'Item 1\n\nItem 2\n\n\nItem 3');

      const latex = generator.generateElement(element, mockTheme);

      expect(latex).toContain('\\item Item 1');
      expect(latex).toContain('\\item Item 2');
      expect(latex).toContain('\\item Item 3');
      // Should only have 3 items, not 6
      expect((latex.match(/\\item/g) || []).length).toBe(3);
    });

    it('trims whitespace from list items', () => {
      const element = createMockTextElement({
        listType: 'bullet',
        listStyle: 'disc',
        listIndentLevel: 0,
      }, '  Item 1  \n\t Item 2 \t\n   Item 3   ');

      const latex = generator.generateElement(element, mockTheme);

      expect(latex).toContain('\\item Item 1');
      expect(latex).toContain('\\item Item 2');
      expect(latex).toContain('\\item Item 3');
    });

    it('escapes LaTeX special characters in list items', () => {
      const element = createMockTextElement({
        listType: 'bullet',
        listStyle: 'disc',
        listIndentLevel: 0,
      }, 'Item with & symbol\nItem with % comment\nItem with $ math');

      const latex = generator.generateElement(element, mockTheme);

      expect(latex).toContain('\\item Item with \\& symbol');
      expect(latex).toContain('\\item Item with \\% comment');
      expect(latex).toContain('\\item Item with \\$ math');
    });
  });

  describe('Non-List Text Elements', () => {
    it('generates regular text when listType is none', () => {
      const element = createMockTextElement({
        listType: 'none',
      }, 'Regular text content');

      const latex = generator.generateElement(element, mockTheme);

      expect(latex).not.toContain('\\begin{itemize}');
      expect(latex).not.toContain('\\begin{enumerate}');
      expect(latex).toContain('Regular text content');
    });

    it('generates regular text when listType is undefined', () => {
      const element = createMockTextElement({}, 'Regular text content');

      const latex = generator.generateElement(element, mockTheme);

      expect(latex).not.toContain('\\begin{itemize}');
      expect(latex).not.toContain('\\begin{enumerate}');
      expect(latex).toContain('Regular text content');
    });
  });

  describe('Edge Cases', () => {
    it('handles maximum indent level correctly', () => {
      const element = createMockTextElement({
        listType: 'bullet',
        listStyle: 'disc',
        listIndentLevel: 5,
      });

      const latex = generator.generateElement(element, mockTheme);

      expect(latex).toContain('\\addtolength{\\leftmargini}{2.5cm}'); // 5 * 0.5cm
    });

    it('handles custom bullet symbol with special characters', () => {
      const element = createMockTextElement({
        listType: 'bullet',
        listStyle: 'custom',
        customBulletSymbol: '→',
        listIndentLevel: 0,
      });

      const latex = generator.generateElement(element, mockTheme);

      expect(latex).toContain('\\renewcommand{\\labelitemi}{→}');
    });

    it('falls back to default style for unknown list styles', () => {
      const element = createMockTextElement({
        listType: 'bullet',
        listStyle: 'unknown-style',
        listIndentLevel: 0,
      });

      const latex = generator.generateElement(element, mockTheme);

      expect(latex).toContain('\\begin{itemize}');
      // Should use default bullet symbol (textbullet)
      expect(latex).not.toContain('\\renewcommand{\\labelitemi}');
    });

    it('falls back to default numbering for unknown numbering styles', () => {
      const element = createMockTextElement({
        listType: 'numbered',
        listStyle: 'unknown-style',
        listIndentLevel: 0,
      });

      const latex = generator.generateElement(element, mockTheme);

      expect(latex).toContain('\\begin{enumerate}');
      // Should use default numbering (arabic)
      expect(latex).not.toContain('\\renewcommand{\\labelenumi}');
    });
  });
});