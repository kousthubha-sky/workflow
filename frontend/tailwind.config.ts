import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ["'JetBrains Mono'", "monospace"],
      },
      colors: {
        bg: "#000000",
        "bg-2": "#0a0a0a",
        "bg-3": "#111111",
        "bg-4": "#181818",
        border: "#1a1a1a",
        "border-2": "#2a2a2a",
        text: "#ececec",
        muted: "#555555",
        "muted-2": "#999999",
        accent: "#3b82f6",       // blue glow — primary accent
        "accent-dim": "#3b82f622",
        lime: "#bef264",         // lime — status/success only
        "lime-dim": "#bef26422",
        amber: "#fbbf24",        // amber — secondary highlights
        "amber-dim": "#fbbf2422",
        blue: "#60a5fa",         // blue — info/tertiary
        "blue-dim": "#60a5fa22",
        purple: "#a78bfa",       // purple — extras
        "purple-dim": "#a78bfa22",
      },
      animation: {
        "fade-up": "fadeUp 0.6s ease forwards",
        "fade-in": "fadeIn 0.4s ease forwards",
        blink: "blink 1s step-end infinite",
        float: "float 6s ease-in-out infinite",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-6px)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
