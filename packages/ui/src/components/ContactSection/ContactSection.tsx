import React, { forwardRef } from 'react';
import { useIsMobile } from '../../hooks/useIsMobile';

// ─── Types ──────────────────────────────────────────────────────────────────

export type ContactInfo = {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
};

export type ContactSectionProps = React.HTMLAttributes<HTMLElement> & {
  heading?: React.ReactNode;
  description?: React.ReactNode;
  form: React.ReactNode;
  contactInfo?: ContactInfo[];
  socialLinks?: React.ReactNode;
  map?: React.ReactNode;
  reversed?: boolean;
};

// ─── ContactSection ─────────────────────────────────────────────────────────

export const ContactSection = forwardRef<HTMLElement, ContactSectionProps>(function ContactSection(
  {
    heading,
    description,
    form,
    contactInfo,
    socialLinks,
    map,
    reversed = false,
    className,
    ...rest
  },
  ref,
) {
  const isMobile = useIsMobile();

  const sectionClassName = [
    'w-full py-12 px-4 sm:px-6 lg:px-8',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  const gridClassName = isMobile
    ? 'flex flex-col gap-10'
    : `grid grid-cols-2 gap-12 ${reversed ? 'direction-rtl' : ''}`;

  const formColumn = (
    <div
      className="rounded-xl border border-surface-border bg-surface p-6 md:p-8"
      data-testid="contact-form"
      style={reversed && !isMobile ? { order: 2 } : undefined}
    >
      {form}
    </div>
  );

  const infoColumn = (
    <div
      className="flex flex-col gap-8"
      data-testid="contact-info-column"
      style={reversed && !isMobile ? { order: 1 } : undefined}
    >
      {/* Contact info items */}
      {contactInfo && contactInfo.length > 0 && (
        <div className="flex flex-col gap-5" data-testid="contact-info-list">
          {contactInfo.map((item, index) => (
            <div key={index} className="flex items-start gap-4">
              <div className="flex-shrink-0 text-primary mt-0.5">
                {item.icon}
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium text-text-secondary">
                  {item.label}
                </span>
                <span className="text-base text-text">
                  {item.value}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Social links */}
      {socialLinks && (
        <div data-testid="contact-social-links">
          {socialLinks}
        </div>
      )}

      {/* Map */}
      {map && (
        <div
          className="rounded-xl overflow-hidden border border-surface-border"
          data-testid="contact-map"
        >
          {map}
        </div>
      )}
    </div>
  );

  return (
    <section
      ref={ref}
      className={sectionClassName}
      data-testid="contact-section"
      {...rest}
    >
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        {(heading || description) && (
          <div className="mb-10">
            {heading && (
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-text">
                {heading}
              </h2>
            )}
            {description && (
              <p className="mt-3 text-base md:text-lg text-text-secondary max-w-2xl">
                {description}
              </p>
            )}
          </div>
        )}

        {/* Two-column layout */}
        <div className={gridClassName}>
          {formColumn}
          {infoColumn}
        </div>
      </div>
    </section>
  );
});

ContactSection.displayName = 'ContactSection';
