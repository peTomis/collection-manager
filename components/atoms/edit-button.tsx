import type { ButtonHTMLAttributes } from "react";
import { useReadOnly } from "@/lib/offline";

// Collection mutations stay visibly disabled during a download and throughout offline mode.
export default function EditButton({ disabled, title, className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  const readOnly = useReadOnly();
  return (
    <button
      {...props}
      disabled={disabled || readOnly}
      title={readOnly ? "Collection is read-only in offline mode" : title}
      className={`${className} disabled:opacity-40 disabled:cursor-not-allowed`}
    />
  );
}
