import React, {
  ChangeEvent,
  DetailedHTMLProps,
  InputHTMLAttributes,
  ReactElement,
  RefForwardingComponent,
  forwardRef,
  useCallback,
  useState
} from 'react'

export type TextFieldProps = DetailedHTMLProps<
  InputHTMLAttributes<HTMLInputElement>,
  HTMLInputElement
>

type Value = string | number | string[] | undefined

const TextField: RefForwardingComponent<HTMLInputElement, TextFieldProps> = (
  { onChange, type, value: defaultValue, ...inputProps },
  ref
): ReactElement => {
  const [value, setValue] = useState<Value>(defaultValue)

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      setValue(event.target.value)

      if (typeof onChange === 'function') onChange(event)
    },
    [onChange]
  )

  return (
    <>
      <input
        onChange={handleChange}
        ref={ref}
        type={type || 'text'}
        value={value}
        {...inputProps}
      />
    </>
  )
}

export default forwardRef(TextField)
