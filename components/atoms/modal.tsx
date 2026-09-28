// Libraries
import React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";

// Utils
import { fontVariables } from "@/lib/fonts";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  footer: React.ReactNode;
}

// Centered dialog in the design palette (follows light and dark mode)
const Modal = ({ open, onClose, title, description, children, footer }: ModalProps) => (
  <DialogPrimitive.Root open={open} onOpenChange={(o) => !o && onClose()}>
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[rgba(29,27,24,.32)] dark:bg-black/50 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
      <DialogPrimitive.Content
        className={cn(
          fontVariables,
          "fixed left-1/2 top-1/2 z-50 w-[calc(100vw-32px)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-[14px] border border-line bg-paper p-6 font-geist text-ink shadow-[0_30px_70px_-30px_rgba(29,27,24,.45)]",
          "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        )}
      >
        <DialogPrimitive.Title className="font-display font-semibold text-xl tracking-[-0.02em]">{title}</DialogPrimitive.Title>
        <DialogPrimitive.Description className={cn("mt-1.5 text-sm text-ink-muted", !description && "sr-only")}>{description ?? title}</DialogPrimitive.Description>
        {children && <div className="mt-5">{children}</div>}
        <div className="flex justify-end gap-2 mt-6">{footer}</div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  </DialogPrimitive.Root>
);

export const modalButton = {
  secondary: "h-[38px] px-4 rounded-[9px] border border-line bg-transparent text-sm font-medium cursor-pointer hover:bg-chip",
  primary: "h-[38px] px-4 rounded-[9px] bg-ink text-paper text-sm font-medium cursor-pointer disabled:opacity-40 disabled:cursor-default",
  danger: "h-[38px] px-4 rounded-[9px] bg-loss text-white text-sm font-medium cursor-pointer",
};

interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel: string;
}

export const ConfirmModal = ({ open, onClose, onConfirm, title, description, confirmLabel }: ConfirmModalProps) => (
  <Modal
    open={open}
    onClose={onClose}
    title={title}
    description={description}
    footer={
      <>
        <button type="button" className={modalButton.secondary} onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          className={modalButton.danger}
          onClick={() => {
            onConfirm();
            onClose();
          }}
        >
          {confirmLabel}
        </button>
      </>
    }
  />
);

export default Modal;
