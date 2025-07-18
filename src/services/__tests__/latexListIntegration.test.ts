import { LaTeXGenerator } from '../latexGenerator';
import { Slide, SlideElement, Theme } from '../../types/presentation';
import { createDefaultTheme, createDefaultSlideLayout, createDefaultBackground } from '../../types/presentation';

describe('LaTeX List Integration Tests', () => {
  let generator: LaTeXGenerator;
  let mockTheme: Theme;

  beforeEach(() => {
    generator = new LaTeXGenerator();
    mockTheme = createDefaultTheme();
  });

  const createMockSlide = (elements: SlideElement[]): Slide => ({
    id: 'test-slide',
    title: 'Test Slide',
    elements,
    connections: [],
    layout: createDefaultSlideLayout(),
    background: createDefaultBackground(),
    notes: '',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  it('generates complete slide with bullet list', () => {
    const bulletListElement: SlideElement = {
      id: 'bullet-list',
      type: 'text',
      position: { x: 100, y: 100 },
      size: { width: 400, height: 200 },
      properties: {
        listType: 'bullet',
        listStyle: 'disc',
        listIndentLevel: 0,
        fontSize: 16,
        fontFamily: 'Arial',
        textColor: { r: 0, g: 0, b: 0 },
      },
      content: 'First bullet point\nSecond bullet point\nThird bullet point',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const slide = createMockSlide([bulletListElement]);
    const latex = generator.generateSlide(slide, mockTheme);

    expect(latex).toContain('\\begin{frame}{Test Slide}');
    expect(latex).toContain('\\begin{itemize}');
    expect(latex).toContain('\\item First bullet point');
    expect(latex).toContain('\\item Second bullet point');
    expect(latex).toContain('\\item Third bullet point');
    expect(latex).toContain('\\end{itemize}');
    expect(latex).toContain('\\end{frame}');
  });

  it('generates complete slide with numbered list', () => {
    const numberedListElement: SlideElement = {
      id: 'numbered-list',
      type: 'text',
      position: { x: 100, y: 100 },
      size: { width: 400, height: 200 },
      properties: {
        listType: 'numbered',
        listStyle: 'decimal',
        listIndentLevel: 0,
        fontSize: 16,
        fontFamily: 'Arial',
        textColor: { r: 0, g: 0, b: 0 },
      },
      content: 'First numbered item\nSecond numbered item\nThird numbered item',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const slide = createMockSlide([numberedListElement]);
    const latex = generator.generateSlide(slide, mockTheme);

    expect(latex).toContain('\\begin{frame}{Test Slide}');
    expect(latex).toContain('\\begin{enumerate}');
    expect(latex).toContain('\\item First numbered item');
    expect(latex).toContain('\\item Second numbered item');
    expect(latex).toContain('\\item Third numbered item');
    expect(latex).toContain('\\end{enumerate}');
    expect(latex).toContain('\\end{frame}');
  });

  it('generates slide with mixed content types including lists', () => {
    const titleElement: SlideElement = {
      id: 'title',
      type: 'text',
      position: { x: 50, y: 50 },
      size: { width: 700, height: 60 },
      properties: {
        fontSize: 24,
        fontWeight: 'bold',
        fontFamily: 'Arial',
        textColor: { r: 0, g: 0, b: 0 },
      },
      content: 'Slide with Mixed Content',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const bulletListElement: SlideElement = {
      id: 'bullet-list',
      type: 'text',
      position: { x: 100, y: 150 },
      size: { width: 300, height: 150 },
      properties: {
        listType: 'bullet',
        listStyle: 'circle',
        listIndentLevel: 1,
        fontSize: 14,
        fontFamily: 'Arial',
        textColor: { r: 0, g: 0, b: 0 },
      },
      content: 'Bullet item 1\nBullet item 2',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const numberedListElement: SlideElement = {
      id: 'numbered-list',
      type: 'text',
      position: { x: 450, y: 150 },
      size: { width: 300, height: 150 },
      properties: {
        listType: 'numbered',
        listStyle: 'lower-alpha',
        listIndentLevel: 0,
        fontSize: 14,
        fontFamily: 'Arial',
        textColor: { r: 0, g: 0, b: 0 },
      },
      content: 'Numbered item a\nNumbered item b',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const slide = createMockSlide([titleElement, bulletListElement, numberedListElement]);
    const latex = generator.generateSlide(slide, mockTheme);

    // Check frame structure
    expect(latex).toContain('\\begin{frame}{Test Slide}');
    expect(latex).toContain('\\end{frame}');

    // Check title element
    expect(latex).toContain('Slide with Mixed Content');

    // Check bullet list with circle style and indentation
    expect(latex).toContain('\\begin{itemize}');
    expect(latex).toContain('\\renewcommand{\\labelitemi}{\\textopenbullet}');
    expect(latex).toContain('\\addtolength{\\leftmargini}{0.5cm}');
    expect(latex).toContain('\\item Bullet item 1');
    expect(latex).toContain('\\item Bullet item 2');
    expect(latex).toContain('\\end{itemize}');

    // Check numbered list with lower-alpha style
    expect(latex).toContain('\\begin{enumerate}');
    expect(latex).toContain('\\renewcommand{\\labelenumi}{\\alph*)}');
    expect(latex).toContain('\\item Numbered item a');
    expect(latex).toContain('\\item Numbered item b');
    expect(latex).toContain('\\end{enumerate}');
  });

  it('generates slide with nested list structure', () => {
    const nestedListElement: SlideElement = {
      id: 'nested-list',
      type: 'text',
      position: { x: 100, y: 100 },
      size: { width: 400, height: 300 },
      properties: {
        listType: 'bullet',
        listStyle: 'disc',
        listIndentLevel: 2,
        fontSize: 14,
        fontFamily: 'Arial',
        textColor: { r: 0, g: 0, b: 0 },
      },
      content: 'Level 3 item 1\nLevel 3 item 2\nLevel 3 item 3',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const slide = createMockSlide([nestedListElement]);
    const latex = generator.generateSlide(slide, mockTheme);

    expect(latex).toContain('\\begin{itemize}');
    expect(latex).toContain('\\renewcommand{\\labelitemi}{\\textasteriskcentered}'); // Level 2 symbol
    expect(latex).toContain('\\addtolength{\\leftmargini}{1cm}'); // 2 * 0.5cm indentation
    expect(latex).toContain('\\item Level 3 item 1');
    expect(latex).toContain('\\item Level 3 item 2');
    expect(latex).toContain('\\item Level 3 item 3');
    expect(latex).toContain('\\end{itemize}');
  });

  it('generates slide with custom bullet symbols', () => {
    const customBulletElement: SlideElement = {
      id: 'custom-bullet',
      type: 'text',
      position: { x: 100, y: 100 },
      size: { width: 400, height: 200 },
      properties: {
        listType: 'bullet',
        listStyle: 'custom',
        customBulletSymbol: '★',
        listIndentLevel: 0,
        fontSize: 16,
        fontFamily: 'Arial',
        textColor: { r: 0, g: 0, b: 0 },
      },
      content: 'Star bullet 1\nStar bullet 2\nStar bullet 3',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const slide = createMockSlide([customBulletElement]);
    const latex = generator.generateSlide(slide, mockTheme);

    expect(latex).toContain('\\begin{itemize}');
    expect(latex).toContain('\\renewcommand{\\labelitemi}{★}');
    expect(latex).toContain('\\item Star bullet 1');
    expect(latex).toContain('\\item Star bullet 2');
    expect(latex).toContain('\\item Star bullet 3');
    expect(latex).toContain('\\end{itemize}');
  });

  it('handles complex list content with special characters', () => {
    const complexListElement: SlideElement = {
      id: 'complex-list',
      type: 'text',
      position: { x: 100, y: 100 },
      size: { width: 400, height: 200 },
      properties: {
        listType: 'numbered',
        listStyle: 'upper-roman',
        listIndentLevel: 0,
        fontSize: 16,
        fontFamily: 'Arial',
        textColor: { r: 0, g: 0, b: 0 },
      },
      content: 'Item with & ampersand\nItem with % percent\nItem with $ dollar\nItem with # hash',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const slide = createMockSlide([complexListElement]);
    const latex = generator.generateSlide(slide, mockTheme);

    expect(latex).toContain('\\begin{enumerate}');
    expect(latex).toContain('\\renewcommand{\\labelenumi}{\\Roman*)}');
    expect(latex).toContain('\\item Item with \\& ampersand');
    expect(latex).toContain('\\item Item with \\% percent');
    expect(latex).toContain('\\item Item with \\$ dollar');
    expect(latex).toContain('\\item Item with \\# hash');
    expect(latex).toContain('\\end{enumerate}');
  });
});