import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders LaTeX Presentation Editor title', () => {
  render(<App />);
  const titleElement = screen.getByText(/LaTeX Presentation Editor/i);
  expect(titleElement).toBeInTheDocument();
});

test('renders application description', () => {
  render(<App />);
  const descriptionElement = screen.getByText(/A presentation editor that combines visual editing with LaTeX rendering/i);
  expect(descriptionElement).toBeInTheDocument();
});