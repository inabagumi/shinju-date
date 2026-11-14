import { Input, Textarea } from '@shinju-date/ui'
import { twMerge } from 'tailwind-merge'

function getErrorId(inputId: string | undefined): string | undefined {
  return inputId ? `${inputId}-error` : undefined
}

interface FieldLabelProps {
  htmlFor: string | undefined
  label: string
  required: boolean | undefined
}

function FieldLabel({ htmlFor, label, required }: FieldLabelProps) {
  return (
    <label
      className="mb-2 block text-sm font-medium text-primary dark:text-774-nevy-50"
      htmlFor={htmlFor}
    >
      {label}{' '}
      {required && (
        <span aria-hidden="true" className="text-red-500">
          *
        </span>
      )}
    </label>
  )
}

interface FieldErrorProps {
  error: string | undefined
  id: string | undefined
}

function FieldError({ error, id }: FieldErrorProps) {
  if (!error) {
    return null
  }

  return (
    <p className="mt-1 text-sm text-red-500" id={id}>
      {error}
    </p>
  )
}

interface InputFieldProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string
  required?: boolean
  error?: string | undefined
}

export function InputField({
  label,
  required,
  error,
  className,
  id,
  ref,
  ...props
}: InputFieldProps & { ref?: React.Ref<HTMLInputElement> }) {
  const inputId = id || props.name
  const errorId = error ? getErrorId(inputId) : undefined

  return (
    <div>
      {label && (
        <FieldLabel htmlFor={inputId} label={label} required={required} />
      )}
      <Input
        {...props}
        aria-describedby={errorId}
        aria-invalid={error ? true : undefined}
        className={twMerge(
          'rounded-lg py-3 placeholder:text-774-nevy-400 dark:placeholder:text-774-nevy-400',
          !error &&
            'border-774-nevy-300 focus:border-secondary-blue focus:ring-secondary-blue/20 dark:border-zinc-600',
          className,
        )}
        id={inputId}
        inputSize="lg"
        ref={ref}
        required={required}
        variant={error ? 'error' : 'default'}
      />
      <FieldError error={error} id={errorId} />
    </div>
  )
}

interface TextareaFieldProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  required?: boolean
  error?: string | undefined
}

export function TextareaField({
  label,
  required,
  error,
  className,
  id,
  ref,
  ...props
}: TextareaFieldProps & { ref?: React.Ref<HTMLTextAreaElement> }) {
  const inputId = id || props.name
  const errorId = error ? getErrorId(inputId) : undefined

  return (
    <div>
      {label && (
        <FieldLabel htmlFor={inputId} label={label} required={required} />
      )}
      <Textarea
        {...props}
        aria-describedby={errorId}
        aria-invalid={error ? true : undefined}
        className={twMerge(
          'rounded-lg px-4 py-3 placeholder:text-774-nevy-400 dark:placeholder:text-774-nevy-400',
          !error &&
            'border-774-nevy-300 focus:border-secondary-blue focus:ring-secondary-blue/20 dark:border-zinc-600',
          className,
        )}
        id={inputId}
        ref={ref}
        required={required}
        variant={error ? 'error' : 'default'}
      />
      <FieldError error={error} id={errorId} />
    </div>
  )
}

interface SelectFieldProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  required?: boolean
  error?: string | undefined
  children: React.ReactNode
}

export function SelectField({
  label,
  required,
  error,
  className,
  id,
  children,
  ref,
  ...props
}: SelectFieldProps & { ref?: React.Ref<HTMLSelectElement> }) {
  const inputId = id || props.name
  const errorId = error ? getErrorId(inputId) : undefined

  return (
    <div>
      {label && (
        <FieldLabel htmlFor={inputId} label={label} required={required} />
      )}
      <select
        {...props}
        aria-describedby={errorId}
        aria-invalid={error ? true : undefined}
        className={twMerge(
          'w-full rounded-lg border bg-white px-4 py-3 text-primary focus:ring-2 focus:outline-none dark:bg-zinc-800 dark:text-774-nevy-50',
          error
            ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
            : 'border-774-nevy-300 focus:border-secondary-blue focus:ring-secondary-blue/20 dark:border-zinc-600',
          className,
        )}
        id={inputId}
        ref={ref}
        required={required}
      >
        {children}
      </select>
      <FieldError error={error} id={errorId} />
    </div>
  )
}

interface CheckboxFieldProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label: React.ReactNode
  error?: string | undefined
}

export function CheckboxField({
  label,
  error,
  className,
  id,
  ...props
}: CheckboxFieldProps) {
  const inputId = id || props.name
  const errorId = error ? getErrorId(inputId) : undefined

  return (
    <div>
      <label className="flex items-center gap-3">
        <input
          {...props}
          aria-describedby={errorId}
          aria-invalid={error ? true : undefined}
          className={twMerge(
            'h-4 w-4 rounded border-774-nevy-300 text-secondary-blue focus:ring-secondary-blue/20 dark:border-zinc-600',
            className,
          )}
          id={inputId}
          type="checkbox"
        />
        <span className="text-sm text-primary dark:text-774-nevy-50">
          {label}
        </span>
      </label>
      <FieldError error={error} id={errorId} />
    </div>
  )
}
