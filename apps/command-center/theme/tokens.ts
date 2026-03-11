export const tokens = {
  color: {
    zinc950: '#09090b',
    zinc900: '#18181b',
    zinc800: '#27272a',
    zinc700: '#3f3f46',
    zinc600: '#52525b',
    zinc500: '#71717a',
    zinc400: '#a1a1aa',
    zinc300: '#d4d4d8',
    zinc200: '#e4e4e7',
    zinc100: '#f4f4f5',
  },

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
    default: '#3f3f46',
    focus: '#a1a1aa',
  },

  status: {
    done: '#22c55e',
    'in-progress': '#3b82f6',
    review: '#eab308',
    blocked: '#ef4444',
    orchestrator: '#8b5cf6',
    success: '#22c55e',
    warning: '#eab308',
    error: '#ef4444',
    info: '#3b82f6',
  },

  spacing: {
    0: '0px',
    1: '0.25rem',
    2: '0.5rem',
    3: '0.75rem',
    4: '1rem',
    5: '1.25rem',
    6: '1.5rem',
    8: '2rem',
    10: '2.5rem',
    12: '3rem',
    16: '4rem',
  },

  radius: {
    sm: '0.25rem',
    md: '0.375rem',
    lg: '0.5rem',
    full: '9999px',
  },

  typography: {
    fontFamily: {
      sans: 'var(--font-geist), ui-sans-serif, system-ui, sans-serif',
      mono: 'var(--font-mono), ui-monospace, monospace',
    },
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem',
      '4xl': '2.25rem',
    },
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
  },
} as const;
