import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import CompilationErrorDisplay, { CompilationError } from '../CompilationErrorDisplay';

const mockErrors: CompilationError[] = [
  {
    id: 'error-1',
    type: 'error',
    message: 'Undefined control sequence \\invalidcommand',
    line: 42,
    file: 'main.tex',
    context: '\\begin{frame}\n\\invalidcommand\n\\end{frame}',
    suggestion: 'Check if the command is spelled correctly or if you need to include a package.',
  },
  {
    id: 'warning-1',
    type: 'warning',
    message: 'Overfull hbox detected',
    line: 15,
    file: 'main.tex',
  },
  {
    id: 'info-1',
    type: 'info',
    message: 'Package loaded successfully',
  },
];

describe('CompilationErrorDisplay', () => {
  it('renders nothing when no errors are provided', () => {
    const { container } = render(<CompilationErrorDisplay errors={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('displays error counts correctly', () => {
    render(<CompilationErrorDisplay errors={mockErrors} />);
    
    expect(screen.getByText('1 errors')).toBeInTheDocument();
    expect(screen.getByText('1 warnings')).toBeInTheDocument();
    expect(screen.getByText('1 info')).toBeInTheDocument();
  });

  it('shows error messages', () => {
    render(<CompilationErrorDisplay errors={mockErrors} />);
    
    expect(screen.getByText('Undefined control sequence \\invalidcommand')).toBeInTheDocument();
    expect(screen.getByText('Overfull hbox detected')).toBeInTheDocument();
    expect(screen.getByText('Package loaded successfully')).toBeInTheDocument();
  });

  it('shows file and line information when available', () => {
    render(<CompilationErrorDisplay errors={mockErrors} />);
    
    expect(screen.getByText('File: main.tex')).toBeInTheDocument();
    expect(screen.getByText('Line: 42')).toBeInTheDocument();
  });

  it('expands error details when clicked', () => {
    render(<CompilationErrorDisplay errors={mockErrors} />);
    
    const errorItem = screen.getByText('Undefined control sequence \\invalidcommand').closest('.compilation-errors__item-header');
    fireEvent.click(errorItem!);
    
    expect(screen.getByText('Context:')).toBeInTheDocument();
    expect(screen.getByText('Suggestion:')).toBeInTheDocument();
    expect(screen.getByText('Check if the command is spelled correctly or if you need to include a package.')).toBeInTheDocument();
  });

  it('filters errors by type', () => {
    render(<CompilationErrorDisplay errors={mockErrors} />);
    
    const filterSelect = screen.getByDisplayValue('All Issues');
    fireEvent.change(filterSelect, { target: { value: 'error' } });
    
    expect(screen.getByText('Undefined control sequence \\invalidcommand')).toBeInTheDocument();
    expect(screen.queryByText('Overfull hbox detected')).not.toBeInTheDocument();
    expect(screen.queryByText('Package loaded successfully')).not.toBeInTheDocument();
  });

  it('calls onErrorClick when error is clicked', () => {
    const mockOnErrorClick = jest.fn();
    render(<CompilationErrorDisplay errors={mockErrors} onErrorClick={mockOnErrorClick} />);
    
    const goToButton = screen.getAllByTitle('Go to error location')[0];
    fireEvent.click(goToButton);
    
    expect(mockOnErrorClick).toHaveBeenCalledWith(mockErrors[0]);
  });

  it('calls onDismiss when dismiss button is clicked', () => {
    const mockOnDismiss = jest.fn();
    render(<CompilationErrorDisplay errors={mockErrors} onDismiss={mockOnDismiss} />);
    
    const dismissButton = screen.getAllByTitle('Dismiss this error')[0];
    fireEvent.click(dismissButton);
    
    expect(mockOnDismiss).toHaveBeenCalledWith('error-1');
  });

  it('calls onDismissAll when dismiss all button is clicked', () => {
    const mockOnDismissAll = jest.fn();
    render(<CompilationErrorDisplay errors={mockErrors} onDismissAll={mockOnDismissAll} />);
    
    const dismissAllButton = screen.getByTitle('Dismiss all errors');
    fireEvent.click(dismissAllButton);
    
    expect(mockOnDismissAll).toHaveBeenCalled();
  });
});