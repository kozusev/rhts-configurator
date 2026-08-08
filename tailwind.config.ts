import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand red — matches the Robotic Hi-Tech Solutions logo (#e4322b).
        brand: {
          50: "#fdf3f2",
          100: "#fbe1df",
          200: "#f7c3bf",
          300: "#f09a94",
          400: "#e76a62",
          500: "#e4322b",
          600: "#cc211b",
          700: "#a91a15",
          800: "#8a1913",
          900: "#721915",
          950: "#3d0a08",
        },
        // Neutral dark grays (kept dark UI, navy → gray).
        ink: {
          900: "#0e0f11",
          800: "#17181b",
          700: "#26282d",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
