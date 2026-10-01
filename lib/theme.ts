import { useEffect, useState } from "react";
import { DARK_QUERY, KEY, THEME_SCRIPT } from "./theme-script";

export type Theme = "light" | "dark" | "system";

export { THEME_SCRIPT };

const readTheme = (): Theme => {
  try {
    const t = localStorage.getItem(KEY);
    if (t === "light" || t === "dark" || t === "system") return t;
  } catch {}
  return "system";
};

const applyTheme = (theme: Theme) => {
  const dark = theme === "dark" || (theme === "system" && window.matchMedia(DARK_QUERY).matches);
  document.documentElement.classList.toggle("dark", dark);
};

export const useTheme = () => {
  const [theme, setThemeState] = useState<Theme | null>(null);

  useEffect(() => {
    setThemeState(readTheme());
  }, []);

  useEffect(() => {
    if (!theme) return;
    applyTheme(theme);
    if (theme !== "system") return;
    const mq = window.matchMedia(DARK_QUERY);
    const onChange = () => applyTheme("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  const setTheme = (t: Theme) => {
    try {
      localStorage.setItem(KEY, t);
    } catch {}
    setThemeState(t);
  };

  return [theme ?? "system", setTheme] as const;
};
