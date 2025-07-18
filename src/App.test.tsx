import React from 'react';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { store } from './store';
import App from './App';

const renderWithProvider = (component: React.ReactElement) => {
  return render(
    <Provider store={store}>
      {component}
    </Provider>
  );
};

test('renders LaTeX Presentation Editor title', () => {
  renderWithProvider(<App />);
  const titleElement = screen.getByText(/LaTeX Presentation Editor/i);
  expect(titleElement).toBeInTheDocument();
});

test('renders application description', () => {
  renderWithProvider(<App />);
  const presentationInfo = screen.getByText(/New Presentation - 1 slides/i);
  expect(presentationInfo).toBeInTheDocument();
});