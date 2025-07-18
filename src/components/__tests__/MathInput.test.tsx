import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import MathInput from '../MathInput';

// Mock KaTeX
jest.mock('katex', () => ({
  renderToString: jest.fn((expression: string, options: any) => {
    if (expression === 'invalid\\command') {
      throw new Error('Undefined control sequence: \\command');
    }
    if (expression === '\\frac{') {
      throw new Error('Expected } after \\frac{');
    }
    if (expression === '') {
      return '';
    }
    return `<span class="katex">${expression}</span>`;
  }),
}));

// Mock CSS import
jest.mock('../MathInput.css', () => ({}));

describe('MathInput', () => {
  const mockOnChange = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const defaultProps = {
    value: '',
    onChange: mockOnChange,
    onClose: mockOnClose,
  };

  describe('Basic Functionality', () => {
    test('renders math input dialog', () => {
      render(<MathInput {...defaultProps} />);
      
      expect(screen.getByText('Math Expression Editor')).toBeInTheDocument();
      expect(screen.getByLabelText('LaTeX Expression:')).toBeInTheDocument();
      expect(screen.getByText('Preview:')).toBeInTheDocument();
      expect(screen.getByText('Quick Templates:')).toBeInTheDocument();
    });

    test('displays placeholder text', () => {
      render(<MathInput {...defaultProps} placeholder="Custom placeholder" />);
      
      expect(screen.getByPlaceholderText('Custom placeholder')).toBeInTheDocument();
    });

    test('focuses input on mount', () => {
      render(<MathInput {...defaultProps} />);
      
      const textarea = screen.getByLabelText('LaTeX Expression:');
      expect(textarea).toHaveFocus();
    });

    test('displays initial value', () => {
      render(<MathInput {...defaultProps} value="x^2" />);
      
      const textarea = screen.getByLabelText('LaTeX Expression:');
      expect(textarea).toHaveValue('x^2');
    });
  });

  describe('Input Handling', () => {
    test('updates input value on change', async () => {
      const user = userEvent.setup();
      render(<MathInput {...defaultProps} />);
      
      const textarea = screen.getByLabelText('LaTeX Expression:');
      await user.type(textarea, 'x^2');
      
      expect(textarea).toHaveValue('x^2');
    });

    test('calls onChange when saving valid expression', async () => {
      const user = userEvent.setup();
      render(<MathInput {...defaultProps} />);
      
      const textarea = screen.getByLabelText('LaTeX Expression:');
      await user.type(textarea, 'x^2');
      
      const saveButton = screen.getByText('Insert Math (Ctrl+Enter)');
      await user.click(saveButton);
      
      expect(mockOnChange).toHaveBeenCalledWith('x^2');
      expect(mockOnClose).toHaveBeenCalled();
    });

    test('does not call onChange for invalid expression', async () => {
      const user = userEvent.setup();
      render(<MathInput {...defaultProps} />);
      
      const textarea = screen.getByLabelText('LaTeX Expression:');
      await user.type(textarea, 'invalid\\command');
      
      await waitFor(() => {
        expect(screen.getByText(/Unknown command/)).toBeInTheDocument();
      });
      
      const saveButton = screen.getByText('Insert Math (Ctrl+Enter)');
      expect(saveButton).toBeDisabled();
    });

    test('calls onClose when cancel button is clicked', async () => {
      const user = userEvent.setup();
      render(<MathInput {...defaultProps} />);
      
      const cancelButton = screen.getByText('Cancel');
      await user.click(cancelButton);
      
      expect(mockOnClose).toHaveBeenCalled();
    });

    test('calls onClose when close button is clicked', async () => {
      const user = userEvent.setup();
      render(<MathInput {...defaultProps} />);
      
      const closeButton = screen.getByTitle('Close (Esc)');
      await user.click(closeButton);
      
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Keyboard Shortcuts', () => {
    test('closes dialog on Escape key', () => {
      render(<MathInput {...defaultProps} />);
      
      const textarea = screen.getByLabelText('LaTeX Expression:');
      fireEvent.keyDown(textarea, { key: 'Escape' });
      
      expect(mockOnClose).toHaveBeenCalled();
    });

    test('saves expression on Ctrl+Enter', async () => {
      const user = userEvent.setup();
      render(<MathInput {...defaultProps} />);
      
      const textarea = screen.getByLabelText('LaTeX Expression:');
      await user.type(textarea, 'x^2');
      
      fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true });
      
      expect(mockOnChange).toHaveBeenCalledWith('x^2');
      expect(mockOnClose).toHaveBeenCalled();
    });

    test('saves expression on Cmd+Enter (Mac)', async () => {
      const user = userEvent.setup();
      render(<MathInput {...defaultProps} />);
      
      const textarea = screen.getByLabelText('LaTeX Expression:');
      await user.type(textarea, 'x^2');
      
      fireEvent.keyDown(textarea, { key: 'Enter', metaKey: true });
      
      expect(mockOnChange).toHaveBeenCalledWith('x^2');
      expect(mockOnClose).toHaveBeenCalled();
    });

    test('inserts spaces on Tab key', async () => {
      render(<MathInput {...defaultProps} />);
      
      const textarea = screen.getByLabelText('LaTeX Expression:') as HTMLTextAreaElement;
      textarea.focus();
      textarea.setSelectionRange(0, 0);
      
      fireEvent.keyDown(textarea, { key: 'Tab' });
      
      expect(textarea.value).toBe('  ');
    });
  });

  describe('Template Insertion', () => {
    test('inserts template when template button is clicked', async () => {
      const user = userEvent.setup();
      render(<MathInput {...defaultProps} />);
      
      const fractionButton = screen.getByTitle('Fraction');
      await user.click(fractionButton);
      
      const textarea = screen.getByLabelText('LaTeX Expression:');
      expect(textarea).toHaveValue('\\frac{a}{b}');
    });

    test('inserts template at cursor position', async () => {
      const user = userEvent.setup();
      render(<MathInput {...defaultProps} value="x = " />);
      
      const textarea = screen.getByLabelText('LaTeX Expression:') as HTMLTextAreaElement;
      textarea.focus();
      textarea.setSelectionRange(4, 4); // Position after "x = "
      
      const fractionButton = screen.getByTitle('Fraction');
      await user.click(fractionButton);
      
      expect(textarea.value).toBe('x = \\frac{a}{b}');
    });

    test('shows all template categories', () => {
      render(<MathInput {...defaultProps} />);
      
      expect(screen.getByText('Basic')).toBeInTheDocument();
      expect(screen.getByText('Calculus')).toBeInTheDocument();
      expect(screen.getByText('Matrices')).toBeInTheDocument();
      expect(screen.getByText('Equations')).toBeInTheDocument();
      expect(screen.getByText('Greek')).toBeInTheDocument();
      expect(screen.getByText('Sets')).toBeInTheDocument();
    });
  });

  describe('Symbol Insertion', () => {
    test('inserts symbol when symbol button is clicked', async () => {
      const user = userEvent.setup();
      render(<MathInput {...defaultProps} />);
      
      const plusMinusButton = screen.getByTitle('Insert \\pm');
      await user.click(plusMinusButton);
      
      const textarea = screen.getByLabelText('LaTeX Expression:');
      expect(textarea).toHaveValue('\\pm');
    });

    test('displays common math symbols', () => {
      render(<MathInput {...defaultProps} />);
      
      expect(screen.getByText('±')).toBeInTheDocument();
      expect(screen.getByText('∞')).toBeInTheDocument();
      expect(screen.getByText('≤')).toBeInTheDocument();
      expect(screen.getByText('≥')).toBeInTheDocument();
      expect(screen.getByText('≠')).toBeInTheDocument();
    });
  });

  describe('Validation', () => {
    test('shows error for empty expression when trying to save', async () => {
      const user = userEvent.setup();
      render(<MathInput {...defaultProps} />);
      
      const saveButton = screen.getByText('Insert Math (Ctrl+Enter)');
      expect(saveButton).toBeDisabled();
    });

    test('shows error for unclosed braces', async () => {
      const user = userEvent.setup();
      render(<MathInput {...defaultProps} />);
      
      const textarea = screen.getByLabelText('LaTeX Expression:');
      await user.type(textarea, '\\frac{a');
      
      await waitFor(() => {
        expect(screen.getByText(/Unclosed delimiters found/)).toBeInTheDocument();
      });
    });

    test('shows error for incomplete fraction', async () => {
      const user = userEvent.setup();
      render(<MathInput {...defaultProps} />);
      
      const textarea = screen.getByLabelText('LaTeX Expression:');
      await user.type(textarea, '\\frac{a}');
      
      await waitFor(() => {
        expect(screen.getByText(/Incomplete fraction - missing denominator/)).toBeInTheDocument();
      });
    });

    test('shows error for incomplete square root', async () => {
      const user = userEvent.setup();
      render(<MathInput {...defaultProps} />);
      
      const textarea = screen.getByLabelText('LaTeX Expression:');
      await user.type(textarea, '\\sqrt');
      
      await waitFor(() => {
        expect(screen.getByText(/Incomplete square root/)).toBeInTheDocument();
      });
    });

    test('shows error for empty superscript', async () => {
      const user = userEvent.setup();
      render(<MathInput {...defaultProps} />);
      
      const textarea = screen.getByLabelText('LaTeX Expression:');
      await user.type(textarea, 'x^');
      
      await waitFor(() => {
        expect(screen.getByText(/Empty superscript/)).toBeInTheDocument();
      });
    });

    test('shows error for empty subscript', async () => {
      const user = userEvent.setup();
      render(<MathInput {...defaultProps} />);
      
      const textarea = screen.getByLabelText('LaTeX Expression:');
      await user.type(textarea, 'x_');
      
      await waitFor(() => {
        expect(screen.getByText(/Empty subscript/)).toBeInTheDocument();
      });
    });

    test('validates balanced parentheses', async () => {
      const user = userEvent.setup();
      render(<MathInput {...defaultProps} />);
      
      const textarea = screen.getByLabelText('LaTeX Expression:');
      await user.type(textarea, '(a + b');
      
      await waitFor(() => {
        expect(screen.getByText(/Unclosed delimiters found/)).toBeInTheDocument();
      });
    });

    test('validates balanced brackets', async () => {
      const user = userEvent.setup();
      render(<MathInput {...defaultProps} />);
      
      const textarea = screen.getByLabelText('LaTeX Expression:');
      await user.type(textarea, '[a + b');
      
      await waitFor(() => {
        expect(screen.getByText(/Unclosed delimiters found/)).toBeInTheDocument();
      });
    });
  });

  describe('Preview', () => {
    test('shows preview for valid expression', async () => {
      const user = userEvent.setup();
      render(<MathInput {...defaultProps} />);
      
      const textarea = screen.getByLabelText('LaTeX Expression:');
      await user.type(textarea, 'x^2');
      
      await waitFor(() => {
        expect(screen.getByText('x^2')).toBeInTheDocument();
      });
    });

    test('shows placeholder when input is empty', () => {
      render(<MathInput {...defaultProps} />);
      
      expect(screen.getByText('Enter a LaTeX expression to see preview')).toBeInTheDocument();
    });

    test('does not show preview for invalid expression', async () => {
      const user = userEvent.setup();
      render(<MathInput {...defaultProps} />);
      
      const textarea = screen.getByLabelText('LaTeX Expression:');
      await user.type(textarea, 'invalid\\command');
      
      await waitFor(() => {
        expect(screen.getByText(/Unknown command/)).toBeInTheDocument();
      });
      
      expect(screen.queryByText('invalid\\command')).not.toBeInTheDocument();
    });
  });

  describe('Help Section', () => {
    test('shows help section', () => {
      render(<MathInput {...defaultProps} />);
      
      expect(screen.getByText('LaTeX Help')).toBeInTheDocument();
    });

    test('expands help section when clicked', async () => {
      const user = userEvent.setup();
      render(<MathInput {...defaultProps} />);
      
      const helpSummary = screen.getByText('LaTeX Help');
      await user.click(helpSummary);
      
      expect(screen.getByText('Basic syntax:')).toBeInTheDocument();
      expect(screen.getByText('Shortcuts:')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    test('handles KaTeX rendering errors gracefully', async () => {
      const user = userEvent.setup();
      render(<MathInput {...defaultProps} />);
      
      const textarea = screen.getByLabelText('LaTeX Expression:');
      await user.type(textarea, 'invalid\\command');
      
      await waitFor(() => {
        expect(screen.getByText(/Unknown command: \\command/)).toBeInTheDocument();
      });
    });

    test('handles syntax errors from KaTeX', async () => {
      const user = userEvent.setup();
      render(<MathInput {...defaultProps} />);
      
      const textarea = screen.getByLabelText('LaTeX Expression:');
      await user.type(textarea, '\\frac{');
      
      await waitFor(() => {
        expect(screen.getByText(/Syntax error/)).toBeInTheDocument();
      });
    });

    test('shows visual error state on textarea', async () => {
      const user = userEvent.setup();
      render(<MathInput {...defaultProps} />);
      
      const textarea = screen.getByLabelText('LaTeX Expression:');
      await user.type(textarea, 'invalid\\command');
      
      await waitFor(() => {
        expect(textarea).toHaveClass('error');
      });
    });
  });

  describe('Advanced Validation', () => {
    test('warns about misplaced alignment characters', async () => {
      const user = userEvent.setup();
      render(<MathInput {...defaultProps} />);
      
      const textarea = screen.getByLabelText('LaTeX Expression:');
      await user.type(textarea, 'a & b');
      
      // This should pass validation but show a warning
      await waitFor(() => {
        // The expression should be valid but with warnings
        const saveButton = screen.getByText('Insert Math (Ctrl+Enter)');
        expect(saveButton).not.toBeDisabled();
      });
    });

    test('warns about misplaced double backslashes', async () => {
      const user = userEvent.setup();
      render(<MathInput {...defaultProps} />);
      
      const textarea = screen.getByLabelText('LaTeX Expression:');
      await user.type(textarea, 'a \\\\ b');
      
      // This should pass validation but show a warning
      await waitFor(() => {
        const saveButton = screen.getByText('Insert Math (Ctrl+Enter)');
        expect(saveButton).not.toBeDisabled();
      });
    });

    test('suggests bounds for summation', async () => {
      const user = userEvent.setup();
      render(<MathInput {...defaultProps} />);
      
      const textarea = screen.getByLabelText('LaTeX Expression:');
      await user.type(textarea, '\\sum x');
      
      await waitFor(() => {
        expect(screen.getByText(/Summation without bounds/)).toBeInTheDocument();
      });
    });

    test('suggests bounds for integral', async () => {
      const user = userEvent.setup();
      render(<MathInput {...defaultProps} />);
      
      const textarea = screen.getByLabelText('LaTeX Expression:');
      await user.type(textarea, '\\int f(x) dx');
      
      await waitFor(() => {
        expect(screen.getByText(/Integral without bounds/)).toBeInTheDocument();
      });
    });

    test('suggests variable for limit', async () => {
      const user = userEvent.setup();
      render(<MathInput {...defaultProps} />);
      
      const textarea = screen.getByLabelText('LaTeX Expression:');
      await user.type(textarea, '\\lim f(x)');
      
      await waitFor(() => {
        expect(screen.getByText(/Limit without variable/)).toBeInTheDocument();
      });
    });
  });
});