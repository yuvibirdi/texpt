#!/usr/bin/env node

// Let's test the ACTUAL coordinate system that works
const fs = require('fs');

// Test with your exact coordinates that work
const testData = [
  { canvas: { x: 0, y: 0 }, latex: { x: 0.5, y: 1 }, label: "0,0" },
  { canvas: { x: 700, y: 0 }, latex: { x: 14.5, y: 1 }, label: "700,0" },
  { canvas: { x: 0, y: 570 }, latex: { x: 0.5, y: 8 }, label: "0,570" },
  { canvas: { x: 700, y: 570 }, latex: { x: 14.5, y: 8 }, label: "700,570" },
  { canvas: { x: 350, y: 285 }, latex: { x: 7, y: 4.5 }, label: "CENTER" }
];

// Reverse engineer the actual conversion
console.log('🔧 Reverse engineering the coordinate system...');

testData.forEach(test => {
  const scaleX = test.latex.x / test.canvas.x || 0;
  const scaleY = test.latex.y / test.canvas.y || 0;
  
  console.log(`${test.label}: Canvas(${test.canvas.x}, ${test.canvas.y}) -> LaTeX(${test.latex.x}, ${test.latex.y})`);
  if (test.canvas.x !== 0) console.log(`  Scale X: ${scaleX.toFixed(6)}`);
  if (test.canvas.y !== 0) console.log(`  Scale Y: ${scaleY.toFixed(6)}`);
});

// From your working example, it looks like:
// Canvas 700 -> LaTeX 14.5, so scale = 14.5/700 = 0.0207
// Canvas 570 -> LaTeX 8, so scale = 8/570 = 0.0140

// Let's try to find the pattern
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

// From your working coordinates:
// X: 0->0.5, 700->14.5, 350->7
// Y: 0->1, 570->8, 285->4.5

// This suggests:
// X scale: (14.5 - 0.5) / (700 - 0) = 14/700 = 0.02
// Y scale: (8 - 1) / (570 - 0) = 7/570 = 0.0123

// But there are offsets: X offset = 0.5, Y offset = 1

const X_OFFSET = 0.5;
const Y_OFFSET = 1.0;
const X_SCALE = 14.0 / 700; // 0.02
const Y_SCALE = 7.0 / 570;  // 0.0123

console.log('\n🔧 Calculated conversion factors:');
console.log(`X: offset=${X_OFFSET}, scale=${X_SCALE.toFixed(6)}`);
console.log(`Y: offset=${Y_OFFSET}, scale=${Y_SCALE.toFixed(6)}`);

// Test the conversion
console.log('\n🔧 Testing calculated conversion:');
testData.forEach(test => {
  const calcX = X_OFFSET + (test.canvas.x * X_SCALE);
  const calcY = Y_OFFSET + (test.canvas.y * Y_SCALE);
  
  console.log(`${test.label}: Expected(${test.latex.x}, ${test.latex.y}) -> Calculated(${calcX.toFixed(1)}, ${calcY.toFixed(1)})`);
});

// Generate LaTeX with the correct conversion
function generateCorrectLatex() {
  const elements = [
    { pos: { x: 0, y: 0 }, size: { width: 100, height: 30 }, content: "0,0", align: "left" },
    { pos: { x: 700, y: 0 }, size: { width: 100, height: 30 }, content: "700,0", align: "right" },
    { pos: { x: 0, y: 570 }, size: { width: 100, height: 30 }, content: "0,570", align: "left" },
    { pos: { x: 700, y: 570 }, size: { width: 100, height: 30 }, content: "700,570", align: "right" },
    { pos: { x: 350, y: 285 }, size: { width: 100, height: 30 }, content: "CENTER", align: "center" }
  ];

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

\\title{Correct Coordinate Test}
\\author{Test User}
\\date{\\today}

\\begin{document}

\\begin{frame}
\\titlepage
\\end{frame}

\\begin{frame}{Correct Coordinate Test}
`;

  elements.forEach(el => {
    const x = X_OFFSET + (el.pos.x * X_SCALE);
    const y = Y_OFFSET + (el.pos.y * Y_SCALE);
    const width = el.size.width * X_SCALE; // Scale width too
    
    let alignment = '\\raggedright';
    if (el.align === 'center') alignment = '\\centering';
    if (el.align === 'right') alignment = '\\raggedleft';
    
    latex += `
% Text Element
\\begin{textblock*}{${width.toFixed(2)}cm}(${x.toFixed(2)}cm,${y.toFixed(2)}cm)
{\\fontsize{12}{14.4}\\selectfont${alignment} ${el.content}}
\\end{textblock*}
`;
  });

  latex += `\\end{frame}

\\end{document}`;

  return latex;
}

const correctLatex = generateCorrectLatex();
fs.writeFileSync('debug-actual-output.tex', correctLatex);
console.log('\n✅ Generated debug-actual-output.tex with correct coordinates');
console.log('\n📄 LaTeX content:');
console.log(correctLatex);