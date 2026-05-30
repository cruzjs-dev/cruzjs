import React, { forwardRef, useCallback, useEffect, useState } from 'react';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
export type AvatarStatus = 'online' | 'offline' | 'away' | 'busy';

export type AvatarProps = React.HTMLAttributes<HTMLSpanElement> & {
  src?: string | null;
  alt?: string;
  name?: string;
  size?: AvatarSize;
  status?: AvatarStatus;
  square?: boolean;
};

export type AvatarGroupProps = React.HTMLAttributes<HTMLDivElement> & {
  max?: number;
  size?: AvatarSize;
};

const sizeMap: Record<AvatarSize, { container: string; text: string; status: string; statusRing: string }> = {
  xs: { container: 'w-6 h-6', text: 'text-[10px]', status: 'w-1.5 h-1.5', statusRing: 'ring-1' },
  sm: { container: 'w-8 h-8', text: 'text-xs', status: 'w-2 h-2', statusRing: 'ring-[1.5px]' },
  md: { container: 'w-10 h-10', text: 'text-sm', status: 'w-2.5 h-2.5', statusRing: 'ring-2' },
  lg: { container: 'w-12 h-12', text: 'text-base', status: 'w-3 h-3', statusRing: 'ring-2' },
  xl: { container: 'w-16 h-16', text: 'text-lg', status: 'w-3.5 h-3.5', statusRing: 'ring-2' },
  '2xl': { container: 'w-20 h-20', text: 'text-xl', status: 'w-4 h-4', statusRing: 'ring-[3px]' },
};

const statusColorMap: Record<AvatarStatus, string> = {
  online: 'bg-success',
  offline: 'bg-text-muted',
  away: 'bg-warning',
  busy: 'bg-danger',
};

const statusHaloMap: Record<AvatarStatus, React.CSSProperties> = {
  online: { boxShadow: '0 0 0 2px color-mix(in srgb, var(--color-success) 20%, transparent)' },
  offline: {},
  away: { boxShadow: '0 0 0 2px color-mix(in srgb, var(--color-warning) 20%, transparent)' },
  busy: { boxShadow: '0 0 0 2px color-mix(in srgb, var(--color-danger) 20%, transparent)' },
};

const palette = [
  { bg: 'color-mix(in srgb, var(--color-primary) 12%, var(--color-surface))', text: 'var(--color-primary-dark)' },
  { bg: 'color-mix(in srgb, var(--color-success) 12%, var(--color-surface))', text: 'var(--color-success-dark)' },
  { bg: 'color-mix(in srgb, var(--color-info) 12%, var(--color-surface))', text: 'var(--color-info)' },
  { bg: 'color-mix(in srgb, var(--color-warning) 12%, var(--color-surface))', text: 'var(--color-warning-text)' },
  { bg: 'color-mix(in srgb, var(--color-danger) 12%, var(--color-surface))', text: 'var(--color-danger-text)' },
  { bg: 'color-mix(in srgb, var(--color-accent) 12%, var(--color-surface))', text: 'var(--color-accent)' },
];

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

const FallbackIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <path d="M10 8a3 3 0 100-6 3 3 0 000 6zM3.465 14.493a1.23 1.23 0 00.41 1.412A9.957 9.957 0 0010 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 00-13.074.003z" />
  </svg>
);

export const Avatar = forwardRef<HTMLSpanElement, AvatarProps>(function Avatar(
  {
    src,
    alt,
    name,
    size = 'md',
    status,
    square = false,
    className,
    style,
    ...rest
  },
  ref,
) {
  const [imgError, setImgError] = useState(false);
  const handleError = useCallback(() => setImgError(true), []);

  useEffect(() => {
    setImgError(false);
  }, [src]);

  const s = sizeMap[size];
  const showImage = src && !imgError;
  const initials = name ? getInitials(name) : null;
  const colorIndex = name ? hashString(name) % palette.length : 0;
  const fallbackColor = palette[colorIndex];
  const radius = square ? 'rounded-xl' : 'rounded-full';

  return (
    <span
      ref={ref}
      className={[
        'relative inline-flex items-center justify-center shrink-0 select-none',
        'ring-1 ring-surface-border/30',
        s.container,
        radius,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={{
        ...(!showImage ? { backgroundColor: fallbackColor.bg, color: fallbackColor.text } : {}),
        ...style,
      }}
      role="img"
      aria-label={alt ?? name ?? 'Avatar'}
      {...rest}
    >
      {showImage ? (
        <img
          src={src}
          alt={alt ?? name ?? 'Avatar'}
          onError={handleError}
          className={['w-full h-full object-cover', radius].join(' ')}
          draggable={false}
        />
      ) : initials ? (
        <span className={['font-semibold leading-none', s.text].join(' ')}>
          {initials}
        </span>
      ) : (
        <FallbackIcon className={['opacity-40', s.text === 'text-[10px]' ? 'w-3.5 h-3.5' : s.text === 'text-xs' ? 'w-4 h-4' : s.text === 'text-sm' ? 'w-5 h-5' : s.text === 'text-base' ? 'w-6 h-6' : s.text === 'text-lg' ? 'w-8 h-8' : 'w-10 h-10'].join(' ')} />
      )}

      {status && (
        <span
          className={[
            'absolute bottom-0 right-0 block',
            radius === 'rounded-full' ? 'rounded-full' : 'rounded-full',
            s.status,
            s.statusRing,
            'ring-surface',
            statusColorMap[status],
          ].join(' ')}
          style={statusHaloMap[status]}
          aria-label={status}
        />
      )}
    </span>
  );
});

Avatar.displayName = 'Avatar';

export const AvatarGroup = forwardRef<HTMLDivElement, AvatarGroupProps>(function AvatarGroup(
  { max, size = 'md', children, className, ...rest },
  ref,
) {
  const childArray = React.Children.toArray(children);
  const visible = max && max < childArray.length ? childArray.slice(0, max) : childArray;
  const overflow = max && max < childArray.length ? childArray.length - max : 0;
  const s = sizeMap[size];

  return (
    <div
      ref={ref}
      className={['inline-flex items-center -space-x-2', className].filter(Boolean).join(' ')}
      role="group"
      aria-label="Avatar group"
      {...rest}
    >
      {visible.map((child, i) => (
        <span key={i} className="ring-2 ring-surface rounded-full">
          {React.isValidElement<AvatarProps>(child)
            ? React.cloneElement(child, { size })
            : child}
        </span>
      ))}
      {overflow > 0 && (
        <span
          className={[
            'inline-flex items-center justify-center rounded-full ring-2 ring-surface font-semibold',
            s.container,
            s.text,
          ].join(' ')}
          style={{
            backgroundColor: 'color-mix(in srgb, var(--color-text-muted) 12%, var(--color-surface))',
            color: 'var(--color-text-secondary)',
          }}
          aria-label={`${overflow} more`}
        >
          +{overflow}
        </span>
      )}
    </div>
  );
});

AvatarGroup.displayName = 'AvatarGroup';
