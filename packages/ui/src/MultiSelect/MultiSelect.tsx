"use client";

import * as Checkbox from "@radix-ui/react-checkbox";
import * as Popover from "@radix-ui/react-popover";
import { Check, ChevronDown, Minus } from "lucide-react";
import { type ComponentPropsWithoutRef, useId } from "react";

import { twMerge } from "../tw-merge.js";

const checkboxClassName =
  "mr-2 flex size-5 items-center justify-center rounded-control border border-border bg-surface data-[state=checked]:border-accent data-[state=checked]:bg-accent data-[state=indeterminate]:border-accent data-[state=indeterminate]:bg-accent";

export interface MultiSelectOption {
  label: string;
  value: string;
}

export interface MultiSelectProps extends Omit<
  ComponentPropsWithoutRef<"button">,
  "onChange" | "value" | "children"
> {
  options: MultiSelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  label?: string;
  maxHeight?: string;
}

export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = "選択してください",
  label,
  maxHeight = "300px",
  className,
  ...props
}: MultiSelectProps) {
  // 同じ値の選択肢を持つ MultiSelect が並んでも、チェックボックスの id が重ならないようにする
  const idPrefix = useId();
  const selectAllId = `${idPrefix}-select-all`;
  const getOptionId = (optionValue: string) =>
    `${idPrefix}-option-${optionValue}`;
  const selectAllState =
    options.length > 0 && value.length === options.length
      ? true
      : value.length > 0
        ? "indeterminate"
        : false;

  const handleToggle = (optionValue: string) => {
    const newValue = value.includes(optionValue)
      ? value.filter((v) => v !== optionValue)
      : [...value, optionValue];
    onChange(newValue);
  };

  const handleSelectAll = () => {
    if (selectAllState === true) {
      onChange([]);
    } else {
      onChange(options.map((opt) => opt.value));
    }
  };

  const getDisplayText = () => {
    if (value.length === 0) {
      return placeholder;
    }
    if (value.length === 1) {
      const selectedOption = options.find((opt) => opt.value === value[0]);
      return selectedOption?.label || placeholder;
    }
    return `${value.length}件選択中`;
  };

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          aria-label={label}
          className={twMerge(
            "flex w-full items-center justify-between rounded-control border field-focus-ring border-border bg-surface px-3 py-2 text-left text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          type="button"
          {...props}
        >
          <span className={value.length === 0 ? "text-muted" : ""}>
            {getDisplayText()}
          </span>
          <ChevronDown className="ml-2 size-4 flex-shrink-0 text-muted" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          className="z-50 w-[var(--radix-popover-trigger-width)] origin-(--radix-popover-content-transform-origin) rounded-container border border-border bg-surface p-2 text-foreground shadow-overlay motion-safe:data-[state=closed]:animate-scale-out motion-safe:data-[state=open]:animate-scale-in"
          sideOffset={4}
        >
          <div className="flex flex-col gap-1">
            {/* Select All: 一部だけ選択のときは aria-checked="mixed" になる */}
            <label
              className="flex w-full cursor-pointer items-center rounded-control px-2 py-2 text-meta leading-5 hover:bg-muted"
              htmlFor={selectAllId}
            >
              <Checkbox.Root
                checked={selectAllState}
                className={checkboxClassName}
                id={selectAllId}
                onCheckedChange={handleSelectAll}
              >
                <Checkbox.Indicator>
                  {selectAllState === "indeterminate" ? (
                    <Minus className="size-3 text-accent-foreground" />
                  ) : (
                    <Check className="size-4 text-accent-foreground" />
                  )}
                </Checkbox.Indicator>
              </Checkbox.Root>
              <span className="font-medium">すべて選択</span>
            </label>
            <div className="my-1 h-px bg-border" />
            {/* Options list with scroll */}
            <div className="overflow-y-auto" style={{ maxHeight }}>
              {options.map((option) => {
                const isChecked = value.includes(option.value);
                return (
                  <label
                    className="flex w-full cursor-pointer items-center rounded-control px-2 py-2 text-meta leading-5 hover:bg-muted"
                    htmlFor={getOptionId(option.value)}
                    key={option.value}
                  >
                    <Checkbox.Root
                      checked={isChecked}
                      className={checkboxClassName}
                      id={getOptionId(option.value)}
                      onCheckedChange={() => handleToggle(option.value)}
                    >
                      <Checkbox.Indicator>
                        <Check className="size-4 text-accent-foreground" />
                      </Checkbox.Indicator>
                    </Checkbox.Root>
                    <span>{option.label}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
