import React, { forwardRef, useId, useMemo } from 'react';

export type FormFieldSize = 'sm' | 'md' | 'lg';

export type FormFieldProps = React.HTMLAttributes<HTMLDivElement> & {
  /** Label rendered above the input slot. */
  label?: React.ReactNode;
  /** Explicit `for` attribute on the label. When omitted a stable id is generated. */
  htmlFor?: string;
  /** Helper text shown below the input (hidden when `error` is present). */
  description?: string;
  /** Validation error message displayed below the input. */
  error?: string;
  /** Shows a required indicator (asterisk) next to the label. */
  required?: boolean;
  /** Controls label and helper text sizing. */
  size?: FormFieldSize;
  /** The input element(s) rendered inside the field. */
  children: React.ReactNode;
};

const sizeStyles: Record<FormFieldSize, { label: string; helper: string }> = {
  sm: { label: 'text-xs', helper: 'text-xs' },
  md: { label: 'text-sm', helper: 'text-xs' },
  lg: { label: 'text-sm', helper: 'text-sm' },
};

export const FormField = forwardRef<HTMLDivElement, FormFieldProps>(function FormField(
  {
    label,
    htmlFor,
    description,
    error,
    required = false,
    size = 'md',
    children,
    className,
    ...rest
  },
  ref,
) {
  const generatedId = useId();
  const fieldId = htmlFor || generatedId;
  const errorId = `${fieldId}-error`;
  const descriptionId = `${fieldId}-description`;
  const hasError = !!error;
  const s = sizeStyles[size];

  const describedBy = useMemo(() => {
    const parts: string[] = [];
    if (hasError) parts.push(errorId);
    if (description && !hasError) parts.push(descriptionId);
    return parts.length > 0 ? parts.join(' ') : undefined;
  }, [hasError, errorId, description, descriptionId]);

  return (
    <div
      ref={ref}
      className={['w-full', className].filter(Boolean).join(' ')}
      data-error={hasError || undefined}
      {...rest}
    >
      {label && (
        <label
          htmlFor={fieldId}
          className={['block font-medium text-text-secondary mb-1.5', s.label].join(' ')}
        >
          {label}
          {required && (
            <span className="text-danger ml-0.5" aria-hidden="true">*</span>
          )}
        </label>
      )}

      {typeof children === 'function'
        ? (children as (props: { id: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean }) => React.ReactNode)({
            id: fieldId,
            'aria-describedby': describedBy,
            'aria-invalid': hasError || undefined,
          })
        : children}

      {description && !hasError && (
        <p id={descriptionId} className={['text-text-tertiary mt-1.5', s.helper].join(' ')}>
          {description}
        </p>
      )}

      {hasError && (
        <p id={errorId} role="alert" className={['text-danger mt-1.5', s.helper].join(' ')}>
          {error}
        </p>
      )}
    </div>
  );
});

FormField.displayName = 'FormField';
