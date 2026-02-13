/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        primary: '#4F46E5', // Indigo 600
        secondary: '#64748B', // Slate 500
        background: '#F8FAFC', // Slate 50
        surface: '#FFFFFF',
      }
    },
  },
  plugins: [],
}