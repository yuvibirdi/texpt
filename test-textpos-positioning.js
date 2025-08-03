#!/usr/bin/env node

// Test textpos positioning approach
const fs = require('fs');

// Mock presentation data with text elements at different positions
const mockPresentation = {
  title: "TextPos Position Test",
  metadata: {
    title: "TextPos Position Test",
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
      title: "TextPos Position Test",
      elements: [
        {
          id: "text-1",
          type: "text",
          position: { x: 50, y: 50 },
          size: { width: 200, height: 40 },
          content: "Top Left Text",
          properties: {
            fontSize: 16,
            textAlign: "left",
            textColor: { r: 51, g: 51, b: 51 }
          }
        },
        {
          id: "text-2", 
          type: "text",
          position: { x: 400, y: 300 },
          size: { width: 200, height: 40 },
          content: "Center Text",
          properties: {
            fontSize: 16,
            textAlign: "center",
            textColor: { r: 51, g: 51, b: 51 }
          }
        },
        {
          id: "text-3",
          type: "text", 
          position: { x: 600, y: 500 },
          size: { width: 150, height: 40 },
          content: "Bottom Right",
          properties: {
            fontSize: 16,
            textAlign: "right",
            textColor: { r: 51, g: 51, b: 51 }
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

// Updated LaTeX generator using textpos
function generateTextElement(element) {
  const { position, size, properties, content } = element;
  
  if (!content) return '% Empty text element\n';
  
  let latex = '\n% Text Element\n';
  
  // Use textpos package for absolute positioning
  const CANVAS_WIDTH = 800;
  const CANVAS_HEIGHT = 600;
  const SLIDE_WIDTH_CM = 10.0;   // Usable width after margins
  const SLIDE_HEIGHT_CM = 7.5;   // Usable height after margins and title
  
  const scaleX = SLIDE_WIDTH_CM / CANVAS_WIDTH;
  const scaleY = SLIDE_HEIGHT_CM / CANVAS_HEIGHT;
  
  const x = position.x * scaleX;
  const y = position.y * scaleY;
  const width = size.width * scaleX;
  const height = size.height * scaleY;
  
  console.log(`Text "${content}": Canvas(${position.x}, ${position.y}) -> LaTeX(${x.toFixed(2)}, ${y.toFixed(2)})`);
  
  // Text formatting options
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

console.log('🔧 Generating test LaTeX with textpos positioning...');
const latex = generateDocument(mockPresentation);

fs.writeFileSync('test-textpos-positioning.tex', latex);
console.log('✅ Generated test-textpos-positioning.tex');

console.log('\n📄 LaTeX content:');
console.log(latex);