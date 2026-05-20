"use client";

import { useTheme } from "./ThemeProvider";
import { THEMES } from "@/lib/theme";

export function HeaderThemeSelector() {
  const { themeId, setTheme } = useTheme();

  return (
    <div className="flex items-center gap-1 flex-wrap justify-end">
      {THEMES.map((theme) => (
        <button
          key={theme.id}
          onClick={() => setTheme(theme.id)}
          title={theme.label}
          aria-label={theme.label}
          className={`w-5 h-5 rounded-full shrink-0 transition-all ${
            themeId === theme.id
              ? "ring-2 ring-offset-1 ring-[#444] scale-110 shadow-sm"
              : "opacity-60 hover:opacity-100 hover:scale-110"
          }`}
          style={{ backgroundColor: theme.primary }}
        />
      ))}
    </div>
  );
}
