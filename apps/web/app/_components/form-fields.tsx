import { twMerge } from 'tailwind-merge'

interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  required?: boolean
  error?: string
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

  return (
    <div>
      {label && (
        <label
          className="mb-2 block font-medium text-primary text-sm dark:text-774-nevy-50"
          htmlFor={inputId}
        >
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <input
        className={twMerge(
          'w-full rounded-lg border border-774-nevy-300 bg-white px-4 py-3 text-primary placeholder:text-774-nevy-400 focus:border-secondary-blue focus:outline-none focus:ring-2 focus:ring-secondary-blue/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-774-nevy-50 dark:placeholder:text-774-nevy-400',
          className,
        )}
        id={inputId}
        ref={ref}
        {...props}
      />
      {error && <p className="mt-1 text-red-500 text-sm">{error}</p>}
    </div>
  )
}

interface TextareaFieldProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  required?: boolean
  error?: string
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

  return (
    <div>
      {label && (
        <label
          className="mb-2 block font-medium text-primary text-sm dark:text-774-nevy-50"
          htmlFor={inputId}
        >
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <textarea
        className={twMerge(
          'w-full rounded-lg border border-774-nevy-300 bg-white px-4 py-3 text-primary placeholder:text-774-nevy-400 focus:border-secondary-blue focus:outline-none focus:ring-2 focus:ring-secondary-blue/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-774-nevy-50 dark:placeholder:text-774-nevy-400',
          className,
        )}
        id={inputId}
        ref={ref}
        {...props}
      />
      {error && <p className="mt-1 text-red-500 text-sm">{error}</p>}
    </div>
  )
}

interface SelectFieldProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  required?: boolean
  error?: string
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

  return (
    <div>
      {label && (
        <label
          className="mb-2 block font-medium text-primary text-sm dark:text-774-nevy-50"
          htmlFor={inputId}
        >
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <select
        className={twMerge(
          'w-full rounded-lg border border-774-nevy-300 bg-white px-4 py-3 text-primary focus:border-secondary-blue focus:outline-none focus:ring-2 focus:ring-secondary-blue/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-774-nevy-50',
          className,
        )}
        id={inputId}
        ref={ref}
        {...props}
      >
        {children}
      </select>
      {error && <p className="mt-1 text-red-500 text-sm">{error}</p>}
    </div>
  )
}

interface CheckboxFieldProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label: React.ReactNode
  error?: string
}

export function CheckboxField({
  label,
  error,
  className,
  id,
  ...props
}: CheckboxFieldProps) {
  const inputId = id || props.name

  return (
    <div>
      <label className="flex items-center gap-3">
        <input
          className={twMerge(
            'h-4 w-4 rounded border-774-nevy-300 text-secondary-blue focus:ring-secondary-blue/20 dark:border-zinc-600',
            className,
          )}
          id={inputId}
          type="checkbox"
          {...props}
        />
        <span className="text-primary text-sm dark:text-774-nevy-50">
          {label}
        </span>
      </label>
      {error && <p className="mt-1 text-red-500 text-sm">{error}</p>}
    </div>
  )
}
