#!/usr/bin/env node

/**
 * Test script to verify that text elements are excluded from LaTeX generation
 */

const { LaTeXGenerator } = require('./src/services/latexGenerator.ts');

// Create a test slide with text elements
const testSlide = {
  id: 'test-slide',
  title: 'Test Slide',
  elements: [
    {
      id: 'text-1',
      type: 'text',
      position: { x: 100, y: 100 },
      size: { width: 200, height: 50 },
      properties: {
        fontSize: 16,
        fontFamily: 'Arial',
        textColor: { r: 0, g: 0, b: 0 },
        textAlign: 'left'
      },
      content: 'This is a test text element',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'shape-1',
      type: 'shape',
      position: { x: 200, y: 200 },
      size: { width: 100, height: 100 },
      properties: {
        shapeType: 'rectangle',
        fillColor: { r: 255, g: 0, b: 0 }
      },
      content: '',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ],
  background: {
    type: 'color',
    color: { r: 255, g: 255, b: 255 }
  },
  connections: []
};

const testTheme = {
  id: 'default',
  name: 'Default',
  colors: {
    primary: { r: 46, g: 134, b: 171 },
    secondary: { r: 162, g: 59, b: 114 },
    accent: { r: 241, g: 143, b: 1 },
    background: { r: 255, g: 255, b: 255 },
    text: { r: 51, g: 51, b: 51 }
  },
  fonts: {
    heading: 'Inter',
    body: 'Inter'
  },
  latexClass: 'beamer'
};

console.log('🧪 Testing LaTeX generation with text elements...');

try {
  const generator = new LaTeXGenerator();
  const latex = generator.generateSlide(testSlide, testTheme);
  
  console.log('\n📄 Generated LaTeX:');
  console.log(latex);
  
  // Check if text elements are properly skipped
  const hasTextElement = latex.includes('Text element skipped');
  const hasShapeElement = latex.includes('Shape Element');
  const hasTextContent = latex.includes('This is a test text element');
  
  console.log('\n🔍 Analysis:');
  console.log(`✅ Text element skipped: ${hasTextElement}`);
  console.log(`✅ Shape element included: ${hasShapeElement}`);
  console.log(`❌ Text content excluded: ${!hasTextContent}`);
  
  if (hasTextElement && !hasTextContent) {
    console.log('\n🎉 SUCCESS: Text elements are properly excluded from LaTeX generation!');
  } else {
    console.log('\n❌ ISSUE: Text elements are still being included in LaTeX generation');
  }
  
} catch (error) {
  console.error('❌ Error testing LaTeX generation:', error.message);
}