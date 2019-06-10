import classNames from 'classnames'
import React, {
  ChangeEvent,
  DetailedHTMLProps,
  FocusEvent,
  InputHTMLAttributes,
  RefForwardingComponent,
  forwardRef,
  useCallback,
  useState
} from 'react'

export interface TextFieldProps
  extends DetailedHTMLProps<
    InputHTMLAttributes<HTMLInputElement>,
    HTMLInputElement
  > {
  icon?: string
}

type Value = string | number | string[] | undefined

const TextField: RefForwardingComponent<HTMLInputElement, TextFieldProps> = (
  { icon, onBlur, onChange, onFocus, type, value: defaultValue, ...inputProps },
  ref
) => {
  const [value, setValue] = useState<Value>(defaultValue)
  const [isFocused, setIsFocusesd] = useState<boolean>(false)

  const handleBlur = useCallback(
    (event: FocusEvent<HTMLInputElement>) => {
      setIsFocusesd(false)

      if (typeof onBlur === 'function') onBlur(event)
    },
    [onBlur]
  )

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setValue(event.target.value)

      if (typeof onChange === 'function') onChange(event)
    },
    [onChange]
  )

  const handleFocus = useCallback(
    (event: FocusEvent<HTMLInputElement>) => {
      setIsFocusesd(true)

      if (typeof onFocus === 'function') onFocus(event)
    },
    [onFocus]
  )

  return (
    <>
      <div
        className={classNames('text-field', {
          'text-field--focused': isFocused,
          'text-field--with-icon': icon
        })}
      >
        {icon && (
          <span aria-hidden="true" className="material-icons text-field__icon">
            {icon}
          </span>
        )}

        <input
          className="text-field__input"
          onBlur={handleBlur}
          onChange={handleChange}
          onFocus={handleFocus}
          ref={ref}
          type={type || 'text'}
          value={value}
          {...inputProps}
        />
      </div>

      <style jsx>{`
        .text-field {
          background-color: #f5f5f5;
          border: 1px solid #e0e0e0;
          border-radius: 6px;
          box-sizing: border-box;
          color: #9e9e9e;
          display: block;
          max-width: 100%;
          transition-duration: 0.4s;
          transition-property: background-color, border-color, color;
          transition-timing-function: ease-out;
        }

        .text-field:hover,
        .text-field--focused {
          border-color: #616161;
          color: #616161;
          transition-timing-function: ease-in;
        }

        .text-field--focused {
          background-color: #fff;
        }

        .text-field--with-icon {
          position: relative;
        }

        .text-field__icon {
          align-items: center;
          bottom: 0;
          display: flex;
          font-size: 20px;
          justify-content: center;
          overflow: hidden;
          pointer-events: none;
          position: absolute;
          left: 0;
          top: 0;
          width: 30px;
        }

        .text-field__input {
          appearance: none;
          background-color: transparent;
          border: 0;
          box-sizing: border-box;
          color: #616161;
          display: block;
          font-family: inherit;
          font-size: 1rem;
          height: 100%;
          line-height: 1.5;
          padding: 0.3rem 6px;
          width: 100%;
        }

        .text-field__input:focus {
          outline: 0;
        }

        .text-field--with-icon .text-field__input {
          padding-left: 30px;
        }
      `}</style>
    </>
  )
}

export default forwardRef(TextField)
