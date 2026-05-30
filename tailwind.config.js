const konstaConfig = require('konsta/config');

/** @type {import('tailwindcss').Config} */
module.exports = konstaConfig({
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary blue palette based on #003DCC
        brand: {
          50: '#E6EDFF',
          100: '#CCDAFF',
          200: '#99B5FF',
          300: '#668FFF',
          400: '#336AFF',
          500: '#003DCC', // Primary
          600: '#0031A3',
          700: '#00257A',
          800: '#001952',
          900: '#000C29',
        },
        // Accent - warm amber for contrast
        accent: {
          50: '#FFFBEB',
          100: '#FEF3C7',
          200: '#FDE68A',
          300: '#FCD34D',
          400: '#FBBF24',
          500: '#F59E0B',
          600: '#D97706',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      boxShadow: {
        'glow-brand': '0 0 60px -12px rgba(0, 61, 204, 0.4)',
        'glow-cyan': '0 0 60px -12px rgba(6, 182, 212, 0.4)',
      },
    },
  },
});
