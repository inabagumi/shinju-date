'use client'

import {
  type ChangeEventHandler,
  type ComponentPropsWithoutRef,
  Fragment,
  createContext,
  useActionState,
  useCallback,
  useContext,
  useId,
  useState
} from 'react'
import { useFormStatus } from 'react-dom'

export type FormState = Partial<{
  errors: Record<string, string[]>
}>

const FormContext = createContext<FormState>({})

type FormFieldContextValue = {
  id?: string
  name?: string
}

const FormFieldContext = createContext<FormFieldContextValue>({})

type Props = Omit<ComponentPropsWithoutRef<'form'>, 'action'> & {
  action: (
    currentState: FormState,
    payload: FormData
  ) => FormState | Promise<FormState>
  initialState?: Awaited<FormState>
}

export default function Form({
  action,
  initialState = {},
  noValidate = true,
  ...props
}: Props) {
  const [state, formAction] = useActionState(action, initialState)

  return (
    <FormContext.Provider value={state}>
      <form action={formAction} noValidate={noValidate} {...props} />
    </FormContext.Provider>
  )
}

type ButtonProps = ComponentPropsWithoutRef<'button'>

export function Button({ disabled, type = 'button', ...props }: ButtonProps) {
  const { pending } = useFormStatus()

  return <button disabled={disabled ?? pending} type={type} {...props} />
}

type ErrorMessageProps = ComponentPropsWithoutRef<'p'>

export function ErrorMessage(props: ErrorMessageProps) {
  const { errors } = useContext(FormContext)
  const { id, name } = useContext(FormFieldContext)
  const errorMessages = (name && errors?.[name]) || []

  return (
    errorMessages.length > 0 && (
      <p id={id ? `${id}-error-message` : undefined} {...props}>
        {errorMessages.map((message, i) => (
          <Fragment key={i}>
            {i > 0 && <br />}
            {message}
          </Fragment>
        ))}
      </p>
    )
  )
}

type FormFieldProps = ComponentPropsWithoutRef<'div'> & {
  name?: string
}

export function FormField({ name, ...props }: FormFieldProps) {
  const id = useId()

  return (
    <FormFieldContext.Provider
      value={{
        id,
        ...(name ? { name } : {})
      }}
    >
      <div {...props} />
    </FormFieldContext.Provider>
  )
}

type GenericErrorMessageProps = ComponentPropsWithoutRef<'p'>

export function GenericErrorMessage({
  role = 'alert',
  ...props
}: GenericErrorMessageProps) {
  const { errors } = useContext(FormContext)
  const errorMessages = errors?.['generic'] || []

  return (
    errorMessages.length > 0 && (
      <p role={role} {...props}>
        {errorMessages.map((message, i) => (
          <Fragment key={i}>
            {i > 0 && <br />}
            {message}
          </Fragment>
        ))}
      </p>
    )
  )
}

type InputProps = Omit<ComponentPropsWithoutRef<'input'>, 'value'>

export function Input({
  defaultValue = '',
  disabled,
  id: newId,
  name: newName,
  type = 'text',
  ...props
}: InputProps) {
  const [value, setValue] = useState(defaultValue)
  const { pending } = useFormStatus()
  const { errors } = useContext(FormContext)
  const { id, name } = useContext(FormFieldContext)
  const invalid = typeof name !== 'undefined' && !!errors?.[name]

  const handleChange = useCallback<ChangeEventHandler<HTMLInputElement>>(
    ({ target }) => {
      setValue(target.value)
    },
    []
  )

  return (
    <input
      aria-describedby={invalid && id ? `${id}-error-message` : undefined}
      aria-invalid={invalid ? true : undefined}
      disabled={disabled ?? (pending ? true : undefined)}
      id={newId ?? id}
      name={newName ?? name}
      onChange={handleChange}
      type={type}
      value={value}
      {...props}
    />
  )
}

type LabelProps = ComponentPropsWithoutRef<'label'>

export function Label({ htmlFor, ...props }: LabelProps) {
  const { pending } = useFormStatus()
  const { id } = useContext(FormFieldContext)

  return (
    <label
      aria-disabled={pending ? true : undefined}
      htmlFor={htmlFor ?? id}
      {...props}
    />
  )
}
