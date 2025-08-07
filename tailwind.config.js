/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/renderer/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}",
    "./src/pages/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          500: '#3498DB',
          600: '#2980B9',
          700: '#2C3E50',
          900: '#1a202c'
        },
        secondary: {
          100: '#f7fafc',
          500: '#95A5A6',
          600: '#718096'
        }
      },
      fontFamily: {
        'roboto': ['Roboto', 'sans-serif']
      },
      borderRadius: {
        'kiosk': '8px'
      }
    },
  },
  plugins: [],
}