'use client'

import * as Checkbox from '@radix-ui/react-checkbox'
import * as Popover from '@radix-ui/react-popover'
import { Check, ChevronDown, Minus } from 'lucide-react'
import type { ComponentPropsWithoutRef } from 'react'
import { twMerge } from 'tailwind-merge'

export interface MultiSelectOption {
  label: string
  value: string
}

export interface MultiSelectProps
  extends Omit<
    ComponentPropsWithoutRef<'button'>,
    'onChange' | 'value' | 'children'
  > {
  options: MultiSelectOption[]
  value: string[]
  onChange: (value: string[]) => void
  placeholder?: string
  label?: string
  maxHeight?: string
}

export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = '選択してください',
  label,
  maxHeight = '300px',
  className,
  ...props
}: MultiSelectProps) {
  const handleToggle = (optionValue: string) => {
    const newValue = value.includes(optionValue)
      ? value.filter((v) => v !== optionValue)
      : [...value, optionValue]
    onChange(newValue)
  }

  const handleSelectAll = () => {
    if (value.length === options.length) {
      onChange([])
    } else {
      onChange(options.map((opt) => opt.value))
    }
  }

  const getDisplayText = () => {
    if (value.length === 0) {
      return placeholder
    }
    if (value.length === 1) {
      const selectedOption = options.find((opt) => opt.value === value[0])
      return selectedOption?.label || placeholder
    }
    return `${value.length}件選択中`
  }

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          className={twMerge(
            'flex w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-left text-gray-900 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50',
            className,
          )}
          type="button"
          {...props}
        >
          <span className={value.length === 0 ? 'text-gray-500' : ''}>
            {getDisplayText()}
          </span>
          <ChevronDown className="ml-2 size-4 flex-shrink-0 text-gray-500" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          className="data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 z-50 w-[var(--radix-popover-trigger-width)] rounded-md border border-gray-200 bg-white p-2 shadow-lg data-[state=closed]:animate-out data-[state=open]:animate-in"
          sideOffset={4}
        >
          <div className="flex flex-col gap-1">
            {/* Select All / Deselect All button */}
            <button
              className="flex w-full items-center rounded px-2 py-2 text-left text-sm hover:bg-gray-100"
              onClick={handleSelectAll}
              type="button"
            >
              <div className="mr-2 flex size-5 items-center justify-center rounded border border-gray-300">
                {value.length === options.length && (
                  <Check className="size-4 text-774-blue-600" />
                )}
                {value.length > 0 && value.length < options.length && (
                  <Minus className="size-3 text-774-blue-600" />
                )}
              </div>
              <span className="font-medium">
                {value.length === options.length ? 'すべて解除' : 'すべて選択'}
              </span>
            </button>
            <div className="my-1 h-px bg-gray-200" />
            {/* Options list with scroll */}
            <div className="overflow-y-auto" style={{ maxHeight }}>
              {options.map((option) => {
                const isChecked = value.includes(option.value)
                return (
                  <label
                    className="flex w-full cursor-pointer items-center rounded px-2 py-2 text-sm hover:bg-gray-100"
                    htmlFor={`multi-select-${option.value}`}
                    key={option.value}
                  >
                    <Checkbox.Root
                      checked={isChecked}
                      className="mr-2 flex size-5 items-center justify-center rounded border border-gray-300 bg-white data-[state=checked]:border-774-blue-600 data-[state=checked]:bg-774-blue-600"
                      id={`multi-select-${option.value}`}
                      onCheckedChange={() => handleToggle(option.value)}
                    >
                      <Checkbox.Indicator>
                        <Check className="size-4 text-white" />
                      </Checkbox.Indicator>
                    </Checkbox.Root>
                    <span>{option.label}</span>
                  </label>
                )
              })}
            </div>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
