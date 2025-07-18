import { latexDemo } from '../latexDemo';
import { latexGenerator } from '../latexGenerator';

describe('LaTeX Demo Service', () => {
  it('should create a demo presentation', () => {
    const presentation = latexDemo.createDemoPresentation();
    
    expect(presentation).toHaveProperty('id', 'demo-presentation');
    expect(presentation).toHaveProperty('title', 'Demo Presentation');
    expect(presentation.slides).toHaveLength(1);
    expect(presentation.slides[0].elements).toHaveLength(2);
  });

  it('should generate LaTeX source from demo presentation', () => {
    const latexSource = latexDemo.generateDemoLatex();
    
    expect(latexSource).toContain('\\documentclass');
    expect(latexSource).toContain('\\begin{document}');
    expect(latexSource).toContain('\\end{document}');
    expect(latexSource).toContain('Demo Slide');
    expect(latexSource).toContain('Welcome to LaTeX Presentation Editor');
  });

  it('should create complex demo with shapes', () => {
    const presentation = latexDemo.createComplexDemo();
    
    expect(presentation.slides).toHaveLength(2);
    expect(presentation.slides[1].title).toBe('Shapes and Diagrams');
    expect(presentation.slides[1].elements).toHaveLength(3);
    
    // Check shape types
    const elements = presentation.slides[1].elements;
    expect(elements[0].properties.shapeType).toBe('rectangle');
    expect(elements[1].properties.shapeType).toBe('circle');
    expect(elements[2].properties.shapeType).toBe('arrow');
  });

  it('should generate LaTeX with mathematical expressions', () => {
    const presentation = latexDemo.createDemoPresentation();
    const latexSource = latexGenerator.generateDocument(presentation);
    
    // Should contain math expressions
    expect(latexSource).toContain('$E = mc^2$');
    expect(latexSource).toContain('$$\\int_{-\\infty}^{\\infty}');
  });

  it('should generate LaTeX with proper document structure', () => {
    const latexSource = latexDemo.generateDemoLatex();
    
    // Check document class and packages
    expect(latexSource).toContain('\\documentclass[aspectratio=169,xcolor=dvipsnames,professionalfonts]{beamer}');
    expect(latexSource).toContain('\\usepackage{inputenc}');
    expect(latexSource).toContain('\\usepackage{amsmath}');
    expect(latexSource).toContain('\\usepackage{tikz}');
    
    // Check metadata
    expect(latexSource).toContain('\\title{Demo Presentation}');
    expect(latexSource).toContain('\\subtitle{Testing LaTeX Compilation}');
    expect(latexSource).toContain('\\author{LaTeX Presentation Editor}');
    
    // Check frame structure
    expect(latexSource).toContain('\\begin{frame}{Demo Slide}');
    expect(latexSource).toContain('\\end{frame}');
  });

  it('should generate LaTeX with TikZ graphics for shapes', () => {
    const presentation = latexDemo.createComplexDemo();
    const latexSource = latexGenerator.generateDocument(presentation);
    
    // Should contain TikZ code for shapes
    expect(latexSource).toContain('\\begin{tikzpicture}');
    expect(latexSource).toContain('\\end{tikzpicture}');
    expect(latexSource).toContain('\\draw');
  });

  it('should handle compilation test', async () => {
    const result = await latexDemo.testCompilation();
    
    expect(result).toHaveProperty('success');
    if (result.success) {
      expect(result).toHaveProperty('jobId');
      expect(result).toHaveProperty('latexSource');
      expect(result.jobId).toMatch(/^job_\d+_\d+$/);
    } else {
      expect(result).toHaveProperty('error');
    }
  });

  it('should get compiler status', () => {
    const status = latexDemo.getCompilerStatus();
    
    expect(status).toHaveProperty('queued');
    expect(status).toHaveProperty('active');
    expect(status).toHaveProperty('total');
    expect(typeof status.queued).toBe('number');
    expect(typeof status.active).toBe('number');
    expect(typeof status.total).toBe('number');
  });

  it('should check LaTeX availability', async () => {
    const availability = await latexDemo.checkLatexAvailability();
    
    expect(availability).toHaveProperty('available');
    expect(availability).toHaveProperty('compilers');
    expect(Array.isArray(availability.compilers)).toBe(true);
  });

  it('should generate proper color definitions', () => {
    const latexSource = latexDemo.generateDemoLatex();
    
    // Should contain color definitions
    expect(latexSource).toContain('\\definecolor{primary}{RGB}');
    expect(latexSource).toContain('\\definecolor{secondary}{RGB}');
    expect(latexSource).toContain('\\definecolor{accent}{RGB}');
  });

  it('should handle text formatting in LaTeX', () => {
    const presentation = latexDemo.createDemoPresentation();
    const textElement = presentation.slides[0].elements[0];
    
    expect(textElement.properties.fontSize).toBe(24);
    expect(textElement.properties.fontWeight).toBe('bold');
    expect(textElement.properties.textAlign).toBe('center');
    
    const latexSource = latexGenerator.generateDocument(presentation);
    expect(latexSource).toContain('\\fontsize{24}');
  });

  it('should generate proper slide dimensions', () => {
    const presentation = latexDemo.createDemoPresentation();
    
    expect(presentation.settings.slideSize).toEqual({
      width: 1920,
      height: 1080,
      aspectRatio: '16:9',
    });
    
    // LaTeX should use 16:9 aspect ratio
    const latexSource = latexGenerator.generateDocument(presentation);
    expect(latexSource).toContain('aspectratio=169');
  });
});