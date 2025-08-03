// Debug script to capture full LaTeX compilation errors
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Sample LaTeX content that should work
const testLatex = `\\documentclass[aspectratio=169,xcolor=dvipsnames,professionalfonts]{beamer}

\\usepackage{inputenc}
\\usepackage{fontenc}
\\usepackage{babel}
\\usepackage{amsmath}
\\usepackage{amsfonts}
\\usepackage{amssymb}
\\usepackage{graphicx}
\\usepackage{tikz}
\\usepackage{xcolor}
\\usepackage{hyperref}

\\definecolor{primaryColor}{RGB}{51, 122, 183}
\\definecolor{secondaryColor}{RGB}{108, 117, 125}

\\usetheme{default}
\\usecolortheme{default}

\\title{Test Presentation}
\\author{Test Author}
\\date{\\today}

\\begin{document}

\\begin{frame}
\\titlepage
\\end{frame}

\\begin{frame}{Test Slide}
\\begin{itemize}
\\item First item
\\item Second item
\\end{itemize}
\\end{frame}

\\end{document}`;

async function testLatexCompilation() {
  console.log('=== TESTING LATEX COMPILATION ===');
  
  // Create temp directory
  const tempDir = '/tmp/latex-debug';
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  // Write test file
  const texFile = path.join(tempDir, 'test.tex');
  fs.writeFileSync(texFile, testLatex);
  console.log('Test LaTeX file written to:', texFile);
  
  // Run pdflatex
  console.log('Running pdflatex...');
  const pdflatex = spawn('/Library/TeX/texbin/pdflatex', [
    '-interaction=nonstopmode',
    '-file-line-error',
    '-output-directory=' + tempDir,
    texFile
  ], {
    cwd: tempDir,
    stdio: ['pipe', 'pipe', 'pipe']
  });
  
  let stdout = '';
  let stderr = '';
  
  pdflatex.stdout.on('data', (data) => {
    stdout += data.toString();
  });
  
  pdflatex.stderr.on('data', (data) => {
    stderr += data.toString();
  });
  
  pdflatex.on('close', (code) => {
    console.log('\\n=== COMPILATION RESULT ===');
    console.log('Exit code:', code);
    console.log('\\n=== STDOUT ===');
    console.log(stdout);
    console.log('\\n=== STDERR ===');
    console.log(stderr);
    
    // Check if PDF was created
    const pdfFile = path.join(tempDir, 'test.pdf');
    const pdfExists = fs.existsSync(pdfFile);
    console.log('\\n=== PDF CREATED ===');
    console.log('PDF exists:', pdfExists);
    
    if (pdfExists) {
      const stats = fs.statSync(pdfFile);
      console.log('PDF size:', stats.size, 'bytes');
    }
    
    // Check log file for errors
    const logFile = path.join(tempDir, 'test.log');
    if (fs.existsSync(logFile)) {
      console.log('\\n=== LOG FILE CONTENT ===');
      const logContent = fs.readFileSync(logFile, 'utf8');
      console.log(logContent);
    }
  });
}

testLatexCompilation().catch(console.error);