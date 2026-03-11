import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './ui/**/*.{js,ts,jsx,tsx,mdx}',
    './theme/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          app: '#09090b',
          card: '#18181b',
          hover: '#27272a',
        },
        text: {
          primary: '#f4f4f5',
          secondary: '#a1a1aa',
          muted: '#71717a',
          disabled: '#52525b',
        },
        border: {
          default: '#27272a',
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
        card: '1.25rem',
        section: '2rem',
      },
      borderRadius: {
        card: '0.875rem',
        badge: '0.375rem',
      },
      fontFamily: {
        sans: ['var(--font-geist)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
