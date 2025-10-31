import { render, screen } from '@testing-library/react';
import App from './App';

test('renders Ask Gemini heading', () => {
  render(<App />);
  const heading = screen.getByRole('heading', { name: /ask gemini/i });
  expect(heading).toBeInTheDocument();
});
