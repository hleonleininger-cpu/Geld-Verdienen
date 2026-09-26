import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#0a0e17",
          900: "#0f1420",
          800: "#161c2c",
          700: "#232b3d",
          600: "#333d54",
          500: "#4a5570",
          400: "#6b7690",
          300: "#96a0b8",
          200: "#c3cadb",
          100: "#e4e8f0",
          50: "#f4f6fa",
        },
        brand: {
          950: "#04231b",
          900: "#07362a",
          800: "#0b4d3b",
          700: "#106248",
          600: "#157a56",
          500: "#1c9166",
          400: "#33ab7d",
          300: "#6cc7a2",
          200: "#a9e0c6",
          100: "#dcf3e7",
          50: "#f0faf5",
        },
        sand: {
          50: "#fbfaf7",
          100: "#f5f2ec",
        },
      },
      fontFamily: {
        sans: [
          "var(--font-sans)",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "sans-serif",
        ],
        display: [
          "var(--font-display)",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
      },
      boxShadow: {
        soft: "0 1px 2px rgba(15, 20, 32, 0.04), 0 8px 24px -8px rgba(15, 20, 32, 0.08)",
        card: "0 1px 1px rgba(15, 20, 32, 0.03), 0 12px 32px -12px rgba(15, 20, 32, 0.12)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
      animation: {
        "fade-up": "fadeUp 0.6s ease-out forwards",
        "fade-in": "fadeIn 0.5s ease-out forwards",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
