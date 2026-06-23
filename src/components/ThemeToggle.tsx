"use client";
import { useTheme } from "@/context/ThemeContext";

export function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();
  return (
    <button
      onClick={toggleTheme}
      title="Toggle theme"
      style={{
        width: "52px", height: "28px", borderRadius: "100px",
        border: `1px solid ${isDark ? "rgba(99,102,241,0.4)" : "rgba(99,102,241,0.25)"}`,
        background: isDark ? "rgba(99,102,241,0.3)" : "rgba(99,102,241,0.12)",
        padding: "3px", cursor: "pointer", display: "flex",
        alignItems: "center", transition: "all .3s", flexShrink: 0,
      }}
    >
      <div style={{
        width: "22px", height: "22px", borderRadius: "50%",
        background: isDark ? "linear-gradient(135deg,#818cf8,#6366f1)" : "linear-gradient(135deg,#fbbf24,#f59e0b)",
        transform: `translateX(${isDark ? "24px" : "0px"})`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "12px", transition: "all .3s",
        boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
      }}>
        {isDark ? "🌙" : "☀️"}
      </div>
    </button>
  );
}
