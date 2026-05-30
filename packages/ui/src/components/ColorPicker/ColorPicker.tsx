import React, { forwardRef, useCallback, useEffect, useId, useRef, useState } from 'react';
import { useIsMobile } from '../../hooks/useIsMobile';

export type ColorPickerSize = 'sm' | 'md' | 'lg';
export type ColorPickerFormat = 'hex' | 'rgb';

export type ColorPickerProps = {
  label?: React.ReactNode;
  description?: string;
  error?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (color: string) => void;
  swatches?: string[];
  format?: ColorPickerFormat;
  size?: ColorPickerSize;
  disabled?: boolean;
  className?: string;
};

// --- Color conversion utilities ---

type HSV = { h: number; s: number; v: number };

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const clean = hex.replace(/^#/, '');
  if (!/^[0-9a-fA-F]{6}$/.test(clean) && !/^[0-9a-fA-F]{3}$/.test(clean)) {
    return null;
  }
  const full = clean.length === 3
    ? clean.split('').map((c) => c + c).join('')
    : clean;
  const num = parseInt(full, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function rgbToHsv(r: number, g: number, b: number): HSV {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === rn) {
      h = ((gn - bn) / delta) % 6;
    } else if (max === gn) {
      h = (bn - rn) / delta + 2;
    } else {
      h = (rn - gn) / delta + 4;
    }
    h = Math.round(h * 60);
    if (h < 0) {
      h += 360;
    }
  }

  const s = max === 0 ? 0 : delta / max;
  return { h, s, v: max };
}

function hsvToRgb(h: number, s: number, v: number): { r: number; g: number; b: number } {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;

  let rp = 0;
  let gp = 0;
  let bp = 0;

  if (h < 60) { rp = c; gp = x; bp = 0; }
  else if (h < 120) { rp = x; gp = c; bp = 0; }
  else if (h < 180) { rp = 0; gp = c; bp = x; }
  else if (h < 240) { rp = 0; gp = x; bp = c; }
  else if (h < 300) { rp = x; gp = 0; bp = c; }
  else { rp = c; gp = 0; bp = x; }

  return {
    r: Math.round((rp + m) * 255),
    g: Math.round((gp + m) * 255),
    b: Math.round((bp + m) * 255),
  };
}

function hexToHsv(hex: string): HSV {
  const rgb = hexToRgb(hex);
  if (!rgb) {
    return { h: 0, s: 0, v: 0 };
  }
  return rgbToHsv(rgb.r, rgb.g, rgb.b);
}

function hsvToHex(h: number, s: number, v: number): string {
  const { r, g, b } = hsvToRgb(h, s, v);
  return rgbToHex(r, g, b);
}

function formatColor(hex: string, format: ColorPickerFormat): string {
  if (format === 'rgb') {
    const rgb = hexToRgb(hex);
    if (!rgb) {
      return hex;
    }
    return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
  }
  return hex.toLowerCase();
}

function parseColorInput(input: string): string | null {
  const trimmed = input.trim();

  // Hex
  if (/^#?[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(trimmed)) {
    const hex = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
    const rgb = hexToRgb(hex);
    if (rgb) {
      return rgbToHex(rgb.r, rgb.g, rgb.b);
    }
  }

  // RGB
  const rgbMatch = trimmed.match(/^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1], 10);
    const g = parseInt(rgbMatch[2], 10);
    const b = parseInt(rgbMatch[3], 10);
    if (r <= 255 && g <= 255 && b <= 255) {
      return rgbToHex(r, g, b);
    }
  }

  return null;
}

// --- Size styles ---

const sizeStyles: Record<ColorPickerSize, {
  trigger: string;
  swatch: string;
  label: string;
  canvasHeight: number;
  hueHeight: number;
}> = {
  sm: { trigger: 'h-8 w-8 rounded-lg', swatch: 'w-5 h-5', label: 'text-xs', canvasHeight: 120, hueHeight: 12 },
  md: { trigger: 'h-10 w-10 rounded-xl', swatch: 'w-6 h-6', label: 'text-sm', canvasHeight: 160, hueHeight: 14 },
  lg: { trigger: 'h-12 w-12 rounded-xl', swatch: 'w-7 h-7', label: 'text-sm', canvasHeight: 200, hueHeight: 16 },
};

// --- Sub-components ---

type SaturationCanvasProps = {
  hue: number;
  saturation: number;
  brightness: number;
  height: number;
  disabled: boolean;
  onChangeSV: (s: number, v: number) => void;
};

