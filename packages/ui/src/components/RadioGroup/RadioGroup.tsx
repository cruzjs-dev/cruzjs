import React, { forwardRef, useCallback, useState } from 'react';

export type RadioGroupSize = 'sm' | 'md' | 'lg';
export type RadioGroupColor = 'primary' | 'success' | 'danger';

export type RadioGroupProps = Omit<React.HTMLAttributes<HTMLFieldSetElement>, 'onChange'> & {
  name: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  label?: React.ReactNode;
  description?: string;
  error?: string;
  size?: RadioGroupSize;
  color?: RadioGroupColor;
  orientation?: 'vertical' | 'horizontal';
  disabled?: boolean;
  children: React.ReactNode;
};

export type RadioProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> & {
  value: string;
  label?: React.ReactNode;
  description?: string;
};

type RadioGroupContextType = {
  name: string;
  value: string;
  onChange: (value: string) => void;
  size: RadioGroupSize;
  color: RadioGroupColor;
  disabled: boolean;
};

const RadioGroupContext = React.createContext<RadioGroupContextType | null>(null);

const sizeStyles: Record<RadioGroupSize, { radio: string; dot: string; label: string; desc: string }> = {
  sm: { radio: 'w-4 h-4', dot: 'w-1.5 h-1.5', label: 'text-sm', desc: 'text-xs' },
  md: { radio: 'w-5 h-5', dot: 'w-2 h-2', label: 'text-sm', desc: 'text-xs' },
  lg: { radio: 'w-6 h-6', dot: 'w-2.5 h-2.5', label: 'text-base', desc: 'text-sm' },
};

const colorStyles: Record<RadioGroupColor, { checked: string; ring: string }> = {
  primary: { checked: 'border-primary bg-primary', ring: 'ring-primary/50' },
  success: { checked: 'border-success bg-success', ring: 'ring-success/50' },
  danger: { checked: 'border-danger bg-danger', ring: 'ring-danger/50' },
};

export const RadioGroup = forwardRef<HTMLFieldSetElement, RadioGroupProps>(function RadioGroup(
  {
    name,
    value: controlledValue,
    defaultValue = '',
    onChange: onChangeProp,
    label,
    description,
    error,
    size = 'md',
    color = 'primary',
    orientation = 'vertical',
    disabled = false,
    children,
    className,
    ...rest
  },
  ref,
) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : internalValue;

  const onChange = useCallback(
    (v: string) => {
      if (!isControlled) setInternalValue(v);
      onChangeProp?.(v);
    },
    [isControlled, onChangeProp],
  );

  return (
    <RadioGroupContext.Provider value={{ name, value, onChange, size, color, disabled }}>
      <fieldset
        ref={ref}
        className={['border-none p-0 m-0', className].filter(Boolean).join(' ')}
        disabled={disabled}
        {...rest}
      >
        {label && (
          <legend className="text-sm font-medium text-text-strong mb-1">{label}</legend>
        )}
        {description && (
          <p className="text-xs text-text-tertiary mb-3">{description}</p>
        )}
        <div
          className={[
            orientation === 'horizontal' ? 'flex flex-wrap gap-4' : 'flex flex-col gap-3',
          ].join(' ')}
          role="radiogroup"
        >
          {children}
        </div>
        {error && (
          <p className="mt-2 text-xs text-danger">{error}</p>
        )}
      </fieldset>
    </RadioGroupContext.Provider>
  );
});

RadioGroup.displayName = 'RadioGroup';

export const Radio = forwardRef<HTMLInputElement, RadioProps>(function Radio(
  { value, label, description, disabled: itemDisabled, className, ...rest },
  ref,
) {
  const ctx = React.useContext(RadioGroupContext);
  if (!ctx) throw new Error('Radio must be used within a RadioGroup');

  const { name, value: groupValue, onChange, size, color, disabled: groupDisabled } = ctx;
  const isChecked = groupValue === value;
  const isDisabled = groupDisabled || itemDisabled;
  const s = sizeStyles[size];
  const c = colorStyles[color];

  return (
    <label
      className={[
        'flex items-start gap-2.5 cursor-pointer',
        isDisabled ? 'opacity-50 cursor-not-allowed' : '',
        className,
      ].filter(Boolean).join(' ')}
    >
      <span className="relative flex items-center justify-center shrink-0 mt-0.5">
        <input
          ref={ref}
          type="radio"
          name={name}
          value={value}
          checked={isChecked}
          disabled={isDisabled}
          onChange={() => onChange(value)}
          className="sr-only peer"
          {...rest}
        />
        <span
          className={[
            s.radio,
            'rounded-full border-2 transition-all duration-200',
            isChecked
              ? [c.checked, 'shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]'].join(' ')
              : 'border-input-border bg-surface hover:border-text-muted',
            'peer-focus-visible:ring-2 peer-focus-visible:ring-offset-2',
            isChecked ? `peer-focus-visible:${c.ring}` : 'peer-focus-visible:ring-primary/50',
            'flex items-center justify-center',
          ].join(' ')}
          style={{
            transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        >
          <span
            className={[
              s.dot,
              'rounded-full bg-white transition-transform duration-200',
              isChecked ? 'scale-100' : 'scale-0',
            ].join(' ')}
            style={{
              transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          />
        </span>
      </span>
      {(label || description) && (
        <span className="flex flex-col">
          {label && <span className={[s.label, 'text-text-strong'].join(' ')}>{label}</span>}
          {description && <span className={[s.desc, 'text-text-tertiary mt-0.5'].join(' ')}>{description}</span>}
        </span>
      )}
    </label>
  );
});

Radio.displayName = 'Radio';
