import React, {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';

export type CarouselAlign = 'start' | 'center';

export type CarouselProps = React.HTMLAttributes<HTMLDivElement> & {
  /** Slide elements */
  children: React.ReactNode;
  /** Auto-advance slides */
  autoPlay?: boolean;
  /** Auto-play interval in ms */
  autoPlayInterval?: number;
  /** Wrap around from last to first and vice versa */
  loop?: boolean;
  /** Show dot indicators */
  showDots?: boolean;
  /** Show prev/next arrow buttons */
  showArrows?: boolean;
  /** Number of slides visible at once */
  slidesToShow?: number;
  /** Gap between slides in px */
  gap?: number;
  /** Scroll-snap alignment */
  align?: CarouselAlign;
};

const ChevronLeftIcon: React.FC = () => (
  <svg
    width={20}
    height={20}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M15 18l-6-6 6-6" />
  </svg>
);

const ChevronRightIcon: React.FC = () => (
  <svg
    width={20}
    height={20}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M9 18l6-6-6-6" />
  </svg>
);

export const Carousel = forwardRef<HTMLDivElement, CarouselProps>(function Carousel(
  {
    children,
    autoPlay = false,
    autoPlayInterval = 5000,
    loop = false,
    showDots = true,
    showArrows = true,
    slidesToShow = 1,
    gap = 16,
    align = 'start',
    className,
    ...rest
  },
  ref,
) {
  const slides = React.Children.toArray(children);
  const slideCount = slides.length;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const autoPlayTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isScrollingRef = useRef(false);
  const instanceId = useId();

  // Maximum valid starting index: ensures the last "page" is fully visible
  const maxIndex = Math.max(0, slideCount - slidesToShow);

  const scrollToIndex = useCallback(
    (index: number) => {
      const container = scrollContainerRef.current;
      if (!container) return;

      const slideElements = container.children;
      if (index < 0 || index >= slideElements.length) return;

      const targetSlide = slideElements[index] as HTMLElement;
      isScrollingRef.current = true;

      container.scrollTo({
        left: targetSlide.offsetLeft - container.offsetLeft,
        behavior: 'smooth',
      });

      // Reset scrolling flag after animation settles
      setTimeout(() => {
        isScrollingRef.current = false;
      }, 350);
    },
    [],
  );

  const goTo = useCallback(
    (index: number) => {
      let targetIndex = index;
      if (loop) {
        if (targetIndex < 0) targetIndex = maxIndex;
        else if (targetIndex > maxIndex) targetIndex = 0;
      } else {
        targetIndex = Math.max(0, Math.min(targetIndex, maxIndex));
      }
      setCurrentIndex(targetIndex);
      scrollToIndex(targetIndex);
    },
    [loop, maxIndex, scrollToIndex],
  );

  const goNext = useCallback(() => goTo(currentIndex + 1), [goTo, currentIndex]);
  const goPrev = useCallback(() => goTo(currentIndex - 1), [goTo, currentIndex]);

  // Sync currentIndex from native scroll (touch/swipe, mouse wheel)
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (isScrollingRef.current) return;

      const slideElements = container.children;
      const scrollLeft = container.scrollLeft;
      let closestIndex = 0;
      let closestDistance = Infinity;

      for (let i = 0; i < slideElements.length; i++) {
        const slide = slideElements[i] as HTMLElement;
        const distance = Math.abs(slide.offsetLeft - container.offsetLeft - scrollLeft);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestIndex = i;
        }
      }

      setCurrentIndex(closestIndex);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // Auto-play
  useEffect(() => {
    if (!autoPlay || isHovered || slideCount <= slidesToShow) return;

    autoPlayTimerRef.current = setInterval(() => {
      goTo(currentIndex + 1);
    }, autoPlayInterval);

    return () => {
      if (autoPlayTimerRef.current) {
        clearInterval(autoPlayTimerRef.current);
        autoPlayTimerRef.current = null;
      }
    };
  }, [autoPlay, autoPlayInterval, isHovered, currentIndex, goTo, slideCount, slidesToShow]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goPrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goNext();
      }
    },
    [goNext, goPrev],
  );

  const canGoPrev = loop || currentIndex > 0;
  const canGoNext = loop || currentIndex < maxIndex;

  // Compute slide width as a CSS calc expression
  const slideWidthCalc =
    slidesToShow === 1
      ? '100%'
      : `calc((100% - ${gap * (slidesToShow - 1)}px) / ${slidesToShow})`;

  return (
    <div
      ref={ref}
      className={['relative group', className].filter(Boolean).join(' ')}
      aria-roledescription="carousel"
      aria-label="Carousel"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="region"
      {...rest}
    >
      {/* Slide track */}
      <div
        ref={scrollContainerRef}
        className="flex overflow-x-auto scrollbar-hide"
        style={{
          gap: `${gap}px`,
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch',
          scrollBehavior: 'smooth',
          msOverflowStyle: 'none',
          scrollbarWidth: 'none',
        }}
        aria-live="polite"
      >
        {slides.map((slide, index) => (
          <div
            key={index}
            role="group"
            aria-roledescription="slide"
            aria-label={`Slide ${index + 1} of ${slideCount}`}
            className="shrink-0"
            style={{
              width: slideWidthCalc,
              scrollSnapAlign: align,
            }}
          >
            {slide}
          </div>
        ))}
      </div>

      {/* Arrow buttons */}
      {showArrows && slideCount > slidesToShow && (
        <>
          {canGoPrev && (
            <button
              type="button"
              onClick={goPrev}
              aria-label="Previous slide"
              className={[
                'absolute top-1/2 left-3 -translate-y-1/2 z-10',
                'flex items-center justify-center w-10 h-10 rounded-full',
                'bg-surface/80 text-text-strong backdrop-blur-sm',
                'ring-1 ring-surface-border/20',
                'transition-all duration-200',
                'hover:bg-surface hover:shadow-md',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
                'opacity-0 group-hover:opacity-100',
              ].join(' ')}
              style={{
                transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}
            >
              <ChevronLeftIcon />
            </button>
          )}
          {canGoNext && (
            <button
              type="button"
              onClick={goNext}
              aria-label="Next slide"
              className={[
                'absolute top-1/2 right-3 -translate-y-1/2 z-10',
                'flex items-center justify-center w-10 h-10 rounded-full',
                'bg-surface/80 text-text-strong backdrop-blur-sm',
                'ring-1 ring-surface-border/20',
                'transition-all duration-200',
                'hover:bg-surface hover:shadow-md',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
                'opacity-0 group-hover:opacity-100',
              ].join(' ')}
              style={{
                transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}
            >
              <ChevronRightIcon />
            </button>
          )}
        </>
      )}

      {/* Dot indicators */}
      {showDots && slideCount > slidesToShow && (
        <div
          className="flex items-center justify-center gap-2 mt-4"
          role="tablist"
          aria-label="Slide indicators"
        >
          {Array.from({ length: maxIndex + 1 }, (_, index) => (
            <button
              key={index}
              type="button"
              role="tab"
              aria-selected={index === currentIndex}
              aria-label={`Go to slide ${index + 1}`}
              onClick={() => goTo(index)}
              className={[
                'rounded-full transition-all duration-300',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
                index === currentIndex
                  ? 'w-6 h-2 bg-primary'
                  : 'w-2 h-2 bg-text-muted/40 hover:bg-text-muted/60',
              ].join(' ')}
              style={{
                transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
});

Carousel.displayName = 'Carousel';
