import { useEffect, useState } from "react";
import { DARK_QUERY, KEY, THEME_SCRIPT } from "./theme-script";

// Pokémon is a dark theme with its own palette: it sets both .dark and .pokemon
export type Theme = "light" | "dark" | "system" | "pokemon";

export { THEME_SCRIPT };

const readTheme = (): Theme => {
  try {
    const t = localStorage.getItem(KEY);
    if (t === "light" || t === "dark" || t === "system" || t === "pokemon") return t;
  } catch {}
  return "system";
};

const applyTheme = (theme: Theme) => {
  const dark = theme === "dark" || theme === "pokemon" || (theme === "system" && window.matchMedia(DARK_QUERY).matches);
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.classList.toggle("pokemon", theme === "pokemon");
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
