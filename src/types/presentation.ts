// Core data model interfaces for the LaTeX Presentation Editor

export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Color {
  r: number;
  g: number;
  b: number;
  a?: number;
}

export type ElementType = 'text' | 'image' | 'shape' | 'chart' | 'table';

export type ShapeType = 'rectangle' | 'circle' | 'line' | 'arrow' | 'triangle' | 'diamond' | 'ellipse';

export interface ConnectionPoint {
  id: string;
  x: number; // Relative position (0-1)
  y: number; // Relative position (0-1)
  type: 'input' | 'output' | 'bidirectional';
}

export interface ShapeConnection {
  id: string;
  fromElementId: string;
  fromConnectionPointId: string;
  toElementId: string;
  toConnectionPointId: string;
  style: {
    strokeColor?: Color;
    strokeWidth?: number;
    strokeDashArray?: number[];
    arrowType?: 'none' | 'arrow' | 'diamond' | 'circle';
  };
}

export interface ElementProperties {
  // Common properties
  opacity?: number;
  rotation?: number;
  zIndex?: number;
  
  // Text properties
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  textColor?: Color;
  backgroundColor?: Color;
  
  // List properties
  listType?: 'none' | 'bullet' | 'numbered' | 'custom';
  listStyle?: 'disc' | 'circle' | 'square' | 'decimal' | 'lower-alpha' | 'upper-alpha' | 'lower-roman' | 'upper-roman';
  listIndentLevel?: number;
  customBulletSymbol?: string;
  
  // Shape properties
  shapeType?: ShapeType;
  fillColor?: Color;
  strokeColor?: Color;
  strokeWidth?: number;
  cornerRadius?: number; // For rectangles
  connectionPoints?: ConnectionPoint[];
  
  // Line/Arrow specific properties
  startPoint?: { x: number; y: number };
  endPoint?: { x: number; y: number };
  arrowStart?: boolean;
  arrowEnd?: boolean;
  
  // Image properties
  src?: string;
  alt?: string;
  crop?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  flipX?: boolean;
  flipY?: boolean;
  
  // Math properties
  hasMath?: boolean;
  mathExpressions?: any[];
}

export interface SlideElement {
  id: string;
  type: ElementType;
  position: Position;
  size: Size;
  properties: ElementProperties;
  content?: string; // Text content, image path, etc.
  latexCode?: string; // Generated LaTeX code for this element
  createdAt: Date;
  updatedAt: Date;
}

export interface Background {
  type: 'color' | 'gradient' | 'image';
  color?: Color;
  gradient?: {
    type: 'linear' | 'radial';
    colors: Color[];
    angle?: number;
  };
  image?: {
    src: string;
    fit: 'cover' | 'contain' | 'fill';
  };
}

export interface SlideLayout {
  name: string;
  template: string;
  regions: {
    title?: { x: number; y: number; width: number; height: number };
    content?: { x: number; y: number; width: number; height: number };
    leftColumn?: { x: number; y: number; width: number; height: number };
    rightColumn?: { x: number; y: number; width: number; height: number };
    footer?: { x: number; y: number; width: number; height: number };
  };
}

export interface Slide {
  id: string;
  title: string;
  elements: SlideElement[];
  connections: ShapeConnection[];
  layout: SlideLayout;
  background: Background;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Theme {
  id: string;
  name: string;
  description?: string;
  colors: {
    primary: Color;
    secondary: Color;
    accent: Color;
    background: Color;
    text: Color;
  };
  fonts: {
    heading: string;
    body: string;
    monospace: string;
  };
  latexClass?: string;
  latexOptions?: Record<string, string>;
  isCustom?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface SlideTemplate {
  id: string;
  name: string;
  description: string;
  thumbnail?: string;
  layout: SlideLayout;
  defaultElements?: Omit<SlideElement, 'id' | 'createdAt' | 'updatedAt'>[];
  isCustom?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface PresentationMetadata {
  author: string;
  title: string;
  subtitle?: string;
  date?: Date;
  institution?: string;
  keywords?: string[];
  description?: string;
}

export interface PresentationSettings {
  slideSize: {
    width: number;
    height: number;
    aspectRatio: '16:9' | '4:3' | '16:10';
  };
  autoSave: boolean;
  autoSaveInterval: number; // in seconds
  latexEngine: 'pdflatex' | 'xelatex' | 'lualatex';
  compilationTimeout: number; // in seconds
  showGrid: boolean;
  snapToGrid: boolean;
  gridSize: number;
}

export interface Presentation {
  id: string;
  title: string;
  slides: Slide[];
  theme: Theme;
  metadata: PresentationMetadata;
  settings: PresentationSettings;
  createdAt: Date;
  updatedAt: Date;
  version: string;
}

// Default values and factory functions
export const createDefaultTheme = (): Theme => ({
  id: 'default',
  name: 'Default Theme',
  colors: {
    primary: { r: 59, g: 130, b: 246 }, // Blue
    secondary: { r: 107, g: 114, b: 128 }, // Gray
    accent: { r: 16, g: 185, b: 129 }, // Green
    background: { r: 255, g: 255, b: 255 }, // White
    text: { r: 17, g: 24, b: 39 }, // Dark gray
  },
  fonts: {
    heading: 'Inter',
    body: 'Inter',
    monospace: 'JetBrains Mono',
  },
});

export const createDefaultSlideLayout = (): SlideLayout => ({
  name: 'default',
  template: 'title-content',
  regions: {
    title: { x: 50, y: 50, width: 700, height: 80 },
    content: { x: 50, y: 150, width: 700, height: 400 },
    footer: { x: 50, y: 580, width: 700, height: 40 },
  },
});

export const createDefaultBackground = (): Background => ({
  type: 'color',
  color: { r: 255, g: 255, b: 255 },
});

export const createDefaultPresentationSettings = (): PresentationSettings => ({
  slideSize: {
    width: 800,
    height: 600,
    aspectRatio: '4:3',
  },
  autoSave: true,
  autoSaveInterval: 30,
  latexEngine: 'pdflatex',
  compilationTimeout: 30,
  showGrid: false,
  snapToGrid: true,
  gridSize: 10,
});

export const createDefaultPresentationMetadata = (): PresentationMetadata => ({
  author: '',
  title: 'New Presentation',
  date: new Date(),
});