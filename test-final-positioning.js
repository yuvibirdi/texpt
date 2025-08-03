#!/usr/bin/env node

// Test to understand the actual coordinate system and fix positioning
const fs = require('fs');

// Create a test with more precise positioning to understand the coordinate system
const mockPresentation = {
  title: "Final Position Test",
  metadata: {
    title: "Final Position Test",
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
      title: "Final Position Test",
      elements: [
        // Corner positions to test the coordinate system
        {
          id: "text-1",
          type: "text",
          position: { x: 0, y: 0 },
          size: { width: 100, height: 30 },
          content: "0,0",
          properties: { fontSize: 12, textAlign: "left" }
        },
        {
          id: "text-2",
          type: "text",
          position: { x: 700, y: 0 },
          size: { width: 100, height: 30 },
          content: "700,0",
          properties: { fontSize: 12, textAlign: "right" }
        },
        {
          id: "text-3",
          type: "text",
          position: { x: 0, y: 570 },
          size: { width: 100, height: 30 },
          content: "0,570",
          properties: { fontSize: 12, textAlign: "left" }
        },
        {
          id: "text-4",
          type: "text",
          position: { x: 700, y: 570 },
          size: { width: 100, height: 30 },
          content: "700,570",
          properties: { fontSize: 12, textAlign: "right" }
        },
        // Center position
        {
          id: "text-5",
          type: "text",
          position: { x: 350, y: 285 },
          size: { width: 100, height: 30 },
          content: "CENTER",
          properties: { fontSize: 14, textAlign: "center" }
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

// Updated LaTeX generator with better coordinate system
function generateTextElement(element) {
  const { position, size, properties, content } = element;
  
  if (!content) return '% Empty text element\n';
  
  let latex = '\n% Text Element\n';
  
  // Canvas dimensions
  const CANVAS_WIDTH = 800;
  const CANVAS_HEIGHT = 600;
  
  // More accurate Beamer slide dimensions
  // The textpos package uses the full slide area, so we need to account for this
  const SLIDE_WIDTH_CM = 12.8;   // Full slide width (16:9 aspect ratio)
  const SLIDE_HEIGHT_CM = 9.6;   // Full slide height
  
  // But we need to offset for the title area and margins
  const TITLE_HEIGHT_CM = 1.5;   // Approximate title area height
  const MARGIN_X_CM = 1.0;       // Left/right margins
  const MARGIN_Y_CM = 0.5;       // Top/bottom margins (after title)
  
  // Usable area after accounting for title and margins
  const USABLE_WIDTH_CM = SLIDE_WIDTH_CM - (2 * MARGIN_X_CM);
  const USABLE_HEIGHT_CM = SLIDE_HEIGHT_CM - TITLE_HEIGHT_CM - (2 * MARGIN_Y_CM);
  
  const scaleX = USABLE_WIDTH_CM / CANVAS_WIDTH;
  const scaleY = USABLE_HEIGHT_CM / CANVAS_HEIGHT;
  
  // Position relative to usable area, then add margins and title offset
  const x = MARGIN_X_CM + (position.x * scaleX);
  const y = TITLE_HEIGHT_CM + MARGIN_Y_CM + (position.y * scaleY);
  const width = size.width * scaleX;
  const height = size.height * scaleY;
  
  console.log(`Text "${content}": Canvas(${position.x}, ${position.y}) -> LaTeX(${x.toFixed(2)}, ${y.toFixed(2)}) [Usable: ${USABLE_WIDTH_CM}x${USABLE_HEIGHT_CM}cm]`);
  
  // Text formatting
  let textFormatting = '';
  if (properties.fontSize) {
    textFormatting += `\\fontsize{${properties.fontSize}}{${properties.fontSize * 1.2}}\\selectfont`;
  }
  
  // Use textblock from textpos package
  latex += `\\begin{textblock*}{${width}cm}(${x}cm,${y}cm)\n`;
  
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
  
  latex += content;
  
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

console.log('🔧 Generating final positioning test...');
const latex = generateDocument(mockPresentation);

fs.writeFileSync('test-final-positioning.tex', latex);
console.log('✅ Generated test-final-positioning.tex');

console.log('\n📄 LaTeX content:');
console.log(latex);