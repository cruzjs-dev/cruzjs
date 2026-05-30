import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Carousel } from './Carousel';

function renderSlides(count: number) {
  return Array.from({ length: count }, (_, i) => (
    <div key={i} data-testid={`slide-${i}`}>
      Slide {i + 1}
    </div>
  ));
}

/** Stub scrollTo on the scroll container so tests can assert it is called. */
function mockScrollContainer() {
  const scrollToMock = vi.fn();
  // jsdom doesn't implement scrollTo
  Element.prototype.scrollTo = scrollToMock;
  return scrollToMock;
}

describe('Carousel', () => {
  let scrollToMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    scrollToMock = mockScrollContainer();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('renders all slides', () => {
    render(<Carousel>{renderSlides(3)}</Carousel>);
    expect(screen.getByTestId('slide-0')).toBeInTheDocument();
    expect(screen.getByTestId('slide-1')).toBeInTheDocument();
    expect(screen.getByTestId('slide-2')).toBeInTheDocument();
  });

  it('shows arrow buttons by default', () => {
    render(<Carousel>{renderSlides(3)}</Carousel>);
    // At index 0 with no loop, only "Next slide" should render
    expect(screen.getByLabelText('Next slide')).toBeInTheDocument();
  });

  it('shows dot indicators by default', () => {
    render(<Carousel>{renderSlides(3)}</Carousel>);
    const dots = screen.getAllByRole('tab');
    expect(dots).toHaveLength(3);
  });

  it('next arrow advances to next slide', () => {
    render(<Carousel>{renderSlides(3)}</Carousel>);

    const nextBtn = screen.getByLabelText('Next slide');
    fireEvent.click(nextBtn);

    expect(scrollToMock).toHaveBeenCalled();

    // Dot at index 1 should now be selected
    const dots = screen.getAllByRole('tab');
    expect(dots[1]).toHaveAttribute('aria-selected', 'true');
  });

  it('prev arrow goes to previous slide', () => {
    render(<Carousel>{renderSlides(3)}</Carousel>);

    // Go to index 1 first
    fireEvent.click(screen.getByLabelText('Next slide'));

    // Now prev should appear
    const prevBtn = screen.getByLabelText('Previous slide');
    fireEvent.click(prevBtn);

    const dots = screen.getAllByRole('tab');
    expect(dots[0]).toHaveAttribute('aria-selected', 'true');
  });

  it('dot click jumps to the target slide', () => {
    render(<Carousel>{renderSlides(4)}</Carousel>);

    const dots = screen.getAllByRole('tab');
    fireEvent.click(dots[2]);

    expect(dots[2]).toHaveAttribute('aria-selected', 'true');
    expect(scrollToMock).toHaveBeenCalled();
  });

  it('hides prev arrow at first slide when not looping', () => {
    render(<Carousel loop={false}>{renderSlides(3)}</Carousel>);
    expect(screen.queryByLabelText('Previous slide')).not.toBeInTheDocument();
  });

  it('hides next arrow at last slide when not looping', () => {
    render(<Carousel loop={false}>{renderSlides(3)}</Carousel>);

    // Navigate to last slide
    fireEvent.click(screen.getByLabelText('Next slide'));
    fireEvent.click(screen.getByLabelText('Next slide'));

    expect(screen.queryByLabelText('Next slide')).not.toBeInTheDocument();
  });

  it('loop wraps from last to first', () => {
    render(<Carousel loop>{renderSlides(3)}</Carousel>);

    // Go to last slide
    fireEvent.click(screen.getByLabelText('Next slide'));
    fireEvent.click(screen.getByLabelText('Next slide'));

    // Next should wrap to 0
    fireEvent.click(screen.getByLabelText('Next slide'));

    const dots = screen.getAllByRole('tab');
    expect(dots[0]).toHaveAttribute('aria-selected', 'true');
  });

  it('loop wraps from first to last', () => {
    render(<Carousel loop>{renderSlides(3)}</Carousel>);

    // At index 0, prev should wrap to last
    const prevBtn = screen.getByLabelText('Previous slide');
    fireEvent.click(prevBtn);

    const dots = screen.getAllByRole('tab');
    expect(dots[2]).toHaveAttribute('aria-selected', 'true');
  });

  it('keyboard ArrowRight advances', () => {
    render(<Carousel>{renderSlides(3)}</Carousel>);

    const carousel = screen.getByRole('region');
    fireEvent.keyDown(carousel, { key: 'ArrowRight' });

    const dots = screen.getAllByRole('tab');
    expect(dots[1]).toHaveAttribute('aria-selected', 'true');
  });

  it('keyboard ArrowLeft goes back', () => {
    render(<Carousel>{renderSlides(3)}</Carousel>);

    const carousel = screen.getByRole('region');
    // Go forward first
    fireEvent.keyDown(carousel, { key: 'ArrowRight' });
    fireEvent.keyDown(carousel, { key: 'ArrowLeft' });

    const dots = screen.getAllByRole('tab');
    expect(dots[0]).toHaveAttribute('aria-selected', 'true');
  });

  it('auto-play advances slides on interval', () => {
    render(
      <Carousel autoPlay autoPlayInterval={2000}>
        {renderSlides(3)}
      </Carousel>,
    );

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    const dots = screen.getAllByRole('tab');
    expect(dots[1]).toHaveAttribute('aria-selected', 'true');
  });

  it('auto-play pauses on hover', () => {
    render(
      <Carousel autoPlay autoPlayInterval={2000}>
        {renderSlides(3)}
      </Carousel>,
    );

    const carousel = screen.getByRole('region');
    fireEvent.mouseEnter(carousel);

    act(() => {
      vi.advanceTimersByTime(4000);
    });

    // Should still be on first slide because hover pauses
    const dots = screen.getAllByRole('tab');
    expect(dots[0]).toHaveAttribute('aria-selected', 'true');
  });

  it('has aria-roledescription="carousel"', () => {
    render(<Carousel>{renderSlides(2)}</Carousel>);
    const carousel = screen.getByRole('region');
    expect(carousel).toHaveAttribute('aria-roledescription', 'carousel');
  });

  it('each slide has aria-roledescription="slide"', () => {
    render(<Carousel>{renderSlides(2)}</Carousel>);
    const slideGroups = screen.getAllByRole('group');
    for (const slide of slideGroups) {
      expect(slide).toHaveAttribute('aria-roledescription', 'slide');
    }
  });

  it('applies custom className', () => {
    render(<Carousel className="my-custom-class">{renderSlides(2)}</Carousel>);
    const carousel = screen.getByRole('region');
    expect(carousel.className).toContain('my-custom-class');
  });

  it('hides arrows when showArrows is false', () => {
    render(<Carousel showArrows={false}>{renderSlides(3)}</Carousel>);
    expect(screen.queryByLabelText('Previous slide')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Next slide')).not.toBeInTheDocument();
  });

  it('hides dots when showDots is false', () => {
    render(<Carousel showDots={false}>{renderSlides(3)}</Carousel>);
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
  });

  it('handles slidesToShow > 1 with correct dot count', () => {
    render(<Carousel slidesToShow={2}>{renderSlides(4)}</Carousel>);
    // maxIndex = 4 - 2 = 2, so 3 dots (indices 0, 1, 2)
    const dots = screen.getAllByRole('tab');
    expect(dots).toHaveLength(3);
  });
});
