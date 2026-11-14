import { Input, Select, Textarea, twMerge } from '@shinju-date/ui'

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
      className="mb-2 block text-meta font-semibold text-foreground"
      htmlFor={htmlFor}
    >
      {label}{' '}
      {required && (
        <span aria-hidden="true" className="text-danger">
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
    <p className="mt-1 text-meta text-danger" id={id}>
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
        className={className}
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
        className={twMerge('px-4 py-3', className)}
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
      <Select
        {...props}
        aria-describedby={errorId}
        aria-invalid={error ? true : undefined}
        className={className}
        id={inputId}
        inputSize="lg"
        ref={ref}
        required={required}
        variant={error ? 'error' : 'default'}
      >
        {children}
      </Select>
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
            'size-4 accent-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
            className,
          )}
          id={inputId}
          type="checkbox"
        />
        <span className="text-meta text-foreground">{label}</span>
      </label>
      <FieldError error={error} id={errorId} />
    </div>
  )
}
