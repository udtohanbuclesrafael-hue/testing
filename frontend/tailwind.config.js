/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          950: '#082f49',
        },
        'go-green':    '#16a34a',
        'go-green-bg': '#f0fdf4',
        'caution-yellow':    '#d97706',
        'caution-yellow-bg': '#fffbeb',
        'no-go-red':    '#dc2626',
        'no-go-red-bg': '#fef2f2',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 1px 3px rgba(15,23,42,.06), 0 1px 2px rgba(15,23,42,.04)',
        'card-hover': '0 10px 25px -5px rgba(15,23,42,.10), 0 8px 10px -6px rgba(15,23,42,.05)',
      },
    },
  },
  plugins: [],
}