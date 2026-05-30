import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { OnboardingSlide } from './OnboardingCarousel';
import { OnboardingCarousel } from './OnboardingCarousel';

const defaultSlides: OnboardingSlide[] = [
  { title: 'Welcome', description: 'Get started with our app' },
  { title: 'Features', description: 'Explore powerful features' },
  { title: 'Ready', description: 'You are all set' },
];

describe('OnboardingCarousel', () => {
  it('renders first slide title', () => {
    render(<OnboardingCarousel slides={defaultSlides} />);
    expect(screen.getByText('Welcome')).toBeInTheDocument();
  });

  it('renders progress dots', () => {
    render(<OnboardingCarousel slides={defaultSlides} />);
    const dots = screen.getAllByRole('tab');
    expect(dots.length).toBeGreaterThan(0);
  });

  it('advances to next slide on Next click', () => {
    render(<OnboardingCarousel slides={defaultSlides} />);
    const nextBtn = screen.getByRole('button', { name: 'Next' });
    fireEvent.click(nextBtn);

    const dots = screen.getAllByRole('tab');
    expect(dots[1]).toHaveAttribute('aria-selected', 'true');
  });

  it('calls onComplete on last slide Done click', () => {
    const onComplete = vi.fn();
    render(<OnboardingCarousel slides={defaultSlides} onComplete={onComplete} />);

    // Navigate to last slide
    const nextBtn = screen.getByRole('button', { name: 'Next' });
    fireEvent.click(nextBtn);
    fireEvent.click(nextBtn);

    // Now on last slide, button should say "Get Started"
    const doneBtn = screen.getByRole('button', { name: 'Get Started' });
    fireEvent.click(doneBtn);

    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('calls onSkip on Skip click', () => {
    const onSkip = vi.fn();
    render(<OnboardingCarousel slides={defaultSlides} onSkip={onSkip} />);

    const skipBtn = screen.getByRole('button', { name: 'Skip' });
    fireEvent.click(skipBtn);

    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it('renders correct number of dots', () => {
    render(<OnboardingCarousel slides={defaultSlides} />);
    const dots = screen.getAllByRole('tab');
    expect(dots).toHaveLength(3);
  });

  it('shows completeLabel on last slide', () => {
    render(
      <OnboardingCarousel slides={defaultSlides} completeLabel="Finish" />,
    );

    // Navigate to last slide
    const nextBtn = screen.getByRole('button', { name: 'Next' });
    fireEvent.click(nextBtn);
    fireEvent.click(nextBtn);

    expect(screen.getByRole('button', { name: 'Finish' })).toBeInTheDocument();
  });

  it('renders custom labels', () => {
    const onSkip = vi.fn();
    render(
      <OnboardingCarousel
        slides={defaultSlides}
        nextLabel="Continue"
        skipLabel="No thanks"
        completeLabel="Let's go"
        onSkip={onSkip}
      />,
    );

    expect(screen.getByRole('button', { name: 'Continue' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'No thanks' })).toBeInTheDocument();
  });
});
