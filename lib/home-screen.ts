import { useEffect } from "react";

// Home screen icon (iOS) and manifest (Android: icon and launch screen colour) in the light and dark set.
// They are fixed once the app is added, so the page points at the set matching the device theme at that moment,
// and keeps following it while open. The light set, in pages/_document.tsx, is the default before this runs.
export const useHomeScreenIcons = () => {
  useEffect(() => {
    const dark = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const touchIcon = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]');
      const manifest = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
      if (touchIcon) touchIcon.href = dark.matches ? "/apple-touch-icon-dark.png" : "/apple-touch-icon.png";
      if (manifest) manifest.href = dark.matches ? "/site-dark.webmanifest" : "/site.webmanifest";
    };
    apply();
    dark.addEventListener("change", apply);
    return () => dark.removeEventListener("change", apply);
  }, []);
};
