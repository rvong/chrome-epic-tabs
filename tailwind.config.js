/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './extension/**/*.html',
    './extension/**/*.js',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#e8f5e9',
          100: '#c8e6c9',
          200: '#a5d6a7',
          300: '#81c784',
          400: '#66bb6a',
          500: '#3aa757',
          600: '#2e8b47',
          700: '#1b5e20',
          800: '#145214',
          900: '#0d3d0f',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
