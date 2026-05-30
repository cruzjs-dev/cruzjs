import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Card, CardBody, CardFooter, CardHeader } from './Card';

describe('Card', () => {
  it('renders children', () => {
    render(<Card>Content</Card>);
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('renders with header, body, footer', () => {
    render(
      <Card>
        <CardHeader>Header</CardHeader>
        <CardBody>Body</CardBody>
        <CardFooter>Footer</CardFooter>
      </Card>,
    );
    expect(screen.getByText('Header')).toBeInTheDocument();
    expect(screen.getByText('Body')).toBeInTheDocument();
    expect(screen.getByText('Footer')).toBeInTheDocument();
  });

  it('applies interactive class', () => {
    const { container } = render(<Card interactive>Click me</Card>);
    expect(container.firstElementChild?.className).toContain('cursor-pointer');
  });

  it('applies variant classes', () => {
    const { container } = render(<Card variant="outlined">Content</Card>);
    expect(container.firstElementChild?.className).toContain('border');
  });

  it('applies padding', () => {
    const { container } = render(<Card padding="lg">Content</Card>);
    expect(container.firstElementChild?.className).toContain('p-6');
  });

  it('applies custom className', () => {
    const { container } = render(<Card className="custom-class">Content</Card>);
    expect(container.firstElementChild?.className).toContain('custom-class');
  });
});
