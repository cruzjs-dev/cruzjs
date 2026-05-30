import React, { forwardRef, useId } from 'react';

// ─── Types ──────────────────────────────────────────────────────────────────

export type LogoItem = {
  id: string;
  src: string;
  alt: string;
  href?: string;
  width?: number;
};

export type LogoCloudProps = React.HTMLAttributes<HTMLElement> & {
  logos: LogoItem[];
  heading?: React.ReactNode;
  columns?: 3 | 4 | 5 | 6;
  maxLogoHeight?: number;
  grayscale?: boolean;
  marquee?: boolean;
  marqueeSpeed?: number;
  renderLink?: (props: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => React.ReactNode;
};

// ─── Column class map ───────────────────────────────────────────────────────

const columnClasses: Record<3 | 4 | 5 | 6, string> = {
  3: 'grid-cols-2 sm:grid-cols-3',
  4: 'grid-cols-2 sm:grid-cols-4',
  5: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5',
  6: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6',
};

// ─── Logo image ─────────────────────────────────────────────────────────────

type LogoImageProps = {
  logo: LogoItem;
  grayscale: boolean;
  maxLogoHeight?: number;
  renderLink?: LogoCloudProps['renderLink'];
};

const LogoImage: React.FC<LogoImageProps> = ({
  logo,
  grayscale,
  maxLogoHeight,
  renderLink,
}) => {
  const filterClasses = grayscale
    ? 'grayscale opacity-60 hover:grayscale-0 hover:opacity-100'
    : '';

  const imgStyle: React.CSSProperties = {
    ...(maxLogoHeight != null ? { maxHeight: `${maxLogoHeight}px` } : {}),
    ...(logo.width != null ? { width: `${logo.width}px` } : {}),
  };

  const img = (
    <img
      src={logo.src}
      alt={logo.alt}
      className={[
        'object-contain max-w-full transition-all duration-300',
        filterClasses,
      ]
        .filter(Boolean)
        .join(' ')}
      style={imgStyle}
      loading="lazy"
    />
  );

  if (logo.href) {
    if (renderLink) {
      return (
        <>
          {renderLink({
            href: logo.href,
            children: img,
            className: 'logo-cloud-link flex items-center justify-center',
          })}
        </>
      );
    }
    return (
      <a
        href={logo.href}
        className="flex items-center justify-center"
        rel="noopener noreferrer"
      >
        {img}
      </a>
    );
  }

  return <div className="flex items-center justify-center">{img}</div>;
};

// ─── Marquee content ────────────────────────────────────────────────────────

type MarqueeContentProps = {
  logos: LogoItem[];
  grayscale: boolean;
  maxLogoHeight?: number;
  speed: number;
  renderLink?: LogoCloudProps['renderLink'];
};

const MarqueeContent: React.FC<MarqueeContentProps> = ({
  logos,
  grayscale,
  maxLogoHeight,
  speed,
  renderLink,
}) => {
  const scopeId = useId().replace(/:/g, '-');
  const animationName = `logo-cloud-marquee-${scopeId}`;

  const keyframes = `
@keyframes ${animationName} {
  from { transform: translateX(0%); }
  to { transform: translateX(-50%); }
}
`;

  const trackStyle: React.CSSProperties = {
    animation: `${animationName} ${speed}s linear infinite`,
  };

  return (
    <div
      className="overflow-hidden relative"
      data-testid="logo-cloud-marquee"
    >
      <style>{keyframes}</style>
      <div
        className="flex items-center gap-12 w-max"
        style={trackStyle}
      >
        {/* Render logos twice for seamless looping */}
        {[...logos, ...logos].map((logo, i) => (
          <div key={`${logo.id}-${i}`} className="shrink-0 px-4">
            <LogoImage
              logo={logo}
              grayscale={grayscale}
              maxLogoHeight={maxLogoHeight}
              renderLink={renderLink}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── LogoCloud ──────────────────────────────────────────────────────────────

export const LogoCloud = forwardRef<HTMLElement, LogoCloudProps>(function LogoCloud(
  {
    logos,
    heading,
    columns = 5,
    maxLogoHeight,
    grayscale = true,
    marquee = false,
    marqueeSpeed = 30,
    renderLink,
    className,
    ...rest
  },
  ref,
) {
  return (
    <section
      ref={ref}
      className={['logo-cloud', className].filter(Boolean).join(' ')}
      {...rest}
    >
      {heading && (
        <div className="text-center mb-8" data-testid="logo-cloud-heading">
          {typeof heading === 'string' ? (
            <p className="text-sm font-medium uppercase tracking-wider text-text-secondary">
              {heading}
            </p>
          ) : (
            heading
          )}
        </div>
      )}

      {marquee ? (
        <MarqueeContent
          logos={logos}
          grayscale={grayscale}
          maxLogoHeight={maxLogoHeight}
          speed={marqueeSpeed}
          renderLink={renderLink}
        />
      ) : (
        <div
          className={['grid gap-8 items-center', columnClasses[columns]]
            .filter(Boolean)
            .join(' ')}
          data-testid="logo-cloud-grid"
        >
          {logos.map((logo) => (
            <LogoImage
              key={logo.id}
              logo={logo}
              grayscale={grayscale}
              maxLogoHeight={maxLogoHeight}
              renderLink={renderLink}
            />
          ))}
        </div>
      )}
    </section>
  );
});

LogoCloud.displayName = 'LogoCloud';
