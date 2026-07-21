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
          dark: '#080C14',       // Deep primary background
          darker: '#04060A',     // Even darker background
          card: '#111827',       // Core card background (semi-transparent glass)
          border: '#1F2937',     // Premium sub-borders
          textMuted: '#9CA3AF',  // Muted grey text
          blue: '#3B82F6',       // Electric Blue
          cyan: '#06B6D4',       // Cyan
          emerald: '#10B981',    // Emerald Green
          violet: '#8B5CF6',     // Violet Purple
          rose: '#F43F5E',       // Rose Red
          amber: '#F59E0B',      // Amber Accent
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        manrope: ['Manrope', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 25px rgba(6, 182, 212, 0.15)',
        'glow-blue': '0 0 25px rgba(59, 130, 246, 0.25)',
        'glow-emerald': '0 0 25px rgba(16, 185, 129, 0.25)',
        'glow-rose': '0 0 25px rgba(244, 63, 94, 0.25)',
      },
      backgroundImage: {
        'aurora-glow': 'radial-gradient(circle at 50% -20%, rgba(59, 130, 246, 0.18), rgba(6, 182, 212, 0.08), rgba(0, 0, 0, 0))',
        'card-gradient': 'linear-gradient(135deg, rgba(25, 30, 45, 0.7) 0%, rgba(17, 24, 39, 0.5) 100%)',
      }
    },
  },
  plugins: [],
}
