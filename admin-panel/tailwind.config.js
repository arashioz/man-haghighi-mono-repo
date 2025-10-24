/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,js,ts,jsx,tsx}"],

  theme: {
    extend: {
      fontFamily: {
        'dirooz': ['Dirooz', 'IranianSans', 'Tahoma', 'Arial', 'sans-serif'],
        'iranian': ['IranianSans', 'Tahoma', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
