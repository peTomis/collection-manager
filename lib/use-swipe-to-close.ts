import { useRef } from "react";

export type SwipeHandlers = Pick<React.HTMLAttributes<HTMLDivElement>, "onPointerDown" | "onPointerMove" | "onPointerUp" | "onPointerCancel">;

// Mobile bottom sheet: dragging its top down moves it with the finger, and a long or quick enough drag closes it
export const useSwipeToClose = (onClose: () => void) => {
  const sheet = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: number; y: number; t: number; dy: number; captured: boolean } | null>(null);

  const move = (dy: number, animate: boolean) => {
    const el = sheet.current;
    if (!el) return;
    el.style.transition = animate ? "transform .22s cubic-bezier(.2,.8,.2,1)" : "none";
    el.style.transform = dy ? `translateY(${dy}px)` : "";
  };

  const release = (e: React.PointerEvent<HTMLDivElement>, cancelled: boolean) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    const velocity = d.dy / Math.max(1, e.timeStamp - d.t);
    if (!cancelled && (d.dy > 120 || (d.dy > 30 && velocity > 0.5))) {
      move(sheet.current?.offsetHeight ?? window.innerHeight, true);
      setTimeout(onClose, 200);
    } else move(0, true);
  };

  const handlers: SwipeHandlers = {
    onPointerDown: (e) => {
      // The desktop modal doesn't move
      if (e.button !== 0 || window.matchMedia("(min-width: 1024px)").matches) return;
      drag.current = { id: e.pointerId, y: e.clientY, t: e.timeStamp, dy: 0, captured: false };
    },
    onPointerMove: (e) => {
      const d = drag.current;
      if (!d || d.id !== e.pointerId) return;
      d.dy = Math.max(0, e.clientY - d.y);
      // Capture only once it is a drag, so a tap still reaches the close button
      if (!d.captured && d.dy > 4) {
        d.captured = true;
        e.currentTarget.setPointerCapture(e.pointerId);
      }
      if (d.captured) move(d.dy, false);
    },
    onPointerUp: (e) => release(e, false),
    onPointerCancel: (e) => release(e, true),
  };

  return { sheet, handlers };
};
