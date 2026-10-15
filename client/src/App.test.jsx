import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import App from './App.jsx';

describe('App component', () => {
  it('renders the starter heading', () => {
    render(<App />);

    expect(
      screen.getByRole('heading', { name: 'Get started' }),
    ).toBeInTheDocument();
  });

  it('increments the counter when clicked', () => {
    render(<App />);

    const counterButton = screen.getByRole('button', {
      name: 'Count is 0',
    });

    fireEvent.click(counterButton);

    expect(
      screen.getByRole('button', { name: 'Count is 1' }),
    ).toBeInTheDocument();
  });

  it('renders the documentation section', () => {
    render(<App />);

    expect(
      screen.getByRole('heading', { name: 'Documentation' }),
    ).toBeInTheDocument();
  });
});
