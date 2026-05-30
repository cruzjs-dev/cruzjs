/**
 * useCruzForm — Lightweight form state manager with Zod validation.
 *
 * Provides a simple, framework-agnostic form hook that handles:
 *   - Field state tracking (values, errors, touched)
 *   - Zod schema validation (on submit, with per-field error mapping)
 *   - Submission state (isSubmitting, isSubmitted)
 *   - Success/error callbacks
 *
 * Does NOT depend on react-hook-form. If you need advanced features
 * (field arrays, watch, unregister), consider adding react-hook-form
 * to your project and using it directly with zodResolver.
 *
 * @example
 * ```typescript
 * const form = useCruzForm({
 *   schema: createTaskSchema,
 *   defaultValues: { title: '', description: '' },
 *   onSubmit: async (data) => {
 *     await trpc.tasks.create.mutate(data);
 *   },
 *   onSuccess: () => toast({ title: 'Task created!' }),
 * });
 *
 * <form onSubmit={form.handleSubmit}>
 *   <FormField label="Title" {...form.register('title')} error={form.errors.title} />
 *   <Button type="submit" isLoading={form.isSubmitting}>Create</Button>
 * </form>
 * ```
 */

import { useState, useCallback, useRef } from 'react';
import type { z, ZodTypeAny } from 'zod';

export interface CruzFormRegister {
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onBlur: () => void;
}

export interface CruzFormReturn<T extends ZodTypeAny> {
  /** Current form values. */
  values: Partial<z.infer<T>>;
  /** Per-field error messages (keyed by field name). */
  errors: Record<string, string | undefined>;
  /** Per-field touched state. */
  touched: Record<string, boolean>;
  /** Whether the form is currently submitting. */
  isSubmitting: boolean;
  /** Whether the form has been submitted at least once. */
  isSubmitted: boolean;
  /** Set a single field value programmatically. */
  setValue: (name: string, value: unknown) => void;
  /** Set all values at once (merge with existing). */
  setValues: (values: Partial<z.infer<T>>) => void;
  /** Set a field error manually. */
  setError: (name: string, message: string) => void;
  /** Clear all errors. */
  clearErrors: () => void;
  /** Reset form to default values. */
  reset: () => void;
  /**
   * Register a field for controlled input binding.
   * Returns `{ name, value, onChange, onBlur }` compatible with Chakra UI inputs.
   */
  register: (name: string) => CruzFormRegister;
  /** Form submit handler — pass to `<form onSubmit={handleSubmit}>`. */
  handleSubmit: (e?: React.FormEvent) => Promise<void>;
}

export interface UseCruzFormOptions<T extends ZodTypeAny> {
  /** Zod schema used for validation on submit. */
  schema: T;
  /** Initial field values. */
  defaultValues?: Partial<z.infer<T>>;
  /** Async function called with validated data on submit. */
  onSubmit: (data: z.infer<T>) => Promise<void>;
  /** Called after successful submission. */
  onSuccess?: () => void;
  /** Called when onSubmit throws. */
  onError?: (error: Error) => void;
}

export function useCruzForm<T extends ZodTypeAny>({
  schema,
  defaultValues,
  onSubmit,
  onSuccess,
  onError,
}: UseCruzFormOptions<T>): CruzFormReturn<T> {
  type FormValues = Partial<z.infer<T>>;

  const defaults = useRef<FormValues>(defaultValues ?? ({} as FormValues));
  const [values, setValuesState] = useState<FormValues>({ ...defaults.current });
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const setValue = useCallback((name: string, value: unknown) => {
    setValuesState((prev) => ({ ...prev, [name]: value }));
    // Clear the error for this field when the user changes it
    setErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }, []);

  const setValues = useCallback((newValues: FormValues) => {
    setValuesState((prev) => ({ ...prev, ...newValues }));
  }, []);

  const setError = useCallback((name: string, message: string) => {
    setErrors((prev) => ({ ...prev, [name]: message }));
  }, []);

  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  const reset = useCallback(() => {
    setValuesState({ ...defaults.current });
    setErrors({});
    setTouched({});
    setIsSubmitted(false);
  }, []);

  const register = useCallback(
    (name: string): CruzFormRegister => ({
      name,
      value: String((values as Record<string, unknown>)[name] ?? ''),
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const inputValue =
          e.target.type === 'number'
            ? e.target.value === '' ? '' : Number(e.target.value)
            : e.target.value;
        setValue(name, inputValue);
      },
      onBlur: () => {
        setTouched((prev) => ({ ...prev, [name]: true }));
      },
    }),
    [values, setValue],
  );

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      setIsSubmitted(true);
      setErrors({});

      // Validate with Zod
      const result = schema.safeParse(values);
      if (!result.success) {
        const fieldErrors: Record<string, string> = {};
        for (const issue of result.error.issues) {
          const key = issue.path.join('.');
          if (!fieldErrors[key]) {
            fieldErrors[key] = issue.message;
          }
        }
        setErrors(fieldErrors);
        return;
      }

      setIsSubmitting(true);
      try {
        await onSubmit(result.data);
        onSuccess?.();
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        onError?.(error);
      } finally {
        setIsSubmitting(false);
      }
    },
    [schema, values, onSubmit, onSuccess, onError],
  );

  return {
    values,
    errors,
    touched,
    isSubmitting,
    isSubmitted,
    setValue,
    setValues,
    setError,
    clearErrors,
    reset,
    register,
    handleSubmit,
  };
}
