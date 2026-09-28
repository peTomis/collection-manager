import { useEffect, useState } from "react";

export type Theme = "light" | "dark" | "system";

const KEY = "theme";
const DARK_QUERY = "(prefers-color-scheme: dark)";

// Inlined in _document so the right theme is set before the first paint.
export const THEME_SCRIPT = `try{var t=localStorage.getItem("${KEY}");if(t==="dark"||((!t||t==="system")&&matchMedia("${DARK_QUERY}").matches))document.documentElement.classList.add("dark")}catch(e){}`;

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
