import React, { forwardRef, useCallback, useRef, useState } from 'react';

export type SliderSize = 'sm' | 'md' | 'lg';
export type SliderColor = 'primary' | 'success' | 'info';

export type SliderProps = Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange' | 'defaultValue'> & {
  value?: number;
  defaultValue?: number;
  min?: number;
  max?: number;
  step?: number;
  onChange?: (value: number) => void;
  label?: React.ReactNode;
  showValue?: boolean;
  size?: SliderSize;
  color?: SliderColor;
  disabled?: boolean;
};

const sizeStyles: Record<SliderSize, { track: string; thumb: string; thumbPx: number }> = {
  sm: { track: 'h-1', thumb: 'w-3.5 h-3.5', thumbPx: 14 },
  md: { track: 'h-1.5', thumb: 'w-4.5 h-4.5', thumbPx: 18 },
  lg: { track: 'h-2', thumb: 'w-5.5 h-5.5', thumbPx: 22 },
};

const colorStyles: Record<SliderColor, { fill: string; trackBg: React.CSSProperties }> = {
  primary: {
    fill: 'bg-primary',
    trackBg: {
      backgroundColor: 'color-mix(in srgb, var(--color-primary) 12%, var(--color-surface-lighter))',
    },
  },
  success: {
    fill: 'bg-success',
    trackBg: {
      backgroundColor: 'color-mix(in srgb, var(--color-success) 12%, var(--color-surface-lighter))',
    },
  },
  info: {
    fill: 'bg-info',
    trackBg: {
      backgroundColor: 'color-mix(in srgb, var(--color-info) 12%, var(--color-surface-lighter))',
    },
  },
};

function clampAndStep(raw: number, min: number, max: number, step: number): number {
  const clamped = Math.min(max, Math.max(min, raw));
  const stepped = Math.round((clamped - min) / step) * step + min;
  // Clamp again to handle floating point drift at boundaries
  return Math.min(max, Math.max(min, parseFloat(stepped.toPrecision(12))));
}

export const Slider = forwardRef<HTMLDivElement, SliderProps>(function Slider(
  {
    value: controlledValue,
    defaultValue,
    min = 0,
    max = 100,
    step = 1,
    onChange,
    label,
    showValue = false,
    size = 'md',
    color = 'primary',
    disabled = false,
    className,
    ...rest
  },
  ref,
) {
  const isControlled = controlledValue !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue ?? min);
  const currentValue = isControlled ? controlledValue : internalValue;

  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const percent = max === min ? 0 : ((currentValue - min) / (max - min)) * 100;

  const s = sizeStyles[size];
  const c = colorStyles[color];

  const updateValue = useCallback(
    (clientX: number) => {
      const track = trackRef.current;
      if (!track) return;
      const rect = track.getBoundingClientRect();
      const ratio = (clientX - rect.left) / rect.width;
      const raw = min + ratio * (max - min);
      const next = clampAndStep(raw, min, max, step);

      if (!isControlled) {
        setInternalValue(next);
      }
      onChange?.(next);
    },
    [min, max, step, isControlled, onChange],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (disabled) return;
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      setIsDragging(true);
      updateValue(e.clientX);
    },
    [disabled, updateValue],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;
      updateValue(e.clientX);
    },
    [isDragging, updateValue],
  );

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled) return;

      let next: number | undefined;

      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowUp':
          e.preventDefault();
          next = clampAndStep(currentValue + step, min, max, step);
          break;
        case 'ArrowLeft':
        case 'ArrowDown':
          e.preventDefault();
          next = clampAndStep(currentValue - step, min, max, step);
          break;
        case 'Home':
          e.preventDefault();
          next = min;
          break;
        case 'End':
          e.preventDefault();
          next = max;
          break;
      }

      if (next !== undefined) {
        if (!isControlled) {
          setInternalValue(next);
        }
        onChange?.(next);
      }
    },
    [disabled, currentValue, step, min, max, isControlled, onChange],
  );

  return (
    <div
      ref={ref}
      className={['w-full', disabled ? 'opacity-50 cursor-not-allowed' : '', className]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {(label || showValue) && (
        <div className="flex items-center justify-between mb-1.5 text-sm">
          {label && <span className="font-medium text-text-secondary">{label}</span>}
          {showValue && <span className="text-text-tertiary tabular-nums">{currentValue}</span>}
        </div>
      )}

      {/* Track container — handles pointer events and sizing */}
      <div
        ref={trackRef}
        className={[
          'relative rounded-full cursor-pointer',
          s.track,
          disabled ? 'pointer-events-none' : '',
        ].join(' ')}
        style={c.trackBg}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* Fill bar */}
        <div
          className={['absolute inset-y-0 left-0 rounded-full', c.fill].join(' ')}
          style={{ width: `${percent}%` }}
        />

        {/* Thumb */}
        <div
          role="slider"
          tabIndex={disabled ? -1 : 0}
          aria-valuenow={currentValue}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-label={typeof label === 'string' ? label : undefined}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={handleKeyDown}
          className={[
            'absolute top-1/2 rounded-full bg-white',
            'shadow-[0_1px_3px_rgba(0,0,0,0.15),0_1px_2px_rgba(0,0,0,0.06)]',
            'ring-1 ring-surface-border/50',
            'transition-transform duration-100',
            isDragging ? 'scale-90' : 'hover:scale-110',
            isFocused ? 'ring-2 ring-primary/50 ring-offset-2' : '',
            s.thumb,
          ].join(' ')}
          style={{
            left: `${percent}%`,
            transform: `translate(-50%, -50%)${isDragging ? ' scale(0.9)' : ''}`,
          }}
        />
      </div>
    </div>
  );
});

Slider.displayName = 'Slider';
