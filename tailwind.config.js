/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        rio: {
          DEFAULT: "#A63D2D", // Riotinto rust red
          dark: "#7A2B20",
          light: "#C25843",
        },
        court: {
          DEFAULT: "#C48A4A", // parquet wood
          dark: "#9C6B34",
        },
        ink: "#14213D", // deep navy, text/backgrounds
        paper: "#F1E9DA", // warm cream background
        line: "#E4D8C3",
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
      },
    },
  },
  plugins: [],
};
