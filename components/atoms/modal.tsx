// Libraries
import React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";

// Utils
import { useSwipeToClose } from "@/lib/use-swipe-to-close";
import { fontVariables } from "@/lib/fonts";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  footer: React.ReactNode;
  // A bottom sheet on mobile (dragged down to close), still a centered dialog on desktop
  sheet?: boolean;
}

// Centered dialog in the design palette (follows light and dark mode)
const Modal = ({ open, onClose, title, description, children, footer, sheet }: ModalProps) => {
  const swipe = useSwipeToClose(onClose);
  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[rgba(29,27,24,.32)] dark:bg-black/50 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          ref={sheet ? swipe.sheet : undefined}
          className={cn(
            fontVariables,
            "fixed z-50 border-line bg-paper font-geist text-ink shadow-[0_30px_70px_-30px_rgba(29,27,24,.45)] data-[state=open]:animate-in data-[state=open]:fade-in-0",
            sheet
              ? "inset-x-0 bottom-0 px-4 pb-[max(28px,env(safe-area-inset-bottom))] rounded-t-[22px] data-[state=open]:slide-in-from-bottom lg:inset-x-auto lg:bottom-auto lg:p-6 lg:border lg:rounded-[14px] lg:data-[state=open]:slide-in-from-bottom-0"
              : "p-6 border rounded-[14px]",
            "lg:left-1/2 lg:top-1/2 lg:w-[calc(100vw-32px)] lg:max-w-md lg:-translate-x-1/2 lg:-translate-y-1/2 lg:data-[state=open]:zoom-in-95",
            !sheet && "left-1/2 top-1/2 w-[calc(100vw-32px)] max-w-md -translate-x-1/2 -translate-y-1/2 data-[state=open]:zoom-in-95"
          )}
        >
          {/* Mobile sheet: the handle and the title are where it is dragged from */}
          <div {...(sheet ? swipe.handlers : {})} className={cn(sheet && "touch-none lg:touch-auto")}>
            {sheet && (
              <div className="flex justify-center pt-2.5 pb-3 lg:hidden">
                <span className="w-10 h-[5px] rounded-full bg-line" />
              </div>
            )}
            <DialogPrimitive.Title className="font-display font-semibold text-xl tracking-[-0.02em]">{title}</DialogPrimitive.Title>
            <DialogPrimitive.Description className={cn("mt-1.5 text-sm text-ink-muted", !description && "sr-only")}>{description ?? title}</DialogPrimitive.Description>
          </div>
          {children && <div className="mt-5">{children}</div>}
          <div className={cn("flex justify-end gap-2 mt-6", sheet && "[&>*]:flex-1 [&>*]:h-12 lg:[&>*]:flex-none lg:[&>*]:h-[38px]")}>{footer}</div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};

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
