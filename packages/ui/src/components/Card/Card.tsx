import React, { forwardRef } from 'react';

export type CardVariant = 'elevated' | 'outlined' | 'filled';
export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

export type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: CardVariant;
  padding?: CardPadding;
  interactive?: boolean;
};

export type CardHeaderProps = React.HTMLAttributes<HTMLDivElement>;
export type CardBodyProps = React.HTMLAttributes<HTMLDivElement>;
export type CardFooterProps = React.HTMLAttributes<HTMLDivElement>;

const variantStyles: Record<CardVariant, string> = {
  elevated: 'bg-surface shadow-[0_1px_3px_-1px_rgba(0,0,0,0.06),0_2px_8px_-2px_rgba(0,0,0,0.04)] ring-1 ring-surface-border/50',
  outlined: 'bg-surface border border-surface-border',
  filled: 'bg-surface-lighter',
};

const paddingStyles: Record<CardPadding, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
};

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { variant = 'elevated', padding = 'none', interactive = false, className, children, ...rest },
  ref,
) {
  return (
    <div
      ref={ref}
      className={[
        'rounded-2xl overflow-hidden',
        variantStyles[variant],
        paddingStyles[padding],
        interactive
          ? 'cursor-pointer transition-all duration-200 hover:shadow-[0_4px_16px_-4px_rgba(0,0,0,0.1),0_2px_8px_-2px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-[0_1px_3px_-1px_rgba(0,0,0,0.06)]'
          : '',
        className,
      ].filter(Boolean).join(' ')}
      {...rest}
    >
      {children}
    </div>
  );
});

Card.displayName = 'Card';

export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(function CardHeader(
  { className, children, ...rest },
  ref,
) {
  return (
    <div
      ref={ref}
      className={['px-5 pt-5 pb-0', className].filter(Boolean).join(' ')}
      {...rest}
    >
      {children}
    </div>
  );
});

CardHeader.displayName = 'CardHeader';

export const CardBody = forwardRef<HTMLDivElement, CardBodyProps>(function CardBody(
  { className, children, ...rest },
  ref,
) {
  return (
    <div
      ref={ref}
      className={['px-5 py-4', className].filter(Boolean).join(' ')}
      {...rest}
    >
      {children}
    </div>
  );
});

CardBody.displayName = 'CardBody';

export const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(function CardFooter(
  { className, children, ...rest },
  ref,
) {
  return (
    <div
      ref={ref}
      className={[
        'px-5 py-4 border-t border-surface-border',
        className,
      ].filter(Boolean).join(' ')}
      {...rest}
    >
      {children}
    </div>
  );
});

CardFooter.displayName = 'CardFooter';
