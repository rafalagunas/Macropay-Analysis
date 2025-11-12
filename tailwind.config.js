/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'macroplay-blue': '#0047BA',
        'macroplay-yellow': '#FFDD00',
      },
    },
  },
  plugins: [],
}

