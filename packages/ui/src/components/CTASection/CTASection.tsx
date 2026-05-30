import React, { forwardRef } from 'react';

// ─── Types ──────────────────────────────────────────────────────────────────

export type CTASectionVariant = 'subtle' | 'bold' | 'gradient';
export type CTASectionAlignment = 'center' | 'left';

export type CTASectionProps = React.HTMLAttributes<HTMLElement> & {
  heading: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  variant?: CTASectionVariant;
  alignment?: CTASectionAlignment;
  backgroundImage?: string;
};

// ─── Variant styles ─────────────────────────────────────────────────────────

const variantClasses: Record<CTASectionVariant, string> = {
  subtle: '',
  bold: 'bg-primary text-surface',
  gradient: '',
};

const variantStyles: Record<CTASectionVariant, React.CSSProperties> = {
  subtle: {
    backgroundColor: 'color-mix(in srgb, var(--color-primary) 8%, var(--color-surface))',
  },
  bold: {},
  gradient: {
    background:
      'linear-gradient(135deg, var(--color-primary), color-mix(in srgb, var(--color-primary) 60%, var(--color-surface)))',
  },
};

// ─── CTASection ─────────────────────────────────────────────────────────────

export const CTASection = forwardRef<HTMLElement, CTASectionProps>(function CTASection(
  {
    heading,
    description,
    actions,
    variant = 'subtle',
    alignment = 'center',
    backgroundImage,
    className,
    style,
    ...rest
  },
  ref,
) {
  const isCenter = alignment === 'center';

  // Build root section classes
  const sectionClassName = [
    'relative w-full overflow-hidden rounded-2xl py-12 px-6 md:py-16 md:px-12',
    variantClasses[variant],
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  // Build inline styles: variant base + background image + consumer overrides
  const sectionStyle: React.CSSProperties = {
    ...variantStyles[variant],
    ...(backgroundImage
      ? {
          backgroundImage: `url(${backgroundImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }
      : {}),
    ...style,
  };

  // Text alignment & flex alignment
  const textAlignClassName = isCenter ? 'text-center items-center' : 'text-left items-start';

  // Description color: on bold variant use inherited (white/surface), otherwise secondary
  const descriptionColorClass = variant === 'bold' ? 'opacity-90' : 'text-text-secondary';

  return (
    <section
      ref={ref}
      className={sectionClassName}
      style={sectionStyle}
      data-testid="cta-section"
      {...rest}
    >
      <div className="mx-auto max-w-3xl">
        <div className={`flex flex-col gap-4 ${textAlignClassName}`}>
          {/* Heading */}
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight">
            {heading}
          </h2>

          {/* Description */}
          {description && (
            <p className={`text-base md:text-lg max-w-2xl ${descriptionColorClass}`}>
              {description}
            </p>
          )}

          {/* Actions */}
          {actions && (
            <div
              className={`flex flex-wrap gap-3 mt-2 ${isCenter ? 'justify-center' : 'justify-start'}`}
              data-testid="cta-actions"
            >
              {actions}
            </div>
          )}
        </div>
      </div>
    </section>
  );
});

CTASection.displayName = 'CTASection';
