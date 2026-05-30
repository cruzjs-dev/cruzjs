import React, {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

export type OnboardingSlide = {
  title: string;
  description?: string;
  image?: string;
  video?: string;
  illustration?: React.ReactNode;
};

export type OnboardingCarouselProps = React.HTMLAttributes<HTMLDivElement> & {
  slides: OnboardingSlide[];
  onComplete?: () => void;
  onSkip?: () => void;
  completeLabel?: string;
  skipLabel?: string;
  nextLabel?: string;
  showProgress?: boolean;
  autoPlay?: boolean;
  autoPlayInterval?: number;
};

export const OnboardingCarousel = forwardRef<HTMLDivElement, OnboardingCarouselProps>(
  function OnboardingCarousel(
    {
      slides,
      onComplete,
      onSkip,
      completeLabel = 'Get Started',
      skipLabel = 'Skip',
      nextLabel = 'Next',
      showProgress = true,
      autoPlay = false,
      autoPlayInterval = 5000,
      className,
      ...rest
    },
    ref,
  ) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const autoPlayTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const pointerStartXRef = useRef<number | null>(null);
    const pointerStartYRef = useRef<number | null>(null);
    const trackRef = useRef<HTMLDivElement>(null);

    const slideCount = slides.length;
    const isLastSlide = currentIndex === slideCount - 1;
    const isSingleSlide = slideCount <= 1;

    const goTo = useCallback(
      (index: number) => {
        const clamped = Math.max(0, Math.min(index, slideCount - 1));
        setCurrentIndex(clamped);
      },
      [slideCount],
    );

    const goNext = useCallback(() => {
      if (isLastSlide) {
        onComplete?.();
      } else {
        goTo(currentIndex + 1);
      }
    }, [currentIndex, goTo, isLastSlide, onComplete]);

    // Auto-play
    useEffect(() => {
      if (!autoPlay || isLastSlide || slideCount <= 1) {
        return;
      }

      autoPlayTimerRef.current = setInterval(() => {
        setCurrentIndex((prev) => {
          if (prev >= slideCount - 1) {
            return prev;
          }
          return prev + 1;
        });
      }, autoPlayInterval);

      return () => {
        if (autoPlayTimerRef.current) {
          clearInterval(autoPlayTimerRef.current);
          autoPlayTimerRef.current = null;
        }
      };
    }, [autoPlay, autoPlayInterval, isLastSlide, slideCount, currentIndex]);

    // Pointer-based swipe handling
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

        // Only register horizontal swipes
        if (absDeltaX > threshold && absDeltaX > absDeltaY) {
          if (deltaX < 0 && currentIndex < slideCount - 1) {
            // Swipe left = next
            goTo(currentIndex + 1);
          } else if (deltaX > 0 && currentIndex > 0) {
            // Swipe right = prev
            goTo(currentIndex - 1);
          }
        }

        pointerStartXRef.current = null;
        pointerStartYRef.current = null;
      },
      [currentIndex, goTo, slideCount],
    );

    // Keyboard navigation
    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowLeft' && currentIndex > 0) {
          e.preventDefault();
          goTo(currentIndex - 1);
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          if (isLastSlide) {
            onComplete?.();
          } else {
            goTo(currentIndex + 1);
          }
        }
      },
      [currentIndex, goTo, isLastSlide, onComplete],
    );

    const currentSlide = slides[currentIndex];

    return (
      <div
        ref={ref}
        className={['flex flex-col h-full', className].filter(Boolean).join(' ')}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="region"
        aria-roledescription="carousel"
        aria-label="Onboarding"
        {...rest}
      >
        {/* Slide area */}
        <div
          ref={trackRef}
          className="relative flex-1 overflow-hidden"
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          style={{ touchAction: 'pan-y' }}
        >
          <div
            className="flex h-full"
            style={{
              transform: `translateX(-${currentIndex * 100}%)`,
              transition: 'transform 500ms cubic-bezier(0.16, 1, 0.3, 1)',
              width: `${slideCount * 100}%`,
            }}
          >
            {slides.map((slide, index) => (
              <div
                key={index}
                className="flex flex-col h-full"
                style={{ width: `${100 / slideCount}%` }}
                role="group"
                aria-roledescription="slide"
                aria-label={`Slide ${index + 1} of ${slideCount}`}
                aria-hidden={index !== currentIndex}
              >
                {/* Media area - 60% */}
                <div className="h-[60%] rounded-xl overflow-hidden bg-surface-lighter flex items-center justify-center">
                  {slide.video ? (
                    <video
                      src={slide.video}
                      autoPlay
                      muted
                      loop
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  ) : slide.image ? (
                    <img
                      src={slide.image}
                      alt={slide.title}
                      className="w-full h-full object-cover"
                    />
                  ) : slide.illustration ? (
                    slide.illustration
                  ) : null}
                </div>

                {/* Content area - 40% */}
                <div className="h-[40%] flex flex-col items-center justify-center text-center px-6 py-5">
                  <h2 className="text-lg font-semibold text-text">
                    {slide.title}
                  </h2>
                  {slide.description && (
                    <p className="text-sm text-text-secondary mt-2">
                      {slide.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex items-center justify-between px-4 py-3">
          {/* Skip button */}
          <div className="flex-1">
            {onSkip && (
              <button
                type="button"
                onClick={onSkip}
                className="text-text-tertiary text-sm hover:text-text-secondary transition-colors"
                aria-label={skipLabel}
              >
                {skipLabel}
              </button>
            )}
          </div>

          {/* Progress dots */}
          <div className="flex-1 flex justify-center">
            {showProgress && !isSingleSlide && (
              <div
                className="flex gap-2 justify-center"
                role="tablist"
                aria-label="Slide progress"
              >
                {slides.map((_, index) => (
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
                        ? 'w-6 h-1.5 bg-primary'
                        : 'w-1.5 h-1.5 bg-surface-border',
                    ].join(' ')}
                    style={{
                      transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Next / Done button */}
          <div className="flex-1 flex justify-end">
            <button
              type="button"
              onClick={goNext}
              className="bg-primary text-surface rounded-lg px-4 py-2 font-medium text-sm transition-colors hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              aria-label={isLastSlide || isSingleSlide ? completeLabel : nextLabel}
            >
              {isLastSlide || isSingleSlide ? completeLabel : nextLabel}
            </button>
          </div>
        </div>
      </div>
    );
  },
);

OnboardingCarousel.displayName = 'OnboardingCarousel';
