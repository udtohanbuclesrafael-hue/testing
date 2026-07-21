/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'go-green': '#22c55e',
        'caution-yellow': '#eab308',
        'no-go-red': '#ef4444',
      },
    },
  },
  plugins: [],
}
