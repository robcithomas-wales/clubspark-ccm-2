/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#1857E0',
          dark: '#1832A8',
          light: '#EEF3FE',
        },
        surface: '#F8FAFC',
      },
      fontFamily: {
        sans: ['System'],
      },
    },
  },
  plugins: [],
}
