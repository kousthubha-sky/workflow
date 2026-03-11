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
        border: "#222222",
        "border-2": "#333333",
        text: "#e2e2e2",
        muted: "#555555",
        "muted-2": "#888888",
        green: "#00ff87",
        "green-dim": "#00ff8722",
        amber: "#f59e0b",
        "amber-dim": "#f59e0b22",
        blue: "#60a5fa",
        "blue-dim": "#60a5fa22",
        purple: "#a78bfa",
        "purple-dim": "#a78bfa22",
      },
      animation: {
        "fade-up": "fadeUp 0.6s ease forwards",
        "fade-in": "fadeIn 0.4s ease forwards",
        blink: "blink 1s step-end infinite",
        float: "float 6s ease-in-out infinite",
        glow: "glow 2s ease-in-out infinite alternate",
        "border-pulse": "borderPulse 2s ease-in-out infinite",
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
        glow: {
          "0%": { boxShadow: "0 0 20px #00ff8711" },
          "100%": { boxShadow: "0 0 40px #00ff8722, 0 0 80px #00ff870a" },
        },
        borderPulse: {
          "0%, 100%": { borderColor: "#222222" },
          "50%": { borderColor: "#333333" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
