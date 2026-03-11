import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './ui/**/*.{ts,tsx}',
    './theme/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          app: '#09090b',
          card: '#18181b',
          overlay: '#27272a',
        },
        text: {
          primary: '#f4f4f5',
          secondary: '#a1a1aa',
          muted: '#71717a',
          inverse: '#09090b',
        },
        border: {
          DEFAULT: '#27272a',
          subtle: '#1f1f23',
          strong: '#3f3f46',
        },
        status: {
          success: '#22c55e',
          active: '#3b82f6',
          warning: '#eab308',
          danger: '#ef4444',
          orchestrator: '#8b5cf6',
        },
      },
      spacing: {
        xs: '0.25rem',
        sm: '0.5rem',
        md: '1rem',
        lg: '1.5rem',
        xl: '2rem',
        '2xl': '3rem',
        '3xl': '4rem',
        '4xl': '6rem',
      },
      borderRadius: {
        card: '0.75rem',
        badge: '9999px',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
    },
  },
  plugins: [],
}

export default config
