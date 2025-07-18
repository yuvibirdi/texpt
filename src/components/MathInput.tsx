import React, { useState, useEffect, useRef } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import './MathInput.css';

interface MathInputProps {
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
  placeholder?: string;
}

const MathInput: React.FC<MathInputProps> = ({
  value,
  onChange,
  onClose,
  placeholder = 'Enter LaTeX math expression...'
}) => {
  const [inputValue, setInputValue] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  // Math templates organized by category
  const mathTemplates = {
    basic: [
      { name: 'Fraction', latex: '\\frac{a}{b}', description: 'Fraction' },
      { name: 'Square Root', latex: '\\sqrt{x}', description: 'Square root' },
      { name: 'Nth Root', latex: '\\sqrt[n]{x}', description: 'Nth root' },
      { name: 'Power', latex: 'x^{n}', description: 'Exponent' },
      { name: 'Subscript', latex: 'x_{i}', description: 'Subscript' },
      { name: 'Both', latex: 'x_{i}^{n}', description: 'Subscript and superscript' },
    ],
    calculus: [
      { name: 'Sum', latex: '\\sum_{i=1}^{n} x_i', description: 'Summation' },
      { name: 'Product', latex: '\\prod_{i=1}^{n} x_i', description: 'Product' },
      { name: 'Integral', latex: '\\int_{a}^{b} f(x) \\, dx', description: 'Definite integral' },
      { name: 'Double Integral', latex: '\\iint_{D} f(x,y) \\, dx \\, dy', description: 'Double integral' },
      { name: 'Limit', latex: '\\lim_{x \\to a} f(x)', description: 'Limit' },
      { name: 'Derivative', latex: '\\frac{d}{dx} f(x)', description: 'Derivative' },
      { name: 'Partial', latex: '\\frac{\\partial f}{\\partial x}', description: 'Partial derivative' },
    ],
    matrices: [
      { name: '2×2 Matrix', latex: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}', description: '2×2 Matrix' },
      { name: '3×3 Matrix', latex: '\\begin{pmatrix} a & b & c \\\\ d & e & f \\\\ g & h & i \\end{pmatrix}', description: '3×3 Matrix' },
      { name: 'Determinant', latex: '\\begin{vmatrix} a & b \\\\ c & d \\end{vmatrix}', description: 'Determinant' },
      { name: 'Vector', latex: '\\begin{pmatrix} x \\\\ y \\\\ z \\end{pmatrix}', description: 'Column vector' },
      { name: 'Brackets', latex: '\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}', description: 'Square brackets matrix' },
    ],
    equations: [
      { name: 'Aligned Equations', latex: '\\begin{align}\na &= b + c \\\\\nd &= e + f\n\\end{align}', description: 'Aligned equations' },
      { name: 'Cases', latex: '\\begin{cases}\nx, & \\text{if } x \\geq 0 \\\\\n-x, & \\text{if } x < 0\n\\end{cases}', description: 'Piecewise function' },
      { name: 'System', latex: '\\begin{cases}\nx + y = 1 \\\\\n2x - y = 0\n\\end{cases}', description: 'System of equations' },
    ],
    greek: [
      { name: 'Alpha', latex: '\\alpha', description: 'Greek letter alpha' },
      { name: 'Beta', latex: '\\beta', description: 'Greek letter beta' },
      { name: 'Gamma', latex: '\\gamma', description: 'Greek letter gamma' },
      { name: 'Delta', latex: '\\delta', description: 'Greek letter delta' },
      { name: 'Epsilon', latex: '\\epsilon', description: 'Greek letter epsilon' },
      { name: 'Theta', latex: '\\theta', description: 'Greek letter theta' },
      { name: 'Lambda', latex: '\\lambda', description: 'Greek letter lambda' },
      { name: 'Pi', latex: '\\pi', description: 'Greek letter pi' },
      { name: 'Sigma', latex: '\\sigma', description: 'Greek letter sigma' },
      { name: 'Phi', latex: '\\phi', description: 'Greek letter phi' },
      { name: 'Omega', latex: '\\omega', description: 'Greek letter omega' },
    ],
    sets: [
      { name: 'Set', latex: '\\{a, b, c\\}', description: 'Set notation' },
      { name: 'Empty Set', latex: '\\emptyset', description: 'Empty set' },
      { name: 'Union', latex: 'A \\cup B', description: 'Set union' },
      { name: 'Intersection', latex: 'A \\cap B', description: 'Set intersection' },
      { name: 'Subset', latex: 'A \\subset B', description: 'Subset' },
      { name: 'Element of', latex: 'x \\in A', description: 'Element of set' },
    ]
  };

  // Common math symbols
  const mathSymbols = [
    { symbol: '±', latex: '\\pm' },
    { symbol: '∞', latex: '\\infty' },
    { symbol: '≤', latex: '\\leq' },
    { symbol: '≥', latex: '\\geq' },
    { symbol: '≠', latex: '\\neq' },
    { symbol: '≈', latex: '\\approx' },
    { symbol: '∈', latex: '\\in' },
    { symbol: '∉', latex: '\\notin' },
    { symbol: '⊂', latex: '\\subset' },
    { symbol: '⊃', latex: '\\supset' },
    { symbol: '∪', latex: '\\cup' },
    { symbol: '∩', latex: '\\cap' },
  ];

  // Enhanced math expression validation with more comprehensive checks
  const validateMathExpression = (expression: string): { isValid: boolean; error?: string; suggestions?: string[] } => {
    if (!expression.trim()) {
      return { isValid: false, error: 'Expression cannot be empty' };
    }

    // Check for common LaTeX syntax errors
    const commonErrors = [
      { pattern: /\\[a-zA-Z]+\s*\{[^}]*$/, message: 'Unclosed brace - missing }', suggestion: 'Add closing brace }' },
      { pattern: /\{[^}]*\\[a-zA-Z]+$/, message: 'Incomplete command inside braces', suggestion: 'Complete the LaTeX command' },
      { pattern: /\\frac\s*\{[^}]*\}\s*$/, message: 'Incomplete fraction - missing denominator', suggestion: 'Add denominator: \\frac{a}{b}' },
      { pattern: /\\frac\s*$/, message: 'Incomplete fraction - missing numerator and denominator', suggestion: 'Add both parts: \\frac{a}{b}' },
      { pattern: /\\sqrt\s*$/, message: 'Incomplete square root', suggestion: 'Add content: \\sqrt{x}' },
      { pattern: /\^\s*$/, message: 'Empty superscript', suggestion: 'Add exponent: x^{n}' },
      { pattern: /_\s*$/, message: 'Empty subscript', suggestion: 'Add subscript: x_{i}' },
      { pattern: /\\begin\{[^}]+\}(?!.*\\end\{[^}]+\})/, message: 'Missing \\end command', suggestion: 'Add corresponding \\end{...}' },
      { pattern: /\\end\{[^}]+\}(?!.*\\begin\{[^}]+\})/, message: 'Orphaned \\end command', suggestion: 'Add corresponding \\begin{...}' },
      { pattern: /\$\$.*\$(?!\$)/, message: 'Mixed math delimiters', suggestion: 'Use either $ $ or $$ $$ consistently' },
      { pattern: /\\sum(?!\s*_)/, message: 'Summation without bounds', suggestion: 'Add bounds: \\sum_{i=1}^{n}' },
      { pattern: /\\int(?!\s*_)/, message: 'Integral without bounds', suggestion: 'Add bounds: \\int_{a}^{b}' },
      { pattern: /\\lim(?!\s*_)/, message: 'Limit without variable', suggestion: 'Add variable: \\lim_{x \\to a}' },
    ];

    for (const errorCheck of commonErrors) {
      if (errorCheck.pattern.test(expression)) {
        return { 
          isValid: false, 
          error: errorCheck.message, 
          suggestions: [errorCheck.suggestion] 
        };
      }
    }

    // Check for balanced braces
    let braceCount = 0;
    let bracketCount = 0;
    let parenCount = 0;
    
    for (let i = 0; i < expression.length; i++) {
      const char = expression[i];
      const prevChar = i > 0 ? expression[i - 1] : '';
      
      if (char === '{' && prevChar !== '\\') braceCount++;
      if (char === '}' && prevChar !== '\\') braceCount--;
      if (char === '[' && prevChar !== '\\') bracketCount++;
      if (char === ']' && prevChar !== '\\') bracketCount--;
      if (char === '(' && prevChar !== '\\') parenCount++;
      if (char === ')' && prevChar !== '\\') parenCount--;
      
      if (braceCount < 0) {
        return { 
          isValid: false, 
          error: 'Unmatched closing brace }', 
          suggestions: ['Remove extra } or add opening {'] 
        };
      }
      if (bracketCount < 0) {
        return { 
          isValid: false, 
          error: 'Unmatched closing bracket ]', 
          suggestions: ['Remove extra ] or add opening ['] 
        };
      }
      if (parenCount < 0) {
        return { 
          isValid: false, 
          error: 'Unmatched closing parenthesis )', 
          suggestions: ['Remove extra ) or add opening ('] 
        };
      }
    }
    
    const suggestions: string[] = [];
    if (braceCount > 0) {
      suggestions.push(`Add ${braceCount} closing brace${braceCount > 1 ? 's' : ''} }`);
    }
    if (bracketCount > 0) {
      suggestions.push(`Add ${bracketCount} closing bracket${bracketCount > 1 ? 's' : ''} ]`);
    }
    if (parenCount > 0) {
      suggestions.push(`Add ${parenCount} closing parenthesis${parenCount > 1 ? 'es' : ''} )`);
    }
    
    if (suggestions.length > 0) {
      return { 
        isValid: false, 
        error: 'Unclosed delimiters found', 
        suggestions 
      };
    }

    // Check for potentially problematic patterns
    const warnings = [];
    if (expression.includes('\\\\') && !expression.includes('\\begin{')) {
      warnings.push('Double backslash \\\\ should be used inside environments like align or matrix');
    }
    if (expression.includes('&') && !expression.includes('\\begin{')) {
      warnings.push('Alignment character & should be used inside environments like align or matrix');
    }

    return { isValid: true, suggestions: warnings };
  };

  // Update preview when input changes
  useEffect(() => {
    if (!inputValue.trim()) {
      setPreviewHtml('');
      setError(null);
      return;
    }

    // First validate the expression
    const validation = validateMathExpression(inputValue);
    if (!validation.isValid) {
      setError(validation.error || 'Invalid expression');
      setPreviewHtml('');
      return;
    }

    try {
      const html = katex.renderToString(inputValue, {
        displayMode: true,
        throwOnError: true,
        errorColor: '#cc0000',
        macros: {
          '\\RR': '\\mathbb{R}',
          '\\NN': '\\mathbb{N}',
          '\\ZZ': '\\mathbb{Z}',
          '\\QQ': '\\mathbb{Q}',
          '\\CC': '\\mathbb{C}',
          '\\eps': '\\varepsilon',
          '\\phi': '\\varphi',
          '\\implies': '\\Rightarrow',
          '\\iff': '\\Leftrightarrow',
        },
      });
      setPreviewHtml(html);
      setError(null);
    } catch (err) {
      let errorMessage = 'Invalid LaTeX syntax';
      if (err instanceof Error) {
        // Parse KaTeX error messages for better user feedback
        const katexError = err.message;
        if (katexError.includes('Undefined control sequence')) {
          const match = katexError.match(/Undefined control sequence: (\\[a-zA-Z]+)/);
          if (match) {
            errorMessage = `Unknown command: ${match[1]}. Check spelling or use a different command.`;
          }
        } else if (katexError.includes('Expected')) {
          errorMessage = `Syntax error: ${katexError}`;
        } else {
          errorMessage = katexError;
        }
      }
      setError(errorMessage);
      setPreviewHtml('');
    }
  }, [inputValue]);

  // Focus input on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.setSelectionRange(inputValue.length, inputValue.length);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSave();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      // Insert tab character for alignment
      const textarea = e.target as HTMLTextAreaElement;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newValue = inputValue.substring(0, start) + '  ' + inputValue.substring(end);
      setInputValue(newValue);
      setTimeout(() => {
        textarea.setSelectionRange(start + 2, start + 2);
      }, 0);
    }
  };

  const handleSave = () => {
    if (!error && inputValue.trim()) {
      onChange(inputValue);
      onClose();
    }
  };

  const insertTemplate = (latex: string) => {
    if (!inputRef.current) return;
    
    const textarea = inputRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newValue = inputValue.substring(0, start) + latex + inputValue.substring(end);
    setInputValue(newValue);
    
    // Focus and position cursor after insertion
    setTimeout(() => {
      textarea.focus();
      const cursorPos = start + latex.length;
      textarea.setSelectionRange(cursorPos, cursorPos);
    }, 0);
  };

  const insertSymbol = (latex: string) => {
    insertTemplate(latex);
  };

  return (
    <div className="math-input-overlay">
      <div className="math-input-container">
        <div className="math-input-header">
          <h3>Math Expression Editor</h3>
          <button className="close-button" onClick={onClose} title="Close (Esc)">
            ×
          </button>
        </div>

        <div className="math-input-content">
          <div className="input-section">
            <label htmlFor="math-textarea">LaTeX Expression:</label>
            <textarea
              ref={inputRef}
              id="math-textarea"
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className={`math-textarea ${error ? 'error' : ''}`}
              rows={4}
              spellCheck={false}
            />
            {error && (
              <div className="error-message">
                <span className="error-icon">⚠️</span>
                {error}
              </div>
            )}
          </div>

          <div className="preview-section">
            <label>Preview:</label>
            <div 
              ref={previewRef}
              className="math-preview"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
            {!previewHtml && !error && inputValue.trim() && (
              <div className="preview-placeholder">Rendering...</div>
            )}
            {!inputValue.trim() && (
              <div className="preview-placeholder">Enter a LaTeX expression to see preview</div>
            )}
          </div>
        </div>

        <div className="math-templates">
          <h4>Quick Templates:</h4>
          {Object.entries(mathTemplates).map(([category, templates]) => (
            <div key={category} className="template-category">
              <h5 className="category-title">{category.charAt(0).toUpperCase() + category.slice(1)}</h5>
              <div className="template-grid">
                {templates.map((template, index) => (
                  <button
                    key={`${category}-${index}`}
                    className="template-button"
                    onClick={() => insertTemplate(template.latex)}
                    title={template.description}
                  >
                    <div 
                      className="template-preview"
                      dangerouslySetInnerHTML={{
                        __html: katex.renderToString(template.latex, {
                          displayMode: false,
                          throwOnError: false,
                        })
                      }}
                    />
                    <span className="template-name">{template.name}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="math-symbols">
          <h4>Common Symbols:</h4>
          <div className="symbol-grid">
            {mathSymbols.map((item, index) => (
              <button
                key={index}
                className="symbol-button"
                onClick={() => insertSymbol(item.latex)}
                title={`Insert ${item.latex}`}
              >
                {item.symbol}
              </button>
            ))}
          </div>
        </div>

        <div className="math-input-actions">
          <button className="cancel-button" onClick={onClose}>
            Cancel
          </button>
          <button 
            className="save-button" 
            onClick={handleSave}
            disabled={!!error || !inputValue.trim()}
          >
            Insert Math (Ctrl+Enter)
          </button>
        </div>

        <div className="math-input-help">
          <details>
            <summary>LaTeX Help</summary>
            <div className="help-content">
              <p><strong>Basic syntax:</strong></p>
              <ul>
                <li><code>\frac{'{a}'}{'{b}'}</code> - Fraction</li>
                <li><code>\sqrt{'{x}'}</code> - Square root</li>
                <li><code>x^{'{n}'}</code> - Superscript</li>
                <li><code>x_{'{i}'}</code> - Subscript</li>
                <li><code>\sum, \int, \lim</code> - Operators</li>
                <li><code>\alpha, \beta, \gamma</code> - Greek letters</li>
              </ul>
              <p><strong>Shortcuts:</strong></p>
              <ul>
                <li>Ctrl+Enter - Insert math</li>
                <li>Esc - Cancel</li>
                <li>Tab - Insert spaces for alignment</li>
              </ul>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
};

export default MathInput;