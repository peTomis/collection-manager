// Components
import EditButton from "@/components/atoms/edit-button";

import { LIMITS } from "@/lib/limits";
import { cn } from "@/lib/utils";

interface StepperProps {
  value: number;
  onChange: (value: number) => void;
  // 0 lets a binder row go down to a missing slot
  min?: number;
  max?: number;
  // lg: the detail panel's, touch-sized on mobile. sm: compact, for list rows.
  size?: "lg" | "sm";
  disabled?: boolean;
  className?: string;
}

const STYLES = {
  lg: {
    box: "border border-line rounded-[10px] lg:rounded-[9px] bg-paper",
    button: "w-11 h-11 lg:w-9 lg:h-9 grid place-items-center text-lg lg:text-[18px] cursor-pointer",
    value: "min-w-7 text-center font-geist-mono font-medium text-[15px] lg:text-sm",
  },
  sm: {
    box: "w-fit border border-line rounded-lg",
    button: "w-7 h-7 grid place-items-center rounded-md text-ink-muted hover:bg-chip hover:text-ink cursor-pointer",
    value: "w-6 text-center font-geist-mono text-[13px]",
  },
};

// − quantity +, within min and max. Read-only in offline mode, like every collection edit.
const Stepper = ({ value, onChange, min = 1, max = LIMITS.QUANTITY, size = "lg", disabled, className }: StepperProps) => {
  const style = STYLES[size];
  return (
    <div className={cn("flex items-center", style.box, disabled && "opacity-40 pointer-events-none", className)}>
      <EditButton type="button" aria-label="Decrease quantity" className={style.button} disabled={disabled || value <= min} onClick={() => onChange(value - 1)}>
        −
      </EditButton>
      <span className={style.value}>{value}</span>
      <EditButton type="button" aria-label="Increase quantity" className={style.button} disabled={disabled || value >= max} onClick={() => onChange(value + 1)}>
        +
      </EditButton>
    </div>
  );
};

export default Stepper;
