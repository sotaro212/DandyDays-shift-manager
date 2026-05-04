/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        dandy: {
          50:  '#FDF0E8',
          100: '#FCE7E6',
          200: '#F5C8C4',
          300: '#EAA8A4',
          400: '#E08880',
          500: '#C97B77',
          600: '#B06560',
          700: '#8C4A46',
          800: '#6A3430',
          900: '#3D1F1A',
        },
      },
    },
  },
  plugins: [],
}
