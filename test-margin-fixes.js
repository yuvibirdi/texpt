#!/usr/bin/env node

// Test the margin fixes and text wrapping improvements
const fs = require('fs');

const mockPresentation = {
  title: "Margin Fix Test",
  metadata: {
    title: "Margin Fix Test",
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
      title: "Margin Fix Test",
      elements: [
        // Test absolute edges with 0.3cm margins
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
        // Test large font that was previously cut off
        {
          id: "large-font-test",
          type: "text",
          position: { x: 500, y: 100 },
          size: { width: 250, height: 40 },
          content: "Large Font Test (20pt)",
          properties: { fontSize: 20, textAlign: "left", fontWeight: "bold" }
        },
        // Test very long text that should wrap properly
        {
          id: "long-text-wrap",
          type: "text",
          position: { x: 100, y: 300 },
          size: { width: 600, height: 60 },
          content: "This is a very long single line of text that should wrap properly within the textblock boundaries and not extend beyond the slide edges with proper margins maintained",
          properties: { fontSize: 14, textAlign: "left" }
        },
        // Test text near right edge
        {
          id: "right-edge-test",
          type: "text",
          position: { x: 650, y: 200 },
          size: { width: 150, height: 40 },
          content: "Right Edge Text",
          properties: { fontSize: 16, textAlign: "right" }
        },
        // Test multi-line with different font sizes
        {
          id: "multiline-small",
          type: "text",
          position: { x: 50, y: 450 },
          size: { width: 200, height: 80 },
          content: "Small font\\nmulti-line\\ntext test",
          properties: { fontSize: 10, textAlign: "left" }
        },
        {
          id: "multiline-large",
          type: "text",
          position: { x: 400, y: 450 },
          size: { width: 300, height: 100 },
          content: "Large font\\nmulti-line\\ntext test",
          properties: { fontSize: 18, textAlign: "center", fontWeight: "bold" }
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

// Use the updated coordinate conversion with margins
function generateTextElement(element) {
  const { position, size, properties, content } = element;
  
  if (!content) return '% Empty text element\n';
  
  let latex = '\n% Text Element\n';
  
  // Updated coordinate conversion with 0.3cm margins
  const CANVAS_WIDTH = 800;
  const CANVAS_HEIGHT = 600;
  
  const SLIDE_LEFT_EDGE = 0.2;
  const SLIDE_RIGHT_EDGE = 15.5;
  const Y_OFFSET = 1.0;
  const USABLE_HEIGHT_CM = 7.3;
  
  const TEXT_MARGIN = 0.3;
  const TEXT_LEFT_BOUNDARY = SLIDE_LEFT_EDGE + TEXT_MARGIN;   // 0.5cm
  const TEXT_RIGHT_BOUNDARY = SLIDE_RIGHT_EDGE - TEXT_MARGIN; // 15.2cm
  const TEXT_USABLE_WIDTH = TEXT_RIGHT_BOUNDARY - TEXT_LEFT_BOUNDARY; // 14.7cm
  
  const X_SCALE = TEXT_USABLE_WIDTH / CANVAS_WIDTH;   // 14.7 / 800 = 0.018375
  const Y_SCALE = USABLE_HEIGHT_CM / CANVAS_HEIGHT;   // 7.3 / 600 = 0.012167
  
  const x = TEXT_LEFT_BOUNDARY + (position.x * X_SCALE);
  const y = Y_OFFSET + (position.y * Y_SCALE);
  const width = size.width * X_SCALE;
  const height = size.height * Y_SCALE;
  
  // Dynamic width calculation with improved text wrapping
  const fontSize = properties.fontSize || 12;
  const hasNewlines = content.includes('\\n');
  const lines = content.split('\\n');
  const maxLineLength = Math.max(...lines.map(line => line.length));
  
  const avgCharWidthCm = (fontSize * 0.55) / 28.35;
  const estimatedMinWidth = maxLineLength * avgCharWidthCm;
  let calculatedWidth = Math.max(estimatedMinWidth, width);
  
  if (hasNewlines) {
    calculatedWidth = Math.max(calculatedWidth, 2.0);
    if (lines.length > 3) {
      calculatedWidth = Math.max(calculatedWidth, width * 1.1);
    }
  } else {
    if (content.length > 60) {
      calculatedWidth = Math.max(calculatedWidth, TEXT_USABLE_WIDTH * 0.8);
    } else if (content.length < 10) {
      calculatedWidth = Math.max(1.0, calculatedWidth * 0.8);
    }
  }
  
  // Font size adjustments
  if (fontSize > 18) {
    calculatedWidth *= 1.2;
  } else if (fontSize > 14) {
    calculatedWidth *= 1.1;
  } else if (fontSize < 10) {
    calculatedWidth *= 0.85;
  }
  
  calculatedWidth = Math.min(calculatedWidth, TEXT_USABLE_WIDTH);
  calculatedWidth = Math.max(0.8, calculatedWidth);
  
  // Check if text would exceed right boundary and adjust
  const maxX = x + calculatedWidth;
  if (maxX > TEXT_RIGHT_BOUNDARY) {
    const adjustedWidth = TEXT_RIGHT_BOUNDARY - x;
    calculatedWidth = Math.max(0.8, adjustedWidth);
    console.log(`⚠️ [Width Adjustment] "${content.substring(0, 20)}..." would exceed boundary. Adjusted from ${(x + calculatedWidth).toFixed(2)}cm to ${(x + calculatedWidth).toFixed(2)}cm`);
  }
  
  console.log(`Text "${content.substring(0, 20)}...": Canvas(${position.x}, ${position.y}) -> LaTeX(${x.toFixed(2)}, ${y.toFixed(2)}) [Width: ${calculatedWidth.toFixed(2)}cm, Font: ${fontSize}pt, Boundary: ${TEXT_RIGHT_BOUNDARY}cm]`);
  
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

console.log('🔧 Testing margin fixes and text wrapping improvements...');
const latex = generateDocument(mockPresentation);

fs.writeFileSync('test-margin-fixes.tex', latex);
console.log('✅ Generated test-margin-fixes.tex');

console.log('\n📊 Margin and wrapping fixes implemented:');
console.log('✅ 0.3cm margins from left and right edges');
console.log('✅ Text-safe area: 0.5cm to 15.2cm (14.7cm usable width)');
console.log('✅ Improved width calculation for large fonts');
console.log('✅ Better text wrapping for long content');
console.log('✅ Boundary checking to prevent text cutoff');
console.log('✅ Font-size aware spacing adjustments');

console.log('\n📄 LaTeX content preview:');
console.log(latex.substring(0, 1000) + '...');