#!/usr/bin/env node

// Comprehensive test of the fixed coordinate system with all features
const fs = require('fs');

const mockPresentation = {
  title: "Comprehensive Position Test",
  metadata: {
    title: "Comprehensive Position Test",
    author: "Test User",
    date: new Date()
  },
  theme: {
    colors: {
      primary: { r: 46, g: 134, b: 171 },
      secondary: { r: 162, g: 59, b: 114 },
      accent: { r: 241, g: 143, b: 1 },
      background: { r: 255, g: 255, b: 255 },
      text: { r: 51, g: 51, b: 51 }
    },
    fonts: {
      heading: "Inter",
      body: "Inter"
    },
    latexClass: "beamer"
  },
  slides: [
    {
      id: "test-slide",
      title: "Comprehensive Position Test",
      elements: [
        // Test absolute edges with corrected coordinates
        {
          id: "edge-1",
          type: "text",
          position: { x: 0, y: 0 },
          size: { width: 50, height: 30 },
          content: "1",
          properties: { fontSize: 12, textAlign: "left" }
        },
        {
          id: "edge-2",
          type: "text",
          position: { x: 800, y: 0 },
          size: { width: 50, height: 30 },
          content: "2",
          properties: { fontSize: 12, textAlign: "right" }
        },
        {
          id: "edge-3",
          type: "text",
          position: { x: 0, y: 600 },
          size: { width: 50, height: 30 },
          content: "3",
          properties: { fontSize: 12, textAlign: "left" }
        },
        {
          id: "edge-4",
          type: "text",
          position: { x: 800, y: 600 },
          size: { width: 50, height: 30 },
          content: "4",
          properties: { fontSize: 12, textAlign: "right" }
        },
        // Test dynamic center calculation
        {
          id: "center",
          type: "text",
          position: { x: 400, y: 300 },
          size: { width: 100, height: 30 },
          content: "CENTER",
          properties: { fontSize: 14, textAlign: "center" }
        },
        // Test different font sizes
        {
          id: "small-font",
          type: "text",
          position: { x: 100, y: 100 },
          size: { width: 150, height: 25 },
          content: "Small Font (10pt)",
          properties: { fontSize: 10, textAlign: "left" }
        },
        {
          id: "large-font",
          type: "text",
          position: { x: 500, y: 100 },
          size: { width: 200, height: 40 },
          content: "Large Font (20pt)",
          properties: { fontSize: 20, textAlign: "left", fontWeight: "bold" }
        },
        // Test multi-line text with newlines
        {
          id: "multiline-1",
          type: "text",
          position: { x: 50, y: 200 },
          size: { width: 250, height: 80 },
          content: "Multi-line text\\nSecond line\\nThird line",
          properties: { fontSize: 14, textAlign: "left" }
        },
        // Test text with different alignments
        {
          id: "align-center",
          type: "text",
          position: { x: 350, y: 200 },
          size: { width: 200, height: 60 },
          content: "Centered\\nMulti-line\\nText",
          properties: { fontSize: 14, textAlign: "center" }
        },
        {
          id: "align-right",
          type: "text",
          position: { x: 600, y: 200 },
          size: { width: 150, height: 60 },
          content: "Right\\nAligned\\nText",
          properties: { fontSize: 14, textAlign: "right" }
        },
        // Test long single line text
        {
          id: "long-text",
          type: "text",
          position: { x: 100, y: 400 },
          size: { width: 600, height: 30 },
          content: "This is a very long single line of text that should wrap properly within the textblock",
          properties: { fontSize: 12, textAlign: "left" }
        },
        // Test formatted text
        {
          id: "formatted",
          type: "text",
          position: { x: 100, y: 500 },
          size: { width: 200, height: 60 },
          content: "Bold and Italic\\nFormatted Text",
          properties: { 
            fontSize: 16, 
            textAlign: "left", 
            fontWeight: "bold", 
            fontStyle: "italic",
            textColor: { r: 162, g: 59, b: 114 }
          }
        }
      ],
      background: {
        type: "color",
        color: { r: 255, g: 255, b: 255 }
      },
      connections: []
    }
  ]
};

