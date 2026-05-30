import React, {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useIsMobile } from '../../hooks/useIsMobile';

// ─── Types ──────────────────────────────────────────────────────────────────

export type Testimonial = {
  id: string;
  quote: string;
  authorName: string;
  authorRole?: string;
  authorCompany?: string;
  avatarSrc?: string;
  rating?: number; // 1-5
};

export type TestimonialCarouselProps = React.HTMLAttributes<HTMLElement> & {
  testimonials: Testimonial[];
  autoPlay?: boolean;
  interval?: number;
  pauseOnHover?: boolean;
  showDots?: boolean;
  showArrows?: boolean;
};

// ─── Star SVG ───────────────────────────────────────────────────────────────

const StarIcon: React.FC<{ filled: boolean }> = ({ filled }) => (
  <svg
    width={16}
    height={16}
    viewBox="0 0 24 24"
    fill={filled ? 'currentColor' : 'none'}
    stroke="currentColor"
    strokeWidth={filled ? 0 : 1.5}
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>
);

// ─── Arrow SVGs ─────────────────────────────────────────────────────────────

const ChevronLeftIcon: React.FC = () => (
  <svg
    width={20}
    height={20}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    xmlns="http://www.w3.org/2000/svg"
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
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path d="M9 18l6-6-6-6" />
  </svg>
);

// ─── Component ──────────────────────────────────────────────────────────────

