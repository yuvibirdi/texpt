import {
  createDefaultTheme,
  createDefaultSlideLayout,
  createDefaultBackground,
  createDefaultPresentationSettings,
  createDefaultPresentationMetadata,
  ElementType,
  SlideElement,
  Slide,
  Presentation,
} from '../presentation';

describe('Presentation Data Models', () => {
  describe('createDefaultTheme', () => {
    it('should create a default theme with all required properties', () => {
      const theme = createDefaultTheme();
      
      expect(theme).toHaveProperty('id', 'default');
      expect(theme).toHaveProperty('name', 'Default Theme');
      expect(theme.colors).toHaveProperty('primary');
      expect(theme.colors).toHaveProperty('secondary');
      expect(theme.colors).toHaveProperty('accent');
      expect(theme.colors).toHaveProperty('background');
      expect(theme.colors).toHaveProperty('text');
      expect(theme.fonts).toHaveProperty('heading');
      expect(theme.fonts).toHaveProperty('body');
      expect(theme.fonts).toHaveProperty('monospace');
    });

    it('should create theme with valid color values', () => {
      const theme = createDefaultTheme();
      
      Object.values(theme.colors).forEach(color => {
        expect(color.r).toBeGreaterThanOrEqual(0);
        expect(color.r).toBeLessThanOrEqual(255);
        expect(color.g).toBeGreaterThanOrEqual(0);
        expect(color.g).toBeLessThanOrEqual(255);
        expect(color.b).toBeGreaterThanOrEqual(0);
        expect(color.b).toBeLessThanOrEqual(255);
      });
    });
  });

  describe('createDefaultSlideLayout', () => {
    it('should create a default slide layout with regions', () => {
      const layout = createDefaultSlideLayout();
      
      expect(layout).toHaveProperty('name', 'default');
      expect(layout).toHaveProperty('template', 'title-content');
      expect(layout.regions).toHaveProperty('title');
      expect(layout.regions).toHaveProperty('content');
      expect(layout.regions).toHaveProperty('footer');
    });

    it('should have valid region dimensions', () => {
      const layout = createDefaultSlideLayout();
      
      Object.values(layout.regions).forEach(region => {
        if (region) {
          expect(region.x).toBeGreaterThanOrEqual(0);
          expect(region.y).toBeGreaterThanOrEqual(0);
          expect(region.width).toBeGreaterThan(0);
          expect(region.height).toBeGreaterThan(0);
        }
      });
    });
  });

  describe('createDefaultBackground', () => {
    it('should create a default background with color type', () => {
      const background = createDefaultBackground();
      
      expect(background.type).toBe('color');
      expect(background.color).toBeDefined();
      expect(background.color?.r).toBe(255);
      expect(background.color?.g).toBe(255);
      expect(background.color?.b).toBe(255);
    });
  });

  describe('createDefaultPresentationSettings', () => {
    it('should create default settings with valid values', () => {
      const settings = createDefaultPresentationSettings();
      
      expect(settings.slideSize.width).toBe(800);
      expect(settings.slideSize.height).toBe(600);
      expect(settings.slideSize.aspectRatio).toBe('4:3');
      expect(settings.autoSave).toBe(true);
      expect(settings.autoSaveInterval).toBeGreaterThan(0);
      expect(settings.latexEngine).toBe('pdflatex');
      expect(settings.compilationTimeout).toBeGreaterThan(0);
      expect(settings.snapToGrid).toBe(true);
      expect(settings.gridSize).toBeGreaterThan(0);
    });
  });

  describe('createDefaultPresentationMetadata', () => {
    it('should create default metadata', () => {
      const metadata = createDefaultPresentationMetadata();
      
      expect(metadata.author).toBe('');
      expect(metadata.title).toBe('New Presentation');
      expect(metadata.date).toBeInstanceOf(Date);
    });
  });

  describe('SlideElement interface', () => {
    it('should accept valid element types', () => {
      const validTypes: ElementType[] = ['text', 'image', 'shape', 'chart', 'table'];
      
      validTypes.forEach(type => {
        const element: SlideElement = {
          id: 'test-element',
          type,
          position: { x: 0, y: 0 },
          size: { width: 100, height: 100 },
          properties: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        expect(element.type).toBe(type);
      });
    });

    it('should have required properties', () => {
      const element: SlideElement = {
        id: 'test-element',
        type: 'text',
        position: { x: 10, y: 20 },
        size: { width: 200, height: 50 },
        properties: {
          fontSize: 16,
          fontFamily: 'Arial',
          textColor: { r: 0, g: 0, b: 0 },
        },
        content: 'Test content',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      expect(element.id).toBe('test-element');
      expect(element.position.x).toBe(10);
      expect(element.position.y).toBe(20);
      expect(element.size.width).toBe(200);
      expect(element.size.height).toBe(50);
      expect(element.properties.fontSize).toBe(16);
      expect(element.content).toBe('Test content');
    });
  });
});