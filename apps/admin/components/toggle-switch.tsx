'use client'

import type { ComponentPropsWithoutRef } from 'react'

// Note: We need to omit 'onChange' from button props because:
// 1. React button elements DO have an onChange handler (FormEventHandler)
// 2. Our custom onChange has an incompatible signature: (checked: boolean) => void
// 3. Without omitting, TypeScript would complain about the signature mismatch
interface ToggleSwitchProps
  extends Omit<
    ComponentPropsWithoutRef<'button'>,
    'children' | 'onClick' | 'onChange' | 'type'
  > {
  checked: boolean
  disabled?: boolean
  label?: string
  onChange?: (checked: boolean) => void
}

export default function ToggleSwitch({
  checked,
  disabled = false,
  label,
  onChange,
  ...props
}: ToggleSwitchProps) {
  const handleClick = () => {
    if (!disabled && onChange) {
      onChange(!checked)
    }
  }

  return (
    <button
      aria-checked={checked}
      aria-label={label}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
        checked ? 'bg-green-600' : 'bg-gray-300'
      } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
      disabled={disabled}
      onClick={handleClick}
      role="switch"
      type="button"
      {...props}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  )
}