export const TestimonialCarousel = forwardRef<HTMLElement, TestimonialCarouselProps>(
  function TestimonialCarousel(
    {
      testimonials,
      autoPlay = false,
      interval = 5000,
      pauseOnHover = true,
      showDots = true,
      showArrows = true,
      className,
      ...rest
    },
    ref,
  ) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const autoPlayTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const prefersReducedMotionRef = useRef(false);
    const pointerStartXRef = useRef<number | null>(null);
    const pointerStartYRef = useRef<number | null>(null);

    const isMobile = useIsMobile();
    const slideCount = testimonials.length;

    // Detect prefers-reduced-motion
    useEffect(() => {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      prefersReducedMotionRef.current = mq.matches;
      const handler = (e: MediaQueryListEvent) => {
        prefersReducedMotionRef.current = e.matches;
      };
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }, []);

    // Navigation helpers
    const goTo = useCallback(
      (index: number) => {
        const clamped = ((index % slideCount) + slideCount) % slideCount;
        setCurrentIndex(clamped);
      },
      [slideCount],
    );

    const goNext = useCallback(() => goTo(currentIndex + 1), [currentIndex, goTo]);
    const goPrev = useCallback(() => goTo(currentIndex - 1), [currentIndex, goTo]);

    // Auto-play
    useEffect(() => {
      if (!autoPlay || slideCount <= 1 || isPaused || prefersReducedMotionRef.current) {
        return;
      }

      autoPlayTimerRef.current = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % slideCount);
      }, interval);

      return () => {
        if (autoPlayTimerRef.current) {
          clearInterval(autoPlayTimerRef.current);
          autoPlayTimerRef.current = null;
        }
      };
    }, [autoPlay, interval, slideCount, isPaused]);

    // Hover pause
    const handleMouseEnter = useCallback(() => {
      if (pauseOnHover) {
        setIsPaused(true);
      }
    }, [pauseOnHover]);

    const handleMouseLeave = useCallback(() => {
      if (pauseOnHover) {
        setIsPaused(false);
      }
    }, [pauseOnHover]);

    // Swipe handling
    const handlePointerDown = useCallback((e: React.PointerEvent) => {
      pointerStartXRef.current = e.clientX;
      pointerStartYRef.current = e.clientY;
    }, []);

    const handlePointerUp = useCallback(
      (e: React.PointerEvent) => {
        if (pointerStartXRef.current === null || pointerStartYRef.current === null) {
          return;
        }

        const deltaX = e.clientX - pointerStartXRef.current;
        const deltaY = e.clientY - pointerStartYRef.current;
        const absDeltaX = Math.abs(deltaX);
        const absDeltaY = Math.abs(deltaY);
        const threshold = 50;

        if (absDeltaX > threshold && absDeltaX > absDeltaY) {
          if (deltaX < 0) {
            goNext();
          } else {
            goPrev();
          }
        }

        pointerStartXRef.current = null;
        pointerStartYRef.current = null;
      },
      [goNext, goPrev],
    );

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

    const current = testimonials[currentIndex];
    if (!current) {
      return null;
    }

    const transitionStyle = prefersReducedMotionRef.current
      ? 'none'
      : 'transform 500ms cubic-bezier(0.16, 1, 0.3, 1)';

    return (
      <section
        ref={ref}
        className={['relative w-full', className].filter(Boolean).join(' ')}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="region"
        aria-roledescription="carousel"
        aria-label="Testimonials"
        data-testid="testimonial-carousel"
        {...rest}
      >
        {/* Slide track */}
        <div
          className="overflow-hidden"
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          style={{ touchAction: 'pan-y' }}
        >
          <div
            className="flex"
            style={{
              transform: `translateX(-${currentIndex * 100}%)`,
              transition: transitionStyle,
              width: `${slideCount * 100}%`,
            }}
          >
            {testimonials.map((testimonial, index) => (
              <div
                key={testimonial.id}
                className="flex items-center justify-center px-4"
                style={{ width: `${100 / slideCount}%` }}
                role="group"
                aria-roledescription="slide"
                aria-label={`Testimonial ${index + 1} of ${slideCount}`}
                aria-hidden={index !== currentIndex}
              >
                {/* Card */}
                <div className="w-full max-w-2xl mx-auto bg-surface rounded-2xl border border-surface-border p-8 md:p-10 text-center relative">
                  {/* Decorative quote mark */}
                  <div
                    className="text-6xl md:text-7xl font-serif leading-none text-primary/20 select-none absolute top-4 left-6 md:top-6 md:left-8"
                    aria-hidden="true"
                  >
                    &ldquo;
                  </div>

                  {/* Rating stars */}
                  {testimonial.rating != null && testimonial.rating > 0 && (
                    <div
                      className="flex items-center justify-center gap-0.5 mb-4 text-warning"
                      data-testid={`testimonial-rating-${testimonial.id}`}
                      aria-label={`${testimonial.rating} out of 5 stars`}
                    >
                      {Array.from({ length: 5 }, (_, i) => (
                        <StarIcon key={i} filled={i < testimonial.rating!} />
                      ))}
                    </div>
                  )}

                  {/* Quote */}
                  <blockquote className="text-lg md:text-xl text-text leading-relaxed mt-4 mb-6">
                    {testimonial.quote}
                  </blockquote>

                  {/* Author info */}
                  <div className="flex items-center justify-center gap-3">
                    {/* Avatar */}
                    {testimonial.avatarSrc ? (
                      <img
                        src={testimonial.avatarSrc}
                        alt={testimonial.authorName}
                        className="w-10 h-10 rounded-full object-cover ring-2 ring-surface-border"
                        data-testid={`testimonial-avatar-${testimonial.id}`}
                      />
                    ) : (
                      <div
                        className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-sm ring-2 ring-surface-border"
                        data-testid={`testimonial-avatar-${testimonial.id}`}
                        aria-hidden="true"
                      >
                        {testimonial.authorName
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>
                    )}

                    <div className="text-left">
                      <div className="font-semibold text-text text-sm" data-testid="testimonial-author-name">
                        {testimonial.authorName}
                      </div>
                      {(testimonial.authorRole || testimonial.authorCompany) && (
                        <div className="text-text-secondary text-xs" data-testid="testimonial-author-role">
                          {[testimonial.authorRole, testimonial.authorCompany]
                            .filter(Boolean)
                            .join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Arrows - hidden on mobile */}
        {showArrows && slideCount > 1 && !isMobile && (
          <>
            <button
              type="button"
              onClick={goPrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-surface border border-surface-border text-text-secondary hover:text-text hover:border-text-secondary flex items-center justify-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              aria-label="Previous testimonial"
              data-testid="testimonial-prev"
            >
              <ChevronLeftIcon />
            </button>
            <button
              type="button"
              onClick={goNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-surface border border-surface-border text-text-secondary hover:text-text hover:border-text-secondary flex items-center justify-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              aria-label="Next testimonial"
              data-testid="testimonial-next"
            >
              <ChevronRightIcon />
            </button>
          </>
        )}

        {/* Dots */}
        {showDots && slideCount > 1 && (
          <div
            className="flex items-center justify-center gap-2 mt-6"
            role="tablist"
            aria-label="Testimonial navigation"
          >
            {testimonials.map((testimonial, index) => (
              <button
                key={testimonial.id}
                type="button"
                role="tab"
                aria-selected={index === currentIndex}
                aria-label={`Go to testimonial ${index + 1}`}
                onClick={() => goTo(index)}
                className={[
                  'rounded-full transition-all duration-300',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
                  index === currentIndex
                    ? 'w-6 h-2 bg-primary'
                    : 'w-2 h-2 bg-surface-border hover:bg-text-secondary',
                ].join(' ')}
              />
            ))}
          </div>
        )}
      </section>
    );
  },
);

TestimonialCarousel.displayName = 'TestimonialCarousel';
