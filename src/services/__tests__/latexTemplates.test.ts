import { LaTeXTemplateManager } from '../latexTemplates';
import { createDefaultTheme } from '../../types/presentation';

describe('LaTeXTemplateManager', () => {
  let templateManager: LaTeXTemplateManager;

  beforeEach(() => {
    templateManager = new LaTeXTemplateManager();
  });

  describe('initialization', () => {
    it('should initialize with default theme templates', () => {
      const themes = templateManager.getThemeTemplates();
      
      expect(themes.length).toBeGreaterThan(0);
      expect(themes.some(t => t.id === 'default')).toBe(true);
      expect(themes.some(t => t.id === 'madrid')).toBe(true);
      expect(themes.some(t => t.id === 'metropolis')).toBe(true);
    });

    it('should initialize with default slide templates', () => {
      const slides = templateManager.getSlideTemplates();
      
      expect(slides.length).toBeGreaterThan(0);
      expect(slides.some(t => t.id === 'title-slide')).toBe(true);
      expect(slides.some(t => t.id === 'content')).toBe(true);
      expect(slides.some(t => t.id === 'two-column')).toBe(true);
    });
  });

  describe('template retrieval', () => {
    it('should get specific theme template by id', () => {
      const defaultTheme = templateManager.getThemeTemplate('default');
      
      expect(defaultTheme).toBeDefined();
      expect(defaultTheme!.id).toBe('default');
      expect(defaultTheme!.name).toBe('Default');
    });

    it('should get specific slide template by id', () => {
      const contentTemplate = templateManager.getSlideTemplate('content');
      
      expect(contentTemplate).toBeDefined();
      expect(contentTemplate!.id).toBe('content');
      expect(contentTemplate!.layout).toBe('title-content');
    });

    it('should return undefined for non-existent templates', () => {
      const nonExistent = templateManager.getThemeTemplate('non-existent');
      expect(nonExistent).toBeUndefined();
    });
  });

  describe('custom template management', () => {
    it('should add custom theme templates', () => {
      const customTheme = {
        id: 'custom-theme',
        name: 'Custom Theme',
        description: 'A custom theme for testing',
        beamerTheme: 'Warsaw',
        colorTheme: 'crane',
      };

      templateManager.addThemeTemplate(customTheme);
      const retrieved = templateManager.getThemeTemplate('custom-theme');
      
      expect(retrieved).toBeDefined();
      expect(retrieved!.name).toBe('Custom Theme');
      expect(retrieved!.beamerTheme).toBe('Warsaw');
    });

    it('should add custom slide templates', () => {
      const customSlide = {
        id: 'custom-slide',
        name: 'Custom Slide',
        description: 'A custom slide layout',
        layout: 'custom' as const,
        regions: {
          title: { x: 10, y: 80, width: 80, height: 15 },
          content: { x: 10, y: 10, width: 80, height: 65 },
        },
      };

      templateManager.addSlideTemplate(customSlide);
      const retrieved = templateManager.getSlideTemplate('custom-slide');
      
      expect(retrieved).toBeDefined();
      expect(retrieved!.name).toBe('Custom Slide');
      expect(retrieved!.layout).toBe('custom');
    });
  });

  describe('theme preamble generation', () => {
    it('should generate basic theme preamble', () => {
      const template = templateManager.getThemeTemplate('default')!;
      const appTheme = createDefaultTheme();
      
      const preamble = templateManager.generateThemePreamble(template, appTheme);
      
      expect(preamble).toContain('\\usetheme{default}');
      expect(preamble).toContain('\\definecolor{primary}');
      expect(preamble).toContain('\\definecolor{secondary}');
    });

    it('should include color theme when specified', () => {
      const template = templateManager.getThemeTemplate('madrid')!;
      const appTheme = createDefaultTheme();
      
      const preamble = templateManager.generateThemePreamble(template, appTheme);
      
      expect(preamble).toContain('\\usetheme{Madrid}');
      expect(preamble).toContain('\\usecolortheme{default}');
    });

    it('should include custom commands', () => {
      const template = {
        id: 'test-theme',
        name: 'Test Theme',
        description: 'Test theme with custom commands',
        beamerTheme: 'default',
        customCommands: [
          '\\setbeamertemplate{navigation symbols}{}',
          '\\setbeamercolor{structure}{fg=blue}',
        ],
      };

      const appTheme = createDefaultTheme();
      const preamble = templateManager.generateThemePreamble(template, appTheme);
      
      expect(preamble).toContain('\\setbeamertemplate{navigation symbols}{}');
      expect(preamble).toContain('\\setbeamercolor{structure}{fg=blue}');
    });

    it('should include preamble additions', () => {
      const template = templateManager.getThemeTemplate('metropolis')!;
      const appTheme = createDefaultTheme();
      
      const preamble = templateManager.generateThemePreamble(template, appTheme);
      
      expect(preamble).toContain('\\metroset{block=fill}');
      expect(preamble).toContain('\\setbeamercolor{background canvas}{bg=white}');
    });
  });

  describe('slide frame generation', () => {
    it('should generate basic slide frame', () => {
      const template = templateManager.getSlideTemplate('content')!;
      
      const frame = templateManager.generateSlideFrame(
        template,
        'Test Title',
        'Test content goes here'
      );
      
      expect(frame).toContain('\\begin{frame}{Test Title}');
      expect(frame).toContain('Test content goes here');
      expect(frame).toContain('\\end{frame}');
    });

    it('should handle frame options', () => {
      const template = templateManager.getSlideTemplate('content')!;
      
      const frame = templateManager.generateSlideFrame(
        template,
        'Test Title',
        'Content',
        'fragile'
      );
      
      expect(frame).toContain('\\begin{frame}[fragile]{Test Title}');
    });

    it('should generate two-column layout', () => {
      const template = templateManager.getSlideTemplate('two-column')!;
      
      const frame = templateManager.generateSlideFrame(
        template,
        'Two Column Title',
        'Left column content'
      );
      
      expect(frame).toContain('\\begin{columns}');
      expect(frame).toContain('\\begin{column}{0.48\\textwidth}');
      expect(frame).toContain('Left column content');
      expect(frame).toContain('\\end{columns}');
    });

    it('should handle custom layout with TikZ template', () => {
      const customTemplate = {
        id: 'custom-tikz',
        name: 'Custom TikZ',
        description: 'Custom layout with TikZ',
        layout: 'custom' as const,
        tikzTemplate: '\\begin{tikzpicture}\n%CONTENT%\n\\end{tikzpicture}',
        regions: {},
      };

      const frame = templateManager.generateSlideFrame(
        customTemplate,
        'Custom Title',
        '\\node at (0,0) {Custom content};'
      );
      
      expect(frame).toContain('\\begin{tikzpicture}');
      expect(frame).toContain('\\node at (0,0) {Custom content};');
      expect(frame).toContain('\\end{tikzpicture}');
    });

    it('should escape special characters in titles', () => {
      const template = templateManager.getSlideTemplate('content')!;
      
      const frame = templateManager.generateSlideFrame(
        template,
        'Title with & special $ characters',
        'Content'
      );
      
      expect(frame).toContain('Title with \\& special \\$ characters');
    });
  });

  describe('template validation', () => {
    it('should have valid regions for all slide templates', () => {
      const templates = templateManager.getSlideTemplates();
      
      templates.forEach(template => {
        expect(template.regions).toBeDefined();
        
        // Check that region coordinates are valid percentages
        Object.values(template.regions).forEach(region => {
          if (region) {
            expect(region.x).toBeGreaterThanOrEqual(0);
            expect(region.x).toBeLessThanOrEqual(100);
            expect(region.y).toBeGreaterThanOrEqual(0);
            expect(region.y).toBeLessThanOrEqual(100);
            expect(region.width).toBeGreaterThan(0);
            expect(region.height).toBeGreaterThan(0);
          }
        });
      });
    });

    it('should have valid Beamer themes for all theme templates', () => {
      const templates = templateManager.getThemeTemplates();
      
      const validBeamerThemes = [
        'default', 'AnnArbor', 'Antibes', 'Bergen', 'Berkeley', 'Berlin',
        'Boadilla', 'CambridgeUS', 'Copenhagen', 'Darmstadt', 'Dresden',
        'Frankfurt', 'Goettingen', 'Hannover', 'Ilmenau', 'JuanLesPins',
        'Luebeck', 'Madrid', 'Malmoe', 'Marburg', 'Montpellier', 'PaloAlto',
        'Pittsburgh', 'Rochester', 'Singapore', 'Szeged', 'Warsaw',
        'metropolis', // Custom theme
      ];
      
      templates.forEach(template => {
        expect(validBeamerThemes).toContain(template.beamerTheme);
      });
    });
  });

  describe('color definition generation', () => {
    it('should generate RGB color definitions', () => {
      const template = templateManager.getThemeTemplate('default')!;
      const appTheme = createDefaultTheme();
      
      const preamble = templateManager.generateThemePreamble(template, appTheme);
      
      // Check that colors are defined with RGB values
      expect(preamble).toMatch(/\\definecolor\{primary\}\{RGB\}\{\d+,\d+,\d+\}/);
      expect(preamble).toMatch(/\\definecolor\{secondary\}\{RGB\}\{\d+,\d+,\d+\}/);
      expect(preamble).toMatch(/\\definecolor\{accent\}\{RGB\}\{\d+,\d+,\d+\}/);
    });

    it('should set Beamer color mappings', () => {
      const template = templateManager.getThemeTemplate('default')!;
      const appTheme = createDefaultTheme();
      
      const preamble = templateManager.generateThemePreamble(template, appTheme);
      
      expect(preamble).toContain('\\setbeamercolor{structure}{fg=primary}');
      expect(preamble).toContain('\\setbeamercolor{title}{fg=text}');
      expect(preamble).toContain('\\setbeamercolor{normal text}{fg=text,bg=background}');
    });
  });
});