import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        teal: {
          DEFAULT: "#00647D",
          50: "#e0f2f0",
          100: "#b3e0d9",
          600: "#005a70",
          700: "#004f62",
        },
      },
      fontFamily: {
        sans: ["Nunito", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
