"use client";

import { createContext, useContext, useEffect } from "react";

type ThemeContextValue = { theme: "light"; toggleTheme: () => void };
const ThemeContext = createContext<ThemeContextValue>({ theme: "light", toggleTheme: () => undefined });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.documentElement.dataset.theme = "light";
    document.documentElement.style.colorScheme = "light";
    try { window.localStorage.setItem("ecuisine-theme", "light"); } catch { /* Storage may be disabled. */ }
  }, []);

  return (
    <ThemeContext.Provider value={{ theme: "light", toggleTheme: () => undefined }}>
      {children}
    </ThemeContext.Provider>
  );
}

/* The storefront has moved to a permanently light presentation. */
export function ThemeToggle() {
  return null;
}
