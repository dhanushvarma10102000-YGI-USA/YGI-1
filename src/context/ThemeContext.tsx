"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type Theme = "dark" | "light";
interface ThemeContextType { theme: Theme; toggleTheme: () => void; isDark: boolean; }
const ThemeContext = createContext<ThemeContextType>({ theme: "dark", toggleTheme: () => {}, isDark: true });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const s = localStorage.getItem("theme") as Theme;
    if (s === "light" || s === "dark") setTheme(s);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem("theme", theme);
    document.documentElement.setAttribute("data-theme", theme);
    document.body.style.background = theme === "dark" ? "#050914" : "#f8faff";
    document.body.style.color = theme === "dark" ? "#e8eeff" : "#0f172a";
  }, [theme, mounted]);

  function toggleTheme() { setTheme(p => p === "dark" ? "light" : "dark"); }
  if (!mounted) return null;

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDark: theme === "dark" }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() { return useContext(ThemeContext); }
