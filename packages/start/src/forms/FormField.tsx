/**
 * FormField -- form field component with label, input, and error message.
 *
 * Integrates with `useCruzForm`'s `register()` output:
 * ```tsx
 * <FormField label="Email" type="email" {...form.register('email')} error={form.errors.email} />
 * ```
 *
 * Supports input types: text, email, password, number, textarea.
 */

import React from 'react';

export type FormFieldInputType = 'text' | 'email' | 'password' | 'number' | 'textarea';

export interface FormFieldProps {
  /** Field label displayed above the input. */
  label: string;
  /** Input element name (from register). */
  name: string;
  /** Current field value (from register). */
  value?: string;
  /** Change handler (from register). */
  onChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  /** Blur handler (from register). */
  onBlur?: () => void;
  /** Validation error message to display below the input. */
  error?: string;
  /** Input type. Default: `'text'`. */
  type?: FormFieldInputType;
  /** Placeholder text. */
  placeholder?: string;
  /** Whether the field is required (shows asterisk on label). */
  isRequired?: boolean;
  /** Whether the field is disabled. */
  isDisabled?: boolean;
  /** Number of rows for textarea type. Default: 3. */
  rows?: number;
  /** Optional helper text displayed below the input when there is no error. */
  helperText?: string;
}

const inputClasses =
  'w-full rounded-lg border border-surface-border bg-surface px-4 py-2.5 text-text-strong placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors';

const inputErrorClasses =
  'w-full rounded-lg border border-red-400 bg-surface px-4 py-2.5 text-text-strong placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-500 transition-colors';

const FormField: React.FC<FormFieldProps> = ({
  label,
  name,
  value,
  onChange,
  onBlur,
  error,
  type = 'text',
  placeholder,
  isRequired = false,
  isDisabled = false,
  rows = 3,
  helperText,
}) => {
  const isInvalid = !!error;
  const fieldClasses = isInvalid ? inputErrorClasses : inputClasses;

  return (
    <div className={isDisabled ? 'opacity-60' : ''}>
      <label htmlFor={name} className="block text-sm font-medium text-text-strong mb-1.5">
        {label}
        {isRequired && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {type === 'textarea' ? (
        <textarea
          id={name}
          name={name}
          value={value ?? ''}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          rows={rows}
          disabled={isDisabled}
          className={fieldClasses}
        />
      ) : (
        <input
          id={name}
          name={name}
          type={type}
          value={value ?? ''}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          disabled={isDisabled}
          className={fieldClasses}
        />
      )}
      {isInvalid && (
        <p className="text-sm text-red-600 mt-1">{error}</p>
      )}
      {!isInvalid && helperText && (
        <p className="text-sm text-text-muted mt-1">{helperText}</p>
      )}
    </div>
  );
};

export { FormField };
