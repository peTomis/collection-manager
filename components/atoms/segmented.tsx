import { cn } from "@/lib/utils";

interface SegmentedProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  mono?: boolean;
  className?: string;
}

// Pill switch from the design: the selected option is inverted (ink on paper).
const Segmented = <T extends string>({ options, value, onChange, mono, className }: SegmentedProps<T>) => (
  <div className={cn("flex gap-0.5 p-[3px] border border-line rounded-[10px] bg-canvas", className)}>
    {options.map((o) => (
      <button
        key={o.value}
        type="button"
        onClick={() => onChange(o.value)}
        className={cn(
          "flex-1 h-8 min-w-[44px] px-3 rounded-[7px] whitespace-nowrap text-[13px] font-medium cursor-pointer",
          mono && "font-geist-mono",
          o.value === value ? "bg-ink text-paper" : "bg-transparent text-ink-muted hover:text-ink"
        )}
      >
        {o.label}
      </button>
    ))}
  </div>
);

export default Segmented;
