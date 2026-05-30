import React, { forwardRef } from 'react';

export type ParameterFieldProps = React.HTMLAttributes<HTMLDivElement> & {
  /** Parameter name displayed in monospace bold. */
  name: string;
  /** Type annotation displayed in monospace muted text. */
  type?: string;
  /** Whether this parameter is required. Shows a badge accordingly. */
  required?: boolean;
  /** Description text or rich content for the parameter. */
  description?: React.ReactNode;
  /** Default value displayed when provided. */
  defaultValue?: string;
  /** Marks the parameter as deprecated with strikethrough and warning badge. */
  deprecated?: boolean;
  /** Nested parameter fields rendered as children. */
  children?: React.ReactNode;
};

export type ParameterFieldGroupProps = React.HTMLAttributes<HTMLDivElement> & {
  /** Optional title displayed above the group of parameter fields. */
  title?: string;
  children: React.ReactNode;
};

export const ParameterField = forwardRef<HTMLDivElement, ParameterFieldProps>(
  function ParameterField(
    {
      name,
      type,
      required = false,
      description,
      defaultValue,
      deprecated = false,
      children,
      className,
      ...rest
    },
    ref,
  ) {
    return (
      <div
        ref={ref}
        className={[
          'border-b border-surface-border py-3',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...rest}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={[
              'font-mono font-semibold text-text',
              deprecated && 'line-through',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {name}
          </span>

          {type && (
            <span className="font-mono text-sm text-text-tertiary">
              {type}
            </span>
          )}

          {required ? (
            <span className="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium bg-danger-subtle text-danger">
              required
            </span>
          ) : (
            <span className="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium bg-surface-lighter text-text-muted">
              optional
            </span>
          )}

          {deprecated && (
            <span className="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium bg-warning-subtle text-warning-text">
              deprecated
            </span>
          )}
        </div>

        {description && (
          <div className="mt-1 text-sm text-text-secondary">
            {description}
          </div>
        )}

        {defaultValue !== undefined && (
          <div className="mt-1 text-sm text-text-tertiary">
            Default: <code className="font-mono text-text-secondary">{defaultValue}</code>
          </div>
        )}

        {children && (
          <div className="mt-2 ml-4 pl-3 border-l border-surface-border">
            {children}
          </div>
        )}
      </div>
    );
  },
);

ParameterField.displayName = 'ParameterField';

export const ParameterFieldGroup = forwardRef<HTMLDivElement, ParameterFieldGroupProps>(
  function ParameterFieldGroup(
    { title, children, className, ...rest },
    ref,
  ) {
    return (
      <div
        ref={ref}
        className={['w-full', className].filter(Boolean).join(' ')}
        {...rest}
      >
        {title && (
          <h3 className="text-sm font-semibold text-text-secondary mb-2">
            {title}
          </h3>
        )}
        <div>{children}</div>
      </div>
    );
  },
);

ParameterFieldGroup.displayName = 'ParameterFieldGroup';
