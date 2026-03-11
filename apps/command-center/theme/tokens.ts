export interface ColorTokens {
  950: string;
  900: string;
  800: string;
  700: string;
  600: string;
  500: string;
  400: string;
  300: string;
  200: string;
  100: string;
}

export interface SurfaceTokens {
  app: string;
  card: string;
  hover: string;
}

export interface TextTokens {
  primary: string;
  secondary: string;
  muted: string;
  disabled: string;
}

export interface BorderTokens {
  default: string;
  focus: string;
  error: string;
}

export interface StatusTokens {
  done: string;
  'in-progress': string;
  review: string;
  blocked: string;
  orchestrator: string;
  success: string;
  warning: string;
  error: string;
  info: string;
}

export interface SpacingTokens {
  0: string;
  1: string;
  2: string;
  3: string;
  4: string;
  5: string;
  6: string;
  8: string;
  10: string;
  12: string;
  16: string;
}

export interface RadiusTokens {
  none: string;
  sm: string;
  md: string;
  lg: string;
  full: string;
}

export interface TypographyTokens {
  fontFamily: {
    sans: string;
    mono: string;
  };
  fontSize: {
    xs: string;
    sm: string;
    base: string;
    lg: string;
    xl: string;
    '2xl': string;
    '3xl': string;
  };
  fontWeight: {
    normal: string;
    medium: string;
    semibold: string;
    bold: string;
  };
  lineHeight: {
    tight: string;
    snug: string;
    normal: string;
    relaxed: string;
  };
}

export interface Tokens {
  color: ColorTokens;
  surface: SurfaceTokens;
  text: TextTokens;
  border: BorderTokens;
  status: StatusTokens;
  spacing: SpacingTokens;
  radius: RadiusTokens;
  typography: TypographyTokens;
}

export const tokens: Tokens = {
  color: {
    950: '#09090b',
    900: '#18181b',
    800: '#27272a',
    700: '#3f3f46',
    600: '#52525b',
    500: '#71717a',
    400: '#a1a1aa',
    300: '#d4d4d8',
    200: '#e4e4e7',
    100: '#f4f4f5',
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
    error: '#ef4444',
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
    1: '4px',
    2: '8px',
    3: '12px',
    4: '16px',
    5: '20px',
    6: '24px',
    8: '32px',
    10: '40px',
    12: '48px',
    16: '64px',
  },

  radius: {
    none: '0px',
    sm: '2px',
    md: '6px',
    lg: '8px',
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
    },
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
    lineHeight: {
      tight: '1.25',
      snug: '1.375',
      normal: '1.5',
      relaxed: '1.625',
    },
  },
};
