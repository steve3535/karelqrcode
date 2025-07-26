/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        wedding: {
          pink: '#FF69B4',
          darkPink: '#FF1493',
          lightPink: '#FFB6C1',
          cream: '#FFF8E7',
          gold: '#FFD700',
        }
      }
    },
  },
  plugins: [],
}