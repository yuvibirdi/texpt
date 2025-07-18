import {
  containsMath,
  extractMathExpressions,
  convertToLaTeX,
} from '../mathRenderer';

describe('mathRenderer', () => {
  describe('containsMath', () => {
    test('returns false for plain text', () => {
      expect(containsMath('Plain text')).toBe(false);
    });

    test('returns true for inline math', () => {
      expect(containsMath('Text with $x^2$ math')).toBe(true);
    });

    test('returns true for display math', () => {
      expect(containsMath('Text with $$x^2$$ math')).toBe(true);
    });

    test('returns false for incomplete math delimiters', () => {
      expect(containsMath('Text with $ incomplete')).toBe(false);
      expect(containsMath('Text with $$ incomplete')).toBe(false);
    });

    test('returns false for empty string', () => {
      expect(containsMath('')).toBe(false);
    });
  });

  describe('extractMathExpressions', () => {
    test('extracts no expressions from plain text', () => {
      const expressions = extractMathExpressions('Plain text');
      expect(expressions).toEqual([]);
    });

    test('extracts single inline expression', () => {
      const expressions = extractMathExpressions('Text $x^2$ here');
      expect(expressions).toEqual(['x^2']);
    });

    test('extracts multiple expressions', () => {
      const expressions = extractMathExpressions('First $a$ then $$b = c$$ finally $d$');
      expect(expressions).toEqual(['a', 'b = c', 'd']);
    });

    test('extracts complex expressions', () => {
      const expressions = extractMathExpressions('Formula: $$\\frac{a}{b} = \\sqrt{c^2 + d^2}$$');
      expect(expressions).toEqual(['\\frac{a}{b} = \\sqrt{c^2 + d^2}']);
    });

    test('handles empty content', () => {
      const expressions = extractMathExpressions('');
      expect(expressions).toEqual([]);
    });
  });

  describe('convertToLaTeX', () => {
    test('converts plain text', () => {
      const latex = convertToLaTeX('Plain text');
      expect(latex).toBe('Plain text');
    });

    test('preserves math expressions', () => {
      const latex = convertToLaTeX('Text with $x^2$ math');
      expect(latex).toContain('$x^2$');
      expect(latex).toContain('Text with ');
      expect(latex).toContain(' math');
    });

    test('escapes LaTeX special characters in text', () => {
      const latex = convertToLaTeX('Text with $ & % # ^ _ ~ \\ { }');
      expect(latex).toContain('\\$');
      expect(latex).toContain('\\&');
      expect(latex).toContain('\\%');
      expect(latex).toContain('\\#');
      expect(latex).toContain('\\textasciicircum{}');
      expect(latex).toContain('\\_');
      expect(latex).toContain('\\textasciitilde{}');
      expect(latex).toContain('\\{');
      expect(latex).toContain('\\}');
    });

    test('handles mixed content correctly', () => {
      const latex = convertToLaTeX('Formula: $$\\frac{a}{b}$$ with 50% accuracy');
      expect(latex).toContain('$\\frac{a}{b}$');
      expect(latex).toContain('50\\%');
    });

    test('handles multiple math expressions', () => {
      const latex = convertToLaTeX('First $a$ then $b$ and $c$');
      expect(latex).toContain('$a$');
      expect(latex).toContain('$b$');
      expect(latex).toContain('$c$');
      expect(latex).toContain('First ');
      expect(latex).toContain(' then ');
      expect(latex).toContain(' and ');
    });

    test('handles empty content', () => {
      const latex = convertToLaTeX('');
      expect(latex).toBe('');
    });
  });
});