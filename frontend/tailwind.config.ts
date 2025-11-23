import type { Config } from "tailwindcss";

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Figtree", "sans-serif"],
        dalfitra: ["Dalfitra", "sans-serif"],
      },
      colors: {
        default: "#27272A",
        contrast: "#3F3F46",
        primary: "#FAFAFA",
        success: "#4ADE80",
        warning: "#FACC15",
        error: "#F87171",
        highlight: "#EC762E",
        background: "#09090B",
      },
    },
  },
  plugins: [],
} satisfies Config;
