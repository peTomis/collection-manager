import type { ButtonHTMLAttributes } from "react";
import { useReadOnly } from "@/lib/offline";
import { useT } from "@/lib/i18n";

// Collection mutations stay visibly disabled during a download and throughout offline mode.
export default function EditButton({ disabled, title, className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  const readOnly = useReadOnly();
  const t = useT();
  return (
    <button
      {...props}
      disabled={disabled || readOnly}
      title={readOnly ? t.common.readOnly : title}
      className={`${className} disabled:opacity-40 disabled:cursor-not-allowed`}
    />
  );
}
