import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "danger" | "remove";

// md: dialogs and pages. lg: the item detail panel, touch-sized on mobile.
export type ButtonSize = "md" | "lg";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-fill text-on-fill",
  secondary: "border border-line bg-paper hover:bg-chip",
  danger: "bg-loss text-white",
  // A destructive action that shouldn't draw the eye, next to the others
  remove: "bg-transparent text-loss",
};

const SIZES: Record<ButtonSize, string> = {
  md: "h-[38px] px-4 rounded-[9px] text-sm",
  lg: "h-12 lg:h-[38px] px-3.5 rounded-[10px] lg:rounded-[9px] text-sm",
};

// The main action of the panel stands out a bit more on mobile
const LARGE_PRIMARY = "px-[18px] text-[15px] lg:text-sm";

// The app's button look, for buttons, links and labels alike. Extra classes (layout, width) go through cn.
export const buttonClass = (variant: ButtonVariant, size: ButtonSize = "md") =>
  cn("font-medium cursor-pointer disabled:opacity-40 disabled:cursor-default", SIZES[size], VARIANTS[variant], size === "lg" && variant === "primary" && LARGE_PRIMARY);
