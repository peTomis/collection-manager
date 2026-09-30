import { useEffect, useLayoutEffect } from "react";

// Measure before paint in the browser without registering a layout effect during SSR.
export const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;
