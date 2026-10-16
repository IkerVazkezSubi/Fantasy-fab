/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx}", "./components/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Pintura de la pista (zona de bajo el aro)
        pintura: { DEFAULT: "#1B3A9E", dark: "#142C78" },
        // Parqué de arce
        arce: { DEFAULT: "#E2B070", dark: "#B47F3E" },
        // Línea blanca de la pista
        linea: "#FBF8F1",
        // Rotulador de pizarra
        tinta: "#15171C",
        // Balón
        balon: "#E8590C",
      },
      fontFamily: {
        display: ['"Barlow Condensed"', "system-ui", "sans-serif"],
        body: ["Barlow", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
