import type {
  ReactNode,
  InputHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';

// @coupling consumed by PlatformsSection and ProductionHousesSection via direct import of INPUT_CLASSES
// ── Class constants (use directly when custom rendering is needed) ──

const LABEL_CLASSES = {
  default: 'block text-sm text-on-surface-muted mb-1',
  compact: 'block text-xs text-on-surface-subtle mb-1',
  bordered: 'block text-sm font-medium text-on-surface-muted',
} as const;

const INPUT_CLASSES = {
  default:
    'w-full bg-input rounded-xl px-4 py-3 text-on-surface outline-none focus:ring-2 focus:ring-red-600',
  compact:
    'w-full bg-input rounded-lg px-3 py-2 text-on-surface text-sm outline-none focus:ring-2 focus:ring-red-600',
  bordered:
    'w-full bg-input border border-outline rounded-lg px-4 py-2.5 text-on-surface placeholder:text-on-surface-disabled focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent',
} as const;

const TEXTAREA_CLASSES = {
  default:
    'w-full bg-input rounded-xl px-4 py-3 text-on-surface outline-none focus:ring-2 focus:ring-red-600 resize-none',
  compact:
    'w-full bg-input rounded-lg px-3 py-2 text-on-surface text-sm outline-none focus:ring-2 focus:ring-red-600 resize-none',
  bordered:
    'w-full bg-input border border-outline rounded-lg px-4 py-2.5 text-on-surface placeholder:text-on-surface-disabled focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent resize-none',
} as const;

export { LABEL_CLASSES, INPUT_CLASSES, TEXTAREA_CLASSES };

export type FormFieldVariant = 'default' | 'compact' | 'bordered';

// ── FormField wrapper (label + children) ──

export interface FormFieldProps {
  label: string;
  required?: boolean;
  variant?: FormFieldVariant;
  className?: string;
  children: ReactNode;
}

export function FormField({
  label,
  required,
  variant = 'default',
  className,
  children,
}: FormFieldProps) {
  return (
    <div className={className}>
      <label className={LABEL_CLASSES[variant]}>
        {label}
        {required ? ' *' : ''}
      </label>
      {children}
    </div>
  );
}

// ── FormInput (label + <input>) ──

// @contract wraps native input; excludes onChange (replaced by onValueChange) and className (variant-driven)
export interface FormInputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'onChange' | 'className'
> {
  label: string;
  variant?: FormFieldVariant;
  wrapperClassName?: string;
  onValueChange: (value: string) => void;
}

export function FormInput({
  label,
  variant = 'default',
  wrapperClassName,
  onValueChange,
  required,
  ...inputProps
}: FormInputProps) {
  return (
    <FormField label={label} required={required} variant={variant} className={wrapperClassName}>
      <input
        {...inputProps}
        required={required}
        onChange={(e) => onValueChange(e.target.value)}
        className={INPUT_CLASSES[variant]}
      />
    </FormField>
  );
}

// ── FormSelect (label + <select>) ──

export interface FormSelectOption {
  value: string;
  label: string;
}

// @contract wraps native select; options rendered from FormSelectOption[]; onChange replaced by onValueChange
export interface FormSelectProps extends Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  'onChange' | 'className'
> {
  label: string;
  variant?: FormFieldVariant;
  wrapperClassName?: string;
  options: FormSelectOption[];
  onValueChange: (value: string) => void;
  placeholder?: string;
}

export function FormSelect({
  label,
  variant = 'default',
  wrapperClassName,
  options,
  onValueChange,
  placeholder,
  required,
  ...selectProps
}: FormSelectProps) {
  return (
    <FormField label={label} required={required} variant={variant} className={wrapperClassName}>
      <select
        {...selectProps}
        required={required}
        onChange={(e) => onValueChange(e.target.value)}
        className={INPUT_CLASSES[variant]}
      >
        {/* @nullable placeholder — when provided, renders a disabled-looking empty option */}
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </FormField>
  );
}

// @invariant all form primitives share the same variant system (default/compact/bordered)
// ── FormTextarea (label + <textarea>) ──

export interface FormTextareaProps extends Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  'onChange' | 'className'
> {
  label: string;
  variant?: FormFieldVariant;
  wrapperClassName?: string;
  onValueChange: (value: string) => void;
}

export function FormTextarea({
  label,
  variant = 'default',
  wrapperClassName,
  onValueChange,
  required,
  ...textareaProps
}: FormTextareaProps) {
  return (
    <FormField label={label} required={required} variant={variant} className={wrapperClassName}>
      <textarea
        {...textareaProps}
        required={required}
        onChange={(e) => onValueChange(e.target.value)}
        className={TEXTAREA_CLASSES[variant]}
      />
    </FormField>
  );
}
