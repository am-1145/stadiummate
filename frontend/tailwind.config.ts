import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        fifa: {
          dark: '#0e1118',
          card: '#161b26',
          border: '#2a3346',
          primary: '#1063e5', // Royal blue
          accent: '#f2a900', // Gold
          red: '#e52c50', // Emergency / Live Red
          green: '#00cc88', // Safe / Go green
          text: '#f3f4f6',
          textMuted: '#9ca3af'
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        title: ['Outfit', 'sans-serif']
      },
      boxShadow: {
        glass: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        glassLight: '0 8px 32px 0 rgba(255, 255, 255, 0.05)'
      },
      backdropFilter: {
        glass: 'blur(12px)'
      }
    },
  },
  plugins: [],
};

export default config;
