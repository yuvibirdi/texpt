// Debug script to generate and examine LaTeX source
const fs = require('fs');
const path = require('path');

// Import the compiled JavaScript modules
const { latexDemo } = require('./build/static/js/main.*.js');

try {
    console.log('Generating LaTeX source...');
    const latexSource = latexDemo.generateDemoLatex();

    console.log('=== GENERATED LATEX SOURCE ===');
    console.log(latexSource);
    console.log('=== END LATEX SOURCE ===');

    // Save to file for examination
    fs.writeFileSync('debug-latex-output.tex', latexSource);
    console.log('LaTeX source saved to debug-latex-output.tex');

} catch (error) {
    console.error('Error generating LaTeX:', error);
}