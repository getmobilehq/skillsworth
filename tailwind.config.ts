import type { Config } from "tailwindcss";

// TTS Nigeria design tokens — handoff §14. Source of truth: prove-your-worth.jsx CSS block.
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        deep: "#004931",
        green: "#00B75B",
        lemon: "#8FC14E",
        yellow: "#FDC00D",
        cream: "#FFF5CC",
        red: "#E9473A", // confetti garnish only
        "green-50": "#EDF8EC",
        ink: "#0E0F0F",
        muted: "#4A5C53",
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', "sans-serif"],
        body: ['"Inter"', "system-ui", "sans-serif"],
      },
      borderRadius: {
        card: "16px",
        btn: "14px",
        field: "12px",
      },
      maxWidth: {
        app: "460px", // mobile-first frame
      },
    },
  },
  plugins: [],
};

export default config;
