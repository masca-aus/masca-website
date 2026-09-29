"use client";

import { useTheme } from "@payloadcms/ui";

export function ThemeToggle() {
  const { setTheme, theme } = useTheme();
  const isDark = theme === "dark";
  const nextTheme = isDark ? "light" : "dark";

  return (
    <button
      type="button"
      className="masca-admin-theme-toggle"
      aria-label={`Switch to ${nextTheme} theme`}
      aria-pressed={isDark}
      title={`Switch to ${nextTheme} theme`}
      onClick={() => setTheme(nextTheme)}
    >
      <span aria-hidden="true" className="masca-admin-theme-toggle__icon">
        {isDark ? "☀" : "◐"}
      </span>
      <span>{isDark ? "Light" : "Dark"}</span>
    </button>
  );
}
