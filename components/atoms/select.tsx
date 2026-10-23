// Libraries
import React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";

// State
import { fontVariables } from "@/lib/fonts";
import { cn } from "@/lib/utils";

export interface SelectOption<T extends string> {
  value: T;
  label: string;
  // Muted text on the right, e.g. a price
  hint?: string;
}

interface SelectProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: SelectOption<T>[];
  // Muted prefix inside the field ("Version", "Sort")
  label?: React.ReactNode;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}

// Field from the design: muted label, the value and a chevron. The options open in a menu styled like the app, not the browser's.
const Select = <T extends string>({ value, onChange, options, label, disabled, className, "aria-label": ariaLabel }: SelectProps<T>) => {
  const selected = options.find((o) => o.value === value);
  return (
    <SelectPrimitive.Root value={value} onValueChange={(v) => onChange(v as T)} disabled={disabled}>
      <SelectPrimitive.Trigger
        aria-label={ariaLabel}
        className={cn(
          "flex items-center gap-2 h-12 lg:h-[38px] px-3 border border-line rounded-[10px] lg:rounded-[9px] bg-paper text-sm lg:text-[13px] text-left text-ink cursor-pointer outline-none",
          "hover:border-ink-muted focus-visible:border-ink-muted data-[state=open]:border-ink-muted disabled:opacity-40 disabled:cursor-default",
          className
        )}
      >
        {label && <span className="flex-none text-ink-muted">{label}</span>}
        <span className="flex-1 min-w-0 font-medium truncate">
          <SelectPrimitive.Value>{selected?.label}</SelectPrimitive.Value>
        </span>
        {selected?.hint && <span className="flex-none font-geist-mono text-ink-muted">{selected.hint}</span>}
        <SelectPrimitive.Icon className="flex-none text-ink-muted">
          <Chevron />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={4}
          className={cn(
            fontVariables,
            "z-[60] min-w-[var(--radix-select-trigger-width)] max-w-[calc(100vw-32px)] max-h-[min(360px,var(--radix-select-content-available-height))] overflow-hidden",
            "font-geist text-ink bg-paper border border-line rounded-[10px] shadow-[0_12px_30px_-16px_rgba(29,27,24,.45)]",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
          )}
        >
          <SelectPrimitive.Viewport className="p-1">
            {options.map((o) => (
              <SelectPrimitive.Item
                key={o.value}
                value={o.value}
                // Selected: filled like the selected segment of a Segmented. Hovered or focused with the keyboard: the chip background
                className={cn(
                  "group flex items-center gap-3 min-h-11 lg:min-h-9 pl-2.5 pr-2 rounded-[7px] text-sm lg:text-[13px] cursor-pointer outline-none select-none",
                  "data-[state=unchecked]:data-[highlighted]:bg-chip data-[state=checked]:bg-fill data-[state=checked]:text-on-fill data-[state=checked]:font-medium data-[state=checked]:data-[highlighted]:bg-fill/90"
                )}
              >
                <SelectPrimitive.ItemText>{o.label}</SelectPrimitive.ItemText>
                {o.hint && <span className="ml-auto font-normal font-geist-mono text-ink-muted group-data-[state=checked]:text-on-fill/70">{o.hint}</span>}
                <span className={cn("grid flex-none w-4 place-items-center", !o.hint && "ml-auto")}>
                  <SelectPrimitive.ItemIndicator>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="m2.5 6.2 2.3 2.3 4.7-5" />
                    </svg>
                  </SelectPrimitive.ItemIndicator>
                </span>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
};

const Chevron = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="m2 3.5 3 3 3-3" />
  </svg>
);

export default Select;
