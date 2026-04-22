import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import { Appearance, useColorScheme as useRNColorScheme } from "react-native";
import { useColorScheme as useNWColorScheme } from "nativewind";

type Theme = "light" | "dark" | "system";

interface ThemeContextType {
  /** The resolved theme: always 'light' or 'dark' */
  colorScheme: "light" | "dark";
  /** The user-selected theme preference */
  theme: Theme;
  /** Set the theme preference */
  setTheme: (theme: Theme) => void;
  /** Whether dark mode is active */
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useRNColorScheme();
  const { setColorScheme: setNWColorScheme } = useNWColorScheme();
  const [theme, setThemeState] = useState<Theme>("light");

  // Resolve the actual color scheme based on the user's preference
  const resolvedScheme: "light" | "dark" =
    theme === "system" ? (systemColorScheme ?? "dark") : theme;

  // Sync NativeWind's color scheme when theme changes
  useEffect(() => {
    setNWColorScheme(resolvedScheme);
  }, [resolvedScheme, setNWColorScheme]);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        colorScheme: resolvedScheme,
        theme,
        setTheme,
        isDark: resolvedScheme === "dark",
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

/**
 * Nima-specific color helper.
 * Returns the correct color for the current theme from the Loro Piana palette.
 */
export function useThemedColor() {
  const { isDark } = useTheme();

  return useCallback(
    (lightColor: string, darkColor: string) =>
      isDark ? darkColor : lightColor,
    [isDark],
  );
}