function SaturationCanvas({ hue, saturation, brightness, height, disabled, onChangeSV }: SaturationCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);

  const updateFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      const el = canvasRef.current;
      if (!el) {
        return;
      }
      const rect = el.getBoundingClientRect();
      const s = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const v = Math.max(0, Math.min(1, 1 - (clientY - rect.top) / rect.height));
      onChangeSV(s, v);
    },
    [onChangeSV],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (disabled) {
        return;
      }
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      updateFromPointer(e.clientX, e.clientY);
    },
    [disabled, updateFromPointer],
  );

  const [isDragging, setIsDragging] = useState(false);

  const handlePointerDownWrapped = useCallback(
    (e: React.PointerEvent) => {
      setIsDragging(true);
      handlePointerDown(e);
    },
    [handlePointerDown],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) {
        return;
      }
      updateFromPointer(e.clientX, e.clientY);
    },
    [isDragging, updateFromPointer],
  );

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const hueColor = `hsl(${hue}, 100%, 50%)`;

  return (
    <div
      ref={canvasRef}
      data-testid="saturation-canvas"
      className={[
        'relative w-full rounded-xl overflow-hidden cursor-crosshair select-none',
        disabled ? 'pointer-events-none opacity-50' : '',
      ].filter(Boolean).join(' ')}
      style={{ height }}
      onPointerDown={handlePointerDownWrapped}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Base hue layer */}
      <div className="absolute inset-0" style={{ backgroundColor: hueColor }} />
      {/* White-to-transparent horizontal gradient (saturation) */}
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(to right, #ffffff, transparent)' }}
      />
      {/* Transparent-to-black vertical gradient (brightness/value) */}
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(to bottom, transparent, #000000)' }}
      />
      {/* Pointer indicator */}
      <div
        className="absolute w-4 h-4 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.2),0_2px_4px_rgba(0,0,0,0.3)] pointer-events-none"
        style={{
          left: `${saturation * 100}%`,
          top: `${(1 - brightness) * 100}%`,
          transform: 'translate(-50%, -50%)',
        }}
      />
    </div>
  );
}

type HueSliderProps = {
  hue: number;
  height: number;
  disabled: boolean;
  onChangeHue: (h: number) => void;
};

