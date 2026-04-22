/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        /* ============================================
           NIMA AI - Loro Piana Inspired Color System
           ============================================ */

        // Backgrounds
        background: {
          DEFAULT: "#FAF8F5", // Ivory Cream - Main page
          dark: "#1A1614", // Deep Espresso
        },
        surface: {
          DEFAULT: "#F5F0E8", // Soft Champagne - Cards, modals
          dark: "#252220", // Dark Cocoa
        },
        "surface-alt": {
          DEFAULT: "#EDE6DC", // Warm Linen - Secondary surfaces
          dark: "#302B28", // Coffee
        },

        // Primary - Nima Burgundy / Rose Gold
        primary: {
          DEFAULT: "#5C2A33", // Burgundy (light)
          hover: "#44242D",
          foreground: "#FAF8F5",
          dark: "#C9A07A", // Rose Gold (dark)
          "dark-hover": "#D4B896",
          "dark-foreground": "#1A1614",
        },

        // Secondary - Camel Brown / Soft Burgundy
        secondary: {
          DEFAULT: "#A67C52", // Camel Brown (light)
          hover: "#8C6A50",
          foreground: "#FAF8F5",
          dark: "#A66B73", // Soft Burgundy (dark)
          "dark-hover": "#B8828A",
          "dark-foreground": "#1A1614",
        },

        // Text Colors
        foreground: {
          DEFAULT: "#2D2926", // Charcoal (light)
          dark: "#F5F0E8", // Warm White (dark)
        },
        muted: {
          DEFAULT: "#F5F0E8",
          foreground: "#6B635B", // Warm Gray
          dark: "#302B28",
          "dark-foreground": "#C4B8A8", // Sand
        },
        "text-muted": {
          DEFAULT: "#9C948A", // Stone (light)
          dark: "#8C8078", // Warm Gray (dark)
        },

        // UI Elements
        card: {
          DEFAULT: "#F5F0E8",
          foreground: "#2D2926",
          dark: "#252220",
          "dark-foreground": "#F5F0E8",
        },
        popover: {
          DEFAULT: "#F5F0E8",
          foreground: "#2D2926",
          dark: "#252220",
          "dark-foreground": "#F5F0E8",
        },
        border: {
          DEFAULT: "#E0D8CC", // Sand (light)
          dark: "#3D3835", // Dark Sand (dark)
        },
        input: {
          DEFAULT: "#E0D8CC",
          dark: "#3D3835",
        },
        ring: {
          DEFAULT: "#5C2A33",
          dark: "#C9A07A",
        },

        // Accent
        accent: {
          DEFAULT: "#F5F0E8",
          foreground: "#5C2A33",
          dark: "#302B28",
          "dark-foreground": "#C9A07A",
        },

        // Status Colors
        success: {
          DEFAULT: "#6B7F5E", // Sage (light)
          dark: "#8FA881", // Soft Sage (dark)
        },
        destructive: {
          DEFAULT: "#B85C5C", // Dusty Rose (light)
          dark: "#D4807A", // Warm Coral (dark)
        },
        warning: {
          DEFAULT: "#C4A35A", // (light)
          dark: "#D4C078", // (dark)
        },

        // Charts
        chart: {
          1: { DEFAULT: "#5C2A33", dark: "#C9A07A" },
          2: { DEFAULT: "#A67C52", dark: "#A66B73" },
          3: { DEFAULT: "#6B7F5E", dark: "#8FA881" },
          4: { DEFAULT: "#C4A35A", dark: "#D4C078" },
          5: { DEFAULT: "#8C6A50", dark: "#B8828A" },
        },
      },

      fontFamily: {
        sans: ["DMSans"],
        serif: ["CormorantGaramond"],
      },

      borderRadius: {
        sm: "4px", // radius - 4px (radius = 8px)
        md: "6px", // radius - 2px
        lg: "8px", // radius
        xl: "12px", // radius + 4px
      },
    },
  },
  plugins: [],
};
