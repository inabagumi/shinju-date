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
            'flex w-full items-center justify-between rounded-md border border-border bg-surface px-3 py-2 text-left text-foreground transition-colors hover:bg-muted focus:ring-2 focus:ring-accent/20 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50',
            className,
          )}
          type="button"
          {...props}
        >
          <span className={value.length === 0 ? 'text-muted-foreground' : ''}>
            {getDisplayText()}
          </span>
          <ChevronDown className="ml-2 size-4 flex-shrink-0 text-muted-foreground" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          className="data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=open]:animate-in z-50 w-[var(--radix-popover-trigger-width)] rounded-md border border-border bg-surface p-2 text-foreground shadow-lg"
          sideOffset={4}
        >
          <div className="flex flex-col gap-1">
            {/* Select All / Deselect All button */}
            <button
              className="flex w-full items-center rounded px-2 py-2 text-left text-sm hover:bg-muted"
              onClick={handleSelectAll}
              type="button"
            >
              <div className="mr-2 flex size-5 items-center justify-center rounded border border-border">
                {value.length === options.length && (
                  <Check className="size-4 text-accent" />
                )}
                {value.length > 0 && value.length < options.length && (
                  <Minus className="size-3 text-accent" />
                )}
              </div>
              <span className="font-medium">
                {value.length === options.length ? 'すべて解除' : 'すべて選択'}
              </span>
            </button>
            <div className="my-1 h-px bg-border" />
            {/* Options list with scroll */}
            <div className="overflow-y-auto" style={{ maxHeight }}>
              {options.map((option) => {
                const isChecked = value.includes(option.value)
                return (
                  <label
                    className="flex w-full cursor-pointer items-center rounded px-2 py-2 text-sm hover:bg-muted"
                    htmlFor={`multi-select-${option.value}`}
                    key={option.value}
                  >
                    <Checkbox.Root
                      checked={isChecked}
                      className="mr-2 flex size-5 items-center justify-center rounded border border-border bg-surface data-[state=checked]:border-accent data-[state=checked]:bg-accent"
                      id={`multi-select-${option.value}`}
                      onCheckedChange={() => handleToggle(option.value)}
                    >
                      <Checkbox.Indicator>
                        <Check className="size-4 text-accent-foreground" />
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
