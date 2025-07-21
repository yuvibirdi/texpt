#!/usr/bin/env node

const { LaTeXCompilerNode } = require('./build/electron/src/services/latexCompilerNode.js');

async function testLatexSetup() {
  console.log('🔍 Testing LaTeX setup...\n');
  
  const compiler = new LaTeXCompilerNode();
  
  try {
    // Test LaTeX availability
    console.log('1. Checking LaTeX availability...');
    const availability = await compiler.checkLatexAvailability();
    
    if (availability.available) {
      console.log('✅ LaTeX is available!');
      console.log(`   Version: ${availability.version || 'Unknown'}`);
      console.log(`   Compilers: ${availability.compilers.join(', ')}`);
    } else {
      console.log('❌ LaTeX is not available');
      console.log('   Make sure LaTeX is installed and accessible');
      return;
    }
    
    console.log('\n2. Testing basic LaTeX compilation...');
    
    // Simple LaTeX document for testing
    const testLatex = `\\documentclass{article}
\\usepackage[utf8]{inputenc}
\\title{Test Document}
\\author{LaTeX Presentation Editor}
\\date{\\today}

\\begin{document}
\\maketitle

\\section{Introduction}
This is a test document to verify LaTeX compilation is working correctly.

\\subsection{Features}
\\begin{itemize}
\\item Basic text formatting
\\item Mathematical expressions: $E = mc^2$
\\item Lists and sections
\\end{itemize}

\\section{Conclusion}
If you can see this PDF, LaTeX compilation is working!

\\end{document}`;

    // Set up event listeners
    compiler.on('progress', (progress) => {
      console.log(`   Progress: ${progress.stage} - ${progress.progress}% - ${progress.message}`);
    });
    
    compiler.on('job-completed', (result) => {
      if (result.success) {
        console.log('✅ LaTeX compilation successful!');
        console.log(`   PDF generated at: ${result.pdfPath}`);
        console.log(`   Compilation time: ${result.duration}ms`);
        
        if (result.warnings.length > 0) {
          console.log(`   Warnings: ${result.warnings.length}`);
          result.warnings.forEach(warning => {
            console.log(`     - ${warning.message}`);
          });
        }
      } else {
        console.log('❌ LaTeX compilation failed!');
        console.log(`   Log: ${result.log}`);
        
        if (result.errors.length > 0) {
          console.log('   Errors:');
          result.errors.forEach(error => {
            console.log(`     - ${error.message}`);
          });
        }
      }
      
      // Cleanup and exit
      compiler.cleanup().then(() => {
        process.exit(result.success ? 0 : 1);
      });
    });
    
    // Start compilation
    const jobId = await compiler.compile(testLatex, {
      compiler: 'pdflatex',
      timeout: 15000
    });
    
    console.log(`   Job started with ID: ${jobId}`);
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    await compiler.cleanup();
    process.exit(1);
  }
}

// Run the test
testLatexSetup().catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});