import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Testimonial } from './TestimonialCarousel';
import { TestimonialCarousel } from './TestimonialCarousel';

function mockMatchMedia(matches = false) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

const defaultTestimonials: Testimonial[] = [
  {
    id: '1',
    quote: 'This product changed my workflow entirely.',
    authorName: 'Alice Johnson',
    authorRole: 'CTO',
    authorCompany: 'Acme Corp',
    avatarSrc: 'https://example.com/alice.jpg',
  },
  {
    id: '2',
    quote: 'Absolutely incredible experience from day one.',
    authorName: 'Bob Smith',
    authorRole: 'Engineer',
    authorCompany: 'Beta Inc',
  },
  {
    id: '3',
    quote: 'I recommend this to every team I work with.',
    authorName: 'Carol White',
    authorRole: 'Product Manager',
    rating: 5,
  },
];

describe('TestimonialCarousel', () => {
  beforeEach(() => {
    mockMatchMedia(false);
  });

  it('renders first testimonial quote', () => {
    render(<TestimonialCarousel testimonials={defaultTestimonials} />);
    expect(
      screen.getByText('This product changed my workflow entirely.'),
    ).toBeInTheDocument();
  });

  it('renders author name and role', () => {
    render(<TestimonialCarousel testimonials={defaultTestimonials} />);
    expect(screen.getAllByTestId('testimonial-author-name')[0]).toHaveTextContent(
      'Alice Johnson',
    );
    expect(screen.getAllByTestId('testimonial-author-role')[0]).toHaveTextContent(
      'CTO, Acme Corp',
    );
  });

  it('dots count matches testimonial count', () => {
    render(<TestimonialCarousel testimonials={defaultTestimonials} />);
    const dots = screen.getAllByRole('tab');
    expect(dots).toHaveLength(3);
  });

  it('arrow click changes slide', () => {
    render(<TestimonialCarousel testimonials={defaultTestimonials} showArrows />);
    const nextBtn = screen.getByTestId('testimonial-next');
    fireEvent.click(nextBtn);

    const dots = screen.getAllByRole('tab');
    expect(dots[1]).toHaveAttribute('aria-selected', 'true');
  });

  it('auto-play is disabled by default', () => {
    render(<TestimonialCarousel testimonials={defaultTestimonials} />);
    // First testimonial should remain visible; no timer started
    const dots = screen.getAllByRole('tab');
    expect(dots[0]).toHaveAttribute('aria-selected', 'true');
  });

  it('renders rating stars when provided', () => {
    const withRating: Testimonial[] = [
      {
        id: 'r1',
        quote: 'Great product!',
        authorName: 'Dan Lee',
        rating: 4,
      },
      {
        id: 'r2',
        quote: 'Solid tool.',
        authorName: 'Eve Park',
        rating: 3,
      },
    ];
    render(<TestimonialCarousel testimonials={withRating} />);
    const ratingContainer = screen.getByTestId('testimonial-rating-r1');
    expect(ratingContainer).toBeInTheDocument();
    // Should have 5 star svgs
    const stars = ratingContainer.querySelectorAll('svg');
    expect(stars).toHaveLength(5);
  });

  it('applies custom className', () => {
    render(
      <TestimonialCarousel
        testimonials={defaultTestimonials}
        className="my-custom-class"
      />,
    );
    const carousel = screen.getByTestId('testimonial-carousel');
    expect(carousel.className).toContain('my-custom-class');
  });

  it('hides dots when showDots is false', () => {
    render(
      <TestimonialCarousel testimonials={defaultTestimonials} showDots={false} />,
    );
    expect(screen.queryAllByRole('tab')).toHaveLength(0);
  });

  it('renders fallback avatar initials when no avatarSrc', () => {
    render(<TestimonialCarousel testimonials={defaultTestimonials} />);
    // Bob Smith has no avatarSrc, should show initials "BS"
    const avatars = screen.getAllByTestId('testimonial-avatar-2');
    expect(avatars[0]).toHaveTextContent('BS');
  });
});
