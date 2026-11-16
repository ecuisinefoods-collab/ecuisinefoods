"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "light" | "dark";
type ThemeContextValue = { theme: Theme; toggleTheme: () => void };
const ThemeContext = createContext<ThemeContextValue>({ theme: "light", toggleTheme: () => undefined });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const stored = window.localStorage.getItem("ecuisine-theme");
    const initial: Theme = stored === "dark" ? "dark" : "light";
    setTheme(initial);
    document.documentElement.dataset.theme = initial;
    document.documentElement.style.colorScheme = initial;
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    try { window.localStorage.setItem("ecuisine-theme", theme); } catch { /* Storage may be disabled. */ }
  }, [theme]);

  const value = useMemo(() => ({
    theme,
    toggleTheme: () => setTheme(current => current === "dark" ? "light" : "dark"),
  }), [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function ThemeToggle({ className = "", showLabel = false }: { className?: string; showLabel?: boolean }) {
  const { theme, toggleTheme } = useContext(ThemeContext);
  const next = theme === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
      className={`ec-theme-toggle inline-flex items-center justify-center gap-2 rounded-full border px-3 py-2.5 text-xs font-bold transition ${className}`}
    >
      {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
      {showLabel ? <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span> : null}
    </button>
  );
}