function HueSlider({ hue, height, disabled, onChangeHue }: HueSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const updateFromPointer = useCallback(
    (clientX: number) => {
      const el = trackRef.current;
      if (!el) {
        return;
      }
      const rect = el.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      onChangeHue(Math.round(ratio * 360));
    },
    [onChangeHue],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (disabled) {
        return;
      }
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      setIsDragging(true);
      updateFromPointer(e.clientX);
    },
    [disabled, updateFromPointer],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) {
        return;
      }
      updateFromPointer(e.clientX);
    },
    [isDragging, updateFromPointer],
  );

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled) {
        return;
      }
      let next: number | undefined;
      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowUp':
          e.preventDefault();
          next = Math.min(360, hue + 1);
          break;
        case 'ArrowLeft':
        case 'ArrowDown':
          e.preventDefault();
          next = Math.max(0, hue - 1);
          break;
      }
      if (next !== undefined) {
        onChangeHue(next);
      }
    },
    [disabled, hue, onChangeHue],
  );

  return (
    <div
      ref={trackRef}
      data-testid="hue-slider"
      role="slider"
      tabIndex={disabled ? -1 : 0}
      aria-valuenow={hue}
      aria-valuemin={0}
      aria-valuemax={360}
      aria-label="Hue"
      className={[
        'relative w-full rounded-full cursor-pointer select-none',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2',
        disabled ? 'pointer-events-none opacity-50' : '',
      ].filter(Boolean).join(' ')}
      style={{
        height,
        background: 'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onKeyDown={handleKeyDown}
    >
      <div
        className="absolute top-1/2 w-4 h-4 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.2),0_2px_4px_rgba(0,0,0,0.3)] pointer-events-none"
        style={{
          left: `${(hue / 360) * 100}%`,
          transform: 'translate(-50%, -50%)',
        }}
      />
    </div>
  );
}

// --- Main component ---

export const ColorPicker = forwardRef<HTMLDivElement, ColorPickerProps>(function ColorPicker(
  {
    label,
    description,
    error,
    value: controlledValue,
    defaultValue,
    onChange,
    swatches,
    format = 'hex',
    size = 'md',
    disabled = false,
    className,
  },
  ref,
) {
  const isMobile = useIsMobile();
  const uid = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const isControlled = controlledValue !== undefined;
  const initialColor = (isControlled ? controlledValue : defaultValue) ?? '#000000';
  const initialHsv = hexToHsv(parseColorInput(initialColor) ?? '#000000');

  const [internalColor, setInternalColor] = useState(parseColorInput(initialColor) ?? '#000000');
  const [hsv, setHsv] = useState<HSV>(initialHsv);
  const [open, setOpen] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [position, setPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const currentColor = isControlled
    ? (parseColorInput(controlledValue) ?? '#000000')
    : internalColor;

  // Sync HSV when controlled value changes externally
  useEffect(() => {
    if (isControlled && controlledValue) {
      const parsed = parseColorInput(controlledValue);
      if (parsed) {
        setHsv(hexToHsv(parsed));
        setInternalColor(parsed);
      }
    }
  }, [isControlled, controlledValue]);

  // Sync text input when panel opens or color changes
  useEffect(() => {
    if (open) {
      setTextInput(formatColor(currentColor, format));
    }
  }, [open, currentColor, format]);

  const updateColor = useCallback(
    (newHsv: HSV) => {
      setHsv(newHsv);
      const hex = hsvToHex(newHsv.h, newHsv.s, newHsv.v);
      if (!isControlled) {
        setInternalColor(hex);
      }
      const output = formatColor(hex, format);
      setTextInput(output);
      onChange?.(output);
    },
    [isControlled, format, onChange],
  );

  const handleSVChange = useCallback(
    (s: number, v: number) => {
      updateColor({ h: hsv.h, s, v });
    },
    [hsv.h, updateColor],
  );

  const handleHueChange = useCallback(
    (h: number) => {
      updateColor({ ...hsv, h });
    },
    [hsv, updateColor],
  );

  const handleTextInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      setTextInput(raw);
    },
    [],
  );

  const handleTextInputBlur = useCallback(() => {
    const parsed = parseColorInput(textInput);
    if (parsed) {
      const newHsv = hexToHsv(parsed);
      setHsv(newHsv);
      if (!isControlled) {
        setInternalColor(parsed);
      }
      const output = formatColor(parsed, format);
      setTextInput(output);
      onChange?.(output);
    } else {
      // Reset to current color
      setTextInput(formatColor(currentColor, format));
    }
  }, [textInput, isControlled, format, onChange, currentColor]);

  const handleTextInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        handleTextInputBlur();
      }
    },
    [handleTextInputBlur],
  );

  const handleSwatchClick = useCallback(
    (color: string) => {
      const parsed = parseColorInput(color);
      if (!parsed) {
        return;
      }
      const newHsv = hexToHsv(parsed);
      setHsv(newHsv);
      if (!isControlled) {
        setInternalColor(parsed);
      }
      const output = formatColor(parsed, format);
      setTextInput(output);
      onChange?.(output);
    },
    [isControlled, format, onChange],
  );

  // Position panel below trigger (desktop)
  const updatePosition = useCallback(() => {
    const triggerEl = triggerRef.current;
    const panelEl = panelRef.current;
    if (!triggerEl || !panelEl) {
      return;
    }

    const triggerRect = triggerEl.getBoundingClientRect();
    const panelRect = panelEl.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let top = triggerRect.bottom + 8;
    let left = triggerRect.left;

    // Flip up if not enough space below
    if (top + panelRect.height > vh - 8) {
      top = triggerRect.top - panelRect.height - 8;
    }
    // Clamp horizontally
    left = Math.max(8, Math.min(left, vw - panelRect.width - 8));
    // Clamp vertically
    top = Math.max(8, Math.min(top, vh - panelRect.height - 8));

    setPosition({ top, left });
  }, []);

  useEffect(() => {
    if (!open || isMobile) {
      return;
    }
    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [open, isMobile, updatePosition]);

  // Close on click outside / Escape
  useEffect(() => {
    if (!open) {
      return;
    }

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (panelRef.current?.contains(target) || triggerRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  const handleToggle = () => {
    if (disabled) {
      return;
    }
    setOpen((prev) => !prev);
  };

  const s = sizeStyles[size];
  const hasError = !!error;
  const labelId = label ? `${uid}-label` : undefined;

  const panelContent = (
    <div className="flex flex-col gap-3" data-testid="colorpicker-panel">
      <SaturationCanvas
        hue={hsv.h}
        saturation={hsv.s}
        brightness={hsv.v}
        height={s.canvasHeight}
        disabled={disabled}
        onChangeSV={handleSVChange}
      />

      <HueSlider
        hue={hsv.h}
        height={s.hueHeight}
        disabled={disabled}
        onChangeHue={handleHueChange}
      />

      {/* Preview + Text input row */}
      <div className="flex items-center gap-3">
        <div
          data-testid="color-preview"
          className="w-8 h-8 rounded-lg shrink-0 border border-surface-border"
          style={{ backgroundColor: currentColor }}
        />
        <input
          data-testid="color-text-input"
          type="text"
          value={textInput}
          onChange={handleTextInputChange}
          onBlur={handleTextInputBlur}
          onKeyDown={handleTextInputKeyDown}
          disabled={disabled}
          className={[
            'flex-1 h-8 px-3 text-xs rounded-lg bg-surface border font-mono',
            'outline-none transition-all duration-200',
            'border-input-border focus:ring-2 focus:ring-primary/50 focus:border-primary',
            'text-text placeholder:text-text-muted',
            disabled ? 'opacity-50 cursor-not-allowed' : '',
          ].filter(Boolean).join(' ')}
          aria-label="Color value"
        />
      </div>

      {/* Swatches grid */}
      {swatches && swatches.length > 0 && (
        <div className="flex flex-wrap gap-1.5" data-testid="swatches-grid">
          {swatches.map((sw) => (
            <button
              key={sw}
              type="button"
              disabled={disabled}
              onClick={() => handleSwatchClick(sw)}
              className={[
                'rounded-lg border border-surface-border transition-transform duration-150',
                'hover:scale-110 active:scale-95',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
                s.swatch,
              ].filter(Boolean).join(' ')}
              style={{ backgroundColor: sw }}
              aria-label={`Select color ${sw}`}
            />
          ))}
        </div>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <div ref={ref} className={['w-full', className].filter(Boolean).join(' ')}>
        {label && (
          <label id={labelId} className={['block font-medium text-text-secondary mb-1.5', s.label].join(' ')}>
            {label}
          </label>
        )}
        {description && (
          <p className="text-xs text-text-tertiary mb-1.5">{description}</p>
        )}

        <button
          ref={triggerRef}
          type="button"
          disabled={disabled}
          onClick={handleToggle}
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-labelledby={labelId}
          className={[
            'border border-input-border shadow-sm transition-all duration-200',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2',
            hasError ? 'ring-2 ring-danger/30 border-danger' : '',
            disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-md active:scale-95',
            s.trigger,
          ].filter(Boolean).join(' ')}
          style={{ backgroundColor: currentColor }}
          data-testid="colorpicker-trigger"
        />

        {error && (
          <p className="mt-1.5 text-xs text-danger">{error}</p>
        )}

        {open && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/30"
              onClick={() => setOpen(false)}
              aria-hidden="true"
              style={{ animation: 'colorpicker-backdrop-in 150ms ease-out both' }}
            />
            <div
              ref={panelRef}
              role="dialog"
              aria-label="Color picker"
              className={[
                'fixed inset-x-0 bottom-0 z-50 rounded-t-2xl bg-surface p-5',
                'shadow-[0_-8px_40px_-8px_rgba(0,0,0,0.2)]',
                'max-h-[80vh] overflow-y-auto',
              ].join(' ')}
              style={{
                animation: 'colorpicker-sheet-in 250ms cubic-bezier(0.16, 1, 0.3, 1) both',
                paddingBottom: 'env(safe-area-inset-bottom, 20px)',
              }}
            >
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-surface-border" aria-hidden="true" />
              {panelContent}
            </div>
          </>
        )}
        <style>{colorPickerKeyframes}</style>
      </div>
    );
  }

  return (
    <div ref={ref} className={['w-full', className].filter(Boolean).join(' ')}>
      {label && (
        <label id={labelId} className={['block font-medium text-text-secondary mb-1.5', s.label].join(' ')}>
          {label}
        </label>
      )}
      {description && (
        <p className="text-xs text-text-tertiary mb-1.5">{description}</p>
      )}

      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-labelledby={labelId}
        className={[
          'border border-input-border shadow-sm transition-all duration-200',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2',
          hasError ? 'ring-2 ring-danger/30 border-danger' : '',
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-md active:scale-95',
          s.trigger,
        ].filter(Boolean).join(' ')}
        style={{ backgroundColor: currentColor }}
        data-testid="colorpicker-trigger"
      />

      {error && (
        <p className="mt-1.5 text-xs text-danger">{error}</p>
      )}

      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Color picker"
          className={[
            'fixed z-50 rounded-2xl bg-surface p-4 w-64',
            'shadow-[0_4px_24px_-4px_rgba(0,0,0,0.12),0_0_0_1px_rgba(0,0,0,0.05)]',
            'ring-1 ring-surface-border/50',
          ].join(' ')}
          style={{
            top: position.top,
            left: position.left,
            animation: 'colorpicker-panel-in 200ms cubic-bezier(0.34, 1.56, 0.64, 1) both',
          }}
        >
          {panelContent}
        </div>
      )}
      <style>{colorPickerKeyframes}</style>
    </div>
  );
});

ColorPicker.displayName = 'ColorPicker';

const colorPickerKeyframes = `
  @keyframes colorpicker-panel-in {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
  }
  @keyframes colorpicker-backdrop-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes colorpicker-sheet-in {
    from { transform: translateY(100%); }
    to { transform: translateY(0); }
  }
`;
