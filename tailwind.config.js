/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        health: {
          dark: '#FFFFFF',       // Clean white base
          darker: '#F8FAFC',     // Clinical off-white base
          card: '#FFFFFF',       // White glass card background
          border: '#E2E8F0',     // Crisp light slate border
          textMuted: '#64748B',  // Muted slate text
          blue: '#3B82F6',       // Clinical Electric Blue
          cyan: '#06B6D4',       // Soft Cyan
          emerald: '#10B981',    // Emerald Success
          violet: '#3B82F6',     // Mapped to Clinical Blue (no purple)
          rose: '#EF4444',       // Soft Danger Red
          amber: '#F59E0B',      // Amber Accent
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        manrope: ['Manrope', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 4px 20px -2px rgba(59, 130, 246, 0.12)',
        'glow-blue': '0 4px 25px rgba(59, 130, 246, 0.18)',
        'glow-emerald': '0 4px 25px rgba(16, 185, 129, 0.18)',
        'glow-rose': '0 4px 25px rgba(239, 68, 68, 0.18)',
        saas: '0 1px 3px 0 rgba(15, 23, 42, 0.05), 0 1px 2px -1px rgba(15, 23, 42, 0.05)',
        'saas-lg': '0 10px 30px -5px rgba(15, 23, 42, 0.08), 0 4px 12px -2px rgba(15, 23, 42, 0.03)',
      },
      backgroundImage: {
        'aurora-glow': 'radial-gradient(circle at 50% -20%, rgba(59, 130, 246, 0.08), rgba(6, 182, 212, 0.04), rgba(255, 255, 255, 0))',
        'card-gradient': 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.85) 100%)',
      }
    },
  },
  plugins: [],
}
