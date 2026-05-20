"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
  DEFAULT_THEME_ID,
  THEME_STORAGE_KEY,
  VALID_THEME_IDS,
} from "@/lib/theme";
import type { ThemeId } from "@/lib/theme";

type ThemeContextValue = {
  themeId: ThemeId;
  setTheme: (id: ThemeId) => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  themeId: DEFAULT_THEME_ID,
  setTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeId, setThemeId] = useState<ThemeId>(DEFAULT_THEME_ID);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY) as ThemeId;
      if (stored && VALID_THEME_IDS.includes(stored)) {
        setThemeId(stored);
        document.documentElement.setAttribute("data-theme", stored);
      }
    } catch {}
  }, []);

  function setTheme(id: ThemeId) {
    setThemeId(id);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, id);
    } catch {}
    document.documentElement.setAttribute("data-theme", id);
  }

  return (
    <ThemeContext.Provider value={{ themeId, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
