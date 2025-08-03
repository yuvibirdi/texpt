#!/usr/bin/env node

// Test the absolute edge coordinate system
const fs = require('fs');

// Test with the exact absolute edge coordinates you provided
const mockPresentation = {
  title: "Absolute Edge Test",
  metadata: {
    title: "Absolute Edge Test",
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
      title: "Absolute Edge Test",
      elements: [
        // Test the absolute edges with single characters
        {
          id: "text-1",
          type: "text",
          position: { x: 0, y: 0 },
          size: { width: 50, height: 30 },
          content: "1",
          properties: { fontSize: 12, textAlign: "left" }
        },
        {
          id: "text-2",
          type: "text",
          position: { x: 800, y: 0 },
          size: { width: 50, height: 30 },
          content: "2",
          properties: { fontSize: 12, textAlign: "right" }
        },
        {
          id: "text-3",
          type: "text",
          position: { x: 0, y: 600 },
          size: { width: 50, height: 30 },
          content: "3",
          properties: { fontSize: 12, textAlign: "left" }
        },
        {
          id: "text-4",
          type: "text",
          position: { x: 800, y: 600 },
          size: { width: 50, height: 30 },
          content: "4",
          properties: { fontSize: 12, textAlign: "right" }
        },
        {
          id: "text-5",
          type: "text",
          position: { x: 400, y: 300 },
          size: { width: 50, height: 30 },
          content: "CENTER",
          properties: { fontSize: 14, textAlign: "center" }
        },
        // Test multi-line text
        {
          id: "text-6",
          type: "text",
          position: { x: 200, y: 150 },
          size: { width: 200, height: 60 },
          content: "Multi-line\\nText Test\\nWith Breaks",
          properties: { fontSize: 16, textAlign: "left" }
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

// Use the updated coordinate conversion from the actual implementation
function generateTextElement(element) {
  const { position, size, properties, content } = element;

  if (!content) return '% Empty text element\n';

  let latex = '\n% Text Element\n';

  // Use the exact coordinate conversion from the updated implementation
  const CANVAS_WIDTH = 800;
  const CANVAS_HEIGHT = 600;

  const X_OFFSET = 0.5;   // Left edge offset
  const Y_OFFSET = 1.0;   // Top edge offset
  const USABLE_WIDTH_CM = 15.0;   // 15.5 - 0.5 = 15.0cm usable width
  const USABLE_HEIGHT_CM = 7.3;   // 8.3 - 1.0 = 7.3cm usable height

  // Scale factors based on actual usable area
  const X_SCALE = USABLE_WIDTH_CM / CANVAS_WIDTH;   // 15.0 / 800 = 0.01875
  const Y_SCALE = USABLE_HEIGHT_CM / CANVAS_HEIGHT; // 7.3 / 600 = 0.01217

  // Convert coordinates using the actual working formula
  const x = X_OFFSET + (position.x * X_SCALE);
  const y = Y_OFFSET + (position.y * Y_SCALE);
  const width = size.width * X_SCALE;
  const height = size.height * Y_SCALE;

  // Calculate dynamic width (simplified)
  let dynamicWidth = width;
  const hasNewlines = content.includes('\\n');
  if (hasNewlines || content.length > 50) {
    dynamicWidth = Math.max(2.0, width);
  } else if (content.length < 20) {
    dynamicWidth = Math.max(1.0, width * 0.8);
  }

  console.log(`Text "${content}": Canvas(${position.x}, ${position.y}) -> LaTeX(${x.toFixed(2)}, ${y.toFixed(2)}) [Width: ${dynamicWidth.toFixed(2)}cm]`);

  // Text formatting
  let textFormatting = '';
  if (properties.fontSize) {
    const lineSpacing = properties.fontSize * 1.2;
    textFormatting += `\\fontsize{${properties.fontSize}}{${lineSpacing}}\\selectfont`;
  }

  latex += `\\begin{textblock*}{${dynamicWidth.toFixed(2)}cm}(${x.toFixed(2)}cm,${y.toFixed(2)}cm)\n`;

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

  // Process content - handle newlines
  let processedContent = content.replace(/\\n/g, '\\\\');
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

console.log('🔧 Testing absolute edge coordinates...');
const latex = generateDocument(mockPresentation);

fs.writeFileSync('test-absolute-edges.tex', latex);
console.log('✅ Generated test-absolute-edges.tex');

console.log('\n📄 LaTeX content:');
console.log(latex);