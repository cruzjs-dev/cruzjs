import React, { forwardRef } from 'react';
import { useIsMobile } from '../../hooks/useIsMobile';

// ─── Types ──────────────────────────────────────────────────────────────────

export type HeroSectionAlignment = 'center' | 'left';

export type HeroSectionProps = React.HTMLAttributes<HTMLElement> & {
  heading: React.ReactNode;
  subheading?: React.ReactNode;
  actions?: React.ReactNode;
  media?: React.ReactNode;
  badge?: React.ReactNode;
  alignment?: HeroSectionAlignment;
  backgroundImage?: string;
  backgroundGradient?: string;
  fullHeight?: boolean;
  padding?: 'md' | 'lg' | 'xl';
};

// ─── Padding map ────────────────────────────────────────────────────────────

const paddingClasses: Record<'md' | 'lg' | 'xl', string> = {
  md: 'py-12 md:py-16',
  lg: 'py-16 md:py-24',
  xl: 'py-24 md:py-32',
};

// ─── HeroSection ────────────────────────────────────────────────────────────

export const HeroSection = forwardRef<HTMLElement, HeroSectionProps>(function HeroSection(
  {
    heading,
    subheading,
    actions,
    media,
    badge,
    alignment = 'center',
    backgroundImage,
    backgroundGradient,
    fullHeight = false,
    padding = 'lg',
    className,
    style,
    ...rest
  },
  ref,
) {
  const isMobile = useIsMobile();

  const isCenter = alignment === 'center';
  const hasMedia = media != null;

  // Build root section classes
  const sectionClassName = [
    'relative w-full overflow-hidden',
    paddingClasses[padding],
    fullHeight ? 'min-h-screen flex items-center' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  // Build inline style for background
  const sectionStyle: React.CSSProperties = {
    ...style,
    ...(backgroundImage
      ? {
          backgroundImage: `url(${backgroundImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }
      : {}),
    ...(backgroundGradient ? { background: backgroundGradient } : {}),
  };

  // Container layout: center = single column, left with media = two columns
  const containerClassName = [
    'mx-auto max-w-7xl px-4 sm:px-6 lg:px-8',
    fullHeight ? 'w-full' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const useGrid = !isCenter && hasMedia && !isMobile;

  const gridClassName = useGrid
    ? 'grid grid-cols-2 gap-12 items-center'
    : 'flex flex-col';

  // Text alignment classes
  const textAlignClassName = isCenter ? 'text-center items-center' : 'text-left items-start';

  return (
    <section
      ref={ref}
      className={sectionClassName}
      style={sectionStyle}
      data-testid="hero-section"
      {...rest}
    >
      <div className={containerClassName}>
        <div className={gridClassName}>
          {/* Content column */}
          <div className={`flex flex-col gap-6 ${textAlignClassName}`}>
            {/* Badge */}
            {badge && (
              <div data-testid="hero-badge">
                {badge}
              </div>
            )}

            {/* Heading */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-text">
              {heading}
            </h1>

            {/* Subheading */}
            {subheading && (
              <p className="text-lg md:text-xl text-text-secondary max-w-2xl">
                {subheading}
              </p>
            )}

            {/* Actions */}
            {actions && (
              <div className="flex flex-wrap gap-3 mt-2" data-testid="hero-actions">
                {actions}
              </div>
            )}
          </div>

          {/* Media column */}
          {hasMedia && (
            <div className={`${isMobile || isCenter ? 'mt-10' : ''}`} data-testid="hero-media">
              {media}
            </div>
          )}
        </div>
      </div>
    </section>
  );
});

HeroSection.displayName = 'HeroSection';
