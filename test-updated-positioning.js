#!/usr/bin/env node

// Test the updated coordinate system
const fs = require('fs');

// Create a test with corner positions to verify the coordinate system
const mockPresentation = {
  title: "Updated Position Test",
  metadata: {
    title: "Updated Position Test",
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
      title: "Updated Position Test",
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

// Updated LaTeX generator matching the actual implementation
function generateTextElement(element) {
  const { position, size, properties, content } = element;
  
  if (!content) return '% Empty text element\n';
  
  let latex = '\n% Text Element\n';
  
  // Use the same coordinate conversion as the actual implementation
  const CANVAS_WIDTH = 800;
  const CANVAS_HEIGHT = 600;
  
  // Use the full Beamer slide dimensions for textpos
  const SLIDE_WIDTH_CM = 12.8;   // Full slide width (16:9 aspect ratio)
  const SLIDE_HEIGHT_CM = 9.6;   // Full slide height
  
  // Account for typical Beamer frame margins and title area
  const LEFT_MARGIN_CM = 1.0;    // Left margin
  const TOP_MARGIN_CM = 1.8;     // Top margin (includes title area)
  const USABLE_WIDTH_CM = 10.8;  // Usable width after margins
  const USABLE_HEIGHT_CM = 7.0;  // Usable height after title and margins
  
  // Calculate scaling factors to map canvas pixels to usable LaTeX area
  const scaleX = USABLE_WIDTH_CM / CANVAS_WIDTH;
  const scaleY = USABLE_HEIGHT_CM / CANVAS_HEIGHT;
  
  // Convert position with proper scaling and add margins
  const x = LEFT_MARGIN_CM + (position.x * scaleX);
  const y = TOP_MARGIN_CM + (position.y * scaleY);
  
  // Convert size with proper scaling
  const width = size.width * scaleX;
  const height = size.height * scaleY;
  
  console.log(`Text "${content}": Canvas(${position.x}, ${position.y}) -> LaTeX(${x.toFixed(2)}, ${y.toFixed(2)}) [Scale: ${scaleX.toFixed(4)}, ${scaleY.toFixed(4)}]`);
  
  // Text formatting
  let textFormatting = '';
  if (properties.fontSize) {
    textFormatting += `\\fontsize{${properties.fontSize}}{${properties.fontSize * 1.2}}\\selectfont`;
  }
  
  // Use textblock from textpos package
  latex += `\\begin{textblock*}{${width.toFixed(2)}cm}(${x.toFixed(2)}cm,${y.toFixed(2)}cm)\n`;
  
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

console.log('🔧 Generating updated positioning test...');
const latex = generateDocument(mockPresentation);

fs.writeFileSync('test-updated-positioning.tex', latex);
console.log('✅ Generated test-updated-positioning.tex');

console.log('\n📄 LaTeX content:');
console.log(latex);