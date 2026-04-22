import React from "react";
import { TouchableOpacity, Animated } from "react-native";
import { Sun, Moon } from "lucide-react-native";
import { useTheme } from "@/lib/contexts/ThemeContext";
import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const { theme, setTheme, isDark } = useTheme();

  return (
    <TouchableOpacity
      onPress={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "w-10 h-10 rounded-full items-center justify-center",
        "bg-surface/50 dark:bg-surface-dark/50 border border-border/50 dark:border-border-dark/50",
        "active:opacity-70",
      )}
    >
      {isDark ? (
        <Sun size={20} color="#FAF8F5" /> // Light color for dark mode icons
      ) : (
        <Moon size={20} color="#1A1614" /> // Dark color for light mode icons
      )}
    </TouchableOpacity>
  );
}