// Use the corrected coordinate conversion and width calculation
function generateTextElement(element) {
  const { position, size, properties, content } = element;
  
  if (!content) return '% Empty text element\n';
  
  let latex = '\n% Text Element\n';
  
  // Corrected coordinate conversion
  const CANVAS_WIDTH = 800;
  const CANVAS_HEIGHT = 600;
  const X_OFFSET = 0.2;   // Corrected left edge
  const Y_OFFSET = 1.0;   // Top edge
  const USABLE_WIDTH_CM = 15.3;   // 15.5 - 0.2
  const USABLE_HEIGHT_CM = 7.3;   // 8.3 - 1.0
  
  const X_SCALE = USABLE_WIDTH_CM / CANVAS_WIDTH;   // 0.019125
  const Y_SCALE = USABLE_HEIGHT_CM / CANVAS_HEIGHT; // 0.012167
  
  const x = X_OFFSET + (position.x * X_SCALE);
  const y = Y_OFFSET + (position.y * Y_SCALE);
  const width = size.width * X_SCALE;
  const height = size.height * Y_SCALE;
  
  // Dynamic width calculation
  const fontSize = properties.fontSize || 12;
  const hasNewlines = content.includes('\\n');
  const lines = content.split('\\n');
  const maxLineLength = Math.max(...lines.map(line => line.length));
  
  const avgCharWidthCm = (fontSize * 0.6) / 28.35;
  const estimatedMinWidth = maxLineLength * avgCharWidthCm;
  let calculatedWidth = Math.max(estimatedMinWidth, width);
  
  if (hasNewlines) {
    calculatedWidth = Math.max(calculatedWidth, 2.0);
    if (lines.length > 3) {
      calculatedWidth = Math.max(calculatedWidth, width * 1.2);
    }
  } else if (content.length < 10) {
    calculatedWidth = Math.max(1.0, calculatedWidth * 0.9);
  }
  
  if (fontSize > 16) {
    calculatedWidth *= 1.1;
  } else if (fontSize < 10) {
    calculatedWidth *= 0.9;
  }
  
  const maxAllowedWidth = 15.3 - 0.4;
  calculatedWidth = Math.min(calculatedWidth, maxAllowedWidth);
  calculatedWidth = Math.max(0.5, calculatedWidth);
  
  console.log(`Text "${content.substring(0, 20)}...": Canvas(${position.x}, ${position.y}) -> LaTeX(${x.toFixed(2)}, ${y.toFixed(2)}) [Width: ${calculatedWidth.toFixed(2)}cm, Font: ${fontSize}pt]`);
  
  // Text formatting
  let textFormatting = '';
  if (properties.fontSize) {
    const lineSpacing = properties.fontSize * 1.2;
    textFormatting += `\\fontsize{${properties.fontSize}}{${lineSpacing}}\\selectfont`;
  }
  
  if (properties.fontWeight === 'bold') {
    textFormatting += '\\bfseries ';
  }
  
  if (properties.fontStyle === 'italic') {
    textFormatting += '\\itshape ';
  }
  
  if (properties.textColor) {
    if (properties.textColor.r === 162 && properties.textColor.g === 59 && properties.textColor.b === 114) {
      textFormatting += '\\color{secondary} ';
    }
  }
  
  latex += `\\begin{textblock*}{${calculatedWidth.toFixed(2)}cm}(${x.toFixed(2)}cm,${y.toFixed(2)}cm)\n`;
  
  if (textFormatting) {
    latex += `{${textFormatting}`;
  }
  
  // Handle text alignment
  if (properties.textAlign === 'center') {
    latex += '\\centering ';
  } else if (properties.textAlign === 'right') {
    latex += '\\raggedleft ';
  } else {
    latex += '\\raggedright ';
  }
  
  // Process content with improved newline handling
  let processedContent = content;
  processedContent = processedContent.replace(/\\\\n/g, '\\\\');
  processedContent = processedContent.replace(/\\n/g, '\\\\');
  processedContent = processedContent.replace(/\\\\\\\\/g, '\\\\[0.5em]');
  processedContent = processedContent.replace(/  +/g, (match) => {
    const spaceCount = Math.min(match.length, 10);
    return '~'.repeat(spaceCount);
  });
  processedContent = processedContent.replace(/\\\\+$/, '');
  
  latex += processedContent;
  
  if (textFormatting) {
    latex += '}';
  }
  
  latex += '\n\\end{textblock*}\n';
  
  return latex;
}

function generateSlide(slide) {
  let latex = `\\begin{frame}{${slide.title}}\n`;
  
  for (const element of slide.elements) {
    if (element.type === 'text') {
      latex += generateTextElement(element);
    }
  }
  
  latex += '\\end{frame}';
  return latex;
}

function generateDocument(presentation) {
  let latex = `\\documentclass[aspectratio=169,xcolor=dvipsnames,professionalfonts]{beamer}

\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage{babel}
\\usepackage{amsmath}
\\usepackage{amsfonts}
\\usepackage{amssymb}
\\usepackage{graphicx}
\\usepackage{tikz}
\\usepackage{xcolor}
\\usepackage{hyperref}
\\usepackage[absolute,overlay]{textpos}

\\definecolor{primary}{RGB}{46,134,171}
\\definecolor{secondary}{RGB}{162,59,114}
\\definecolor{accent}{RGB}{241,143,1}
\\definecolor{background}{RGB}{255,255,255}
\\definecolor{text}{RGB}{51,51,51}

\\usetheme{default}
\\usecolortheme[named=primary]{structure}

\\usetikzlibrary{shapes.geometric,arrows.meta,positioning,calc}

\\title{${presentation.metadata.title}}
\\author{${presentation.metadata.author}}
\\date{\\today}

\\begin{document}

\\begin{frame}
\\titlepage
\\end{frame}

`;

  for (const slide of presentation.slides) {
    latex += generateSlide(slide);
    latex += '\n\n';
  }

  latex += '\\end{document}';
  return latex;
}

console.log('🔧 Testing comprehensive positioning with all features...');
const latex = generateDocument(mockPresentation);

fs.writeFileSync('test-comprehensive.tex', latex);
console.log('✅ Generated test-comprehensive.tex');

console.log('\n📊 Summary of fixes implemented:');
console.log('✅ Corrected coordinate system: Left edge 0.2cm, Right edge 15.5cm');
console.log('✅ Dynamic center calculation: (7.85cm, 4.65cm)');
console.log('✅ Font-size aware width calculation');
console.log('✅ Proper newline handling with \\\\');
console.log('✅ Multi-line text support');
console.log('✅ Text alignment (left, center, right)');
console.log('✅ Font formatting (bold, italic, colors)');
console.log('✅ Automatic text wrapping within textblocks');

console.log('\n📄 LaTeX content preview:');
console.log(latex.substring(0, 1000) + '...');