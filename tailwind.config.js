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
          blue: '#0052CC',       // Clinical Electric Blue (Stitch Primary)
          cyan: '#00B8D9',       // Data Cyan
          emerald: '#10B981',    // Emerald Success
          violet: '#0052CC',     // Mapped to Clinical Blue
          rose: '#EF4444',       // Soft Danger Red
          amber: '#F59E0B',      // Amber Accent
        },
        // Stitch Design System Token Map
        primary: '#003d9b',
        'primary-container': '#0052cc',
        'on-primary': '#ffffff',
        'on-primary-container': '#c4d2ff',
        secondary: '#00687b',
        'secondary-container': '#50dcff',
        'on-secondary-container': '#005f71',
        tertiary: '#004e32',
        'tertiary-container': '#006844',
        'on-tertiary-container': '#72e9af',
        background: '#f7f9fb',
        'on-background': '#191c1e',
        surface: '#f7f9fb',
        'surface-bright': '#f7f9fb',
        'surface-container-lowest': '#ffffff',
        'surface-container-low': '#f2f4f6',
        'surface-container': '#eceef0',
        'surface-container-high': '#e6e8ea',
        'surface-container-highest': '#e0e3e5',
        'on-surface': '#191c1e',
        'on-surface-variant': '#434654',
        outline: '#737685',
        'outline-variant': '#c3c6d6',
        error: '#ba1a1a',
        'error-container': '#ffdad6',
        'on-error-container': '#93000a',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        geist: ['Geist', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
        manrope: ['Manrope', 'sans-serif'],
        'mono-data': ['Geist', 'monospace'],
        'headline-lg': ['Geist', 'sans-serif'],
        'headline-md': ['Geist', 'sans-serif'],
        'headline-sm': ['Geist', 'sans-serif'],
        'display-lg': ['Geist', 'sans-serif'],
        'body-lg': ['Inter', 'sans-serif'],
        'body-md': ['Inter', 'sans-serif'],
        'body-sm': ['Inter', 'sans-serif'],
        'label-md': ['Geist', 'sans-serif'],
      },
      spacing: {
        'touch-target': '44px',
        'container-padding': '24px',
        'section-gap': '48px',
        gutter: '16px',
        unit: '4px',
      },
      boxShadow: {
        glow: '0 4px 20px -2px rgba(0, 82, 204, 0.12)',
        'glow-blue': '0 4px 25px rgba(0, 82, 204, 0.18)',
        'glow-emerald': '0 4px 25px rgba(16, 185, 129, 0.18)',
        'glow-rose': '0 4px 25px rgba(239, 68, 68, 0.18)',
        saas: '0 4px 20px rgba(0, 82, 204, 0.04)',
        'saas-lg': '0 10px 30px -5px rgba(0, 52, 204, 0.08), 0 4px 12px -2px rgba(0, 52, 204, 0.03)',
        stitch: '0px 4px 20px rgba(0, 82, 204, 0.04)',
      },
      backgroundImage: {
        'aurora-glow': 'radial-gradient(circle at 50% -20%, rgba(0, 82, 204, 0.08), rgba(80, 220, 255, 0.04), rgba(255, 255, 255, 0))',
        'card-gradient': 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(247, 249, 251, 0.85) 100%)',
        'ai-glow': 'radial-gradient(circle at center, rgba(80, 220, 255, 0.15) 0%, transparent 70%)',
      }
    },
  },
  plugins: [],
}
