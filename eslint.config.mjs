import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import sonarjs from 'eslint-plugin-sonarjs';
import security from 'eslint-plugin-security';
import unicorn from 'eslint-plugin-unicorn';
import globals from 'globals';

export default tseslint.config(
  // ── Global ignores ──
  {
    ignores: [
      '**/node_modules/**',
      '**/.next/**',
      '**/dist/**',
      '**/.turbo/**',
      '**/coverage/**',
      '**/next-env.d.ts',
      '.claude/**',
    ],
  },

  // ── Base JS recommended ──
  js.configs.recommended,

  // ── TypeScript strict ──
  ...tseslint.configs.strict,

  // ── SonarJS recommended ──
  sonarjs.configs.recommended,

  // ── Security recommended ──
  security.configs.recommended,

  // ── Unicorn recommended ──
  unicorn.configs['flat/recommended'],

  // ── Project-wide settings ──
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021,
      },
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    rules: {
      // ── Unicorn tuning for Next.js / React ──
      'unicorn/prevent-abbreviations': 'off',
      'unicorn/filename-case': 'off',
      'unicorn/no-null': 'off',
      'unicorn/prefer-module': 'off',
      'unicorn/no-process-exit': 'off',

      // ── Security tuning — false positives for internal tooling ──
      'security/detect-object-injection': 'off',
      'security/detect-non-literal-fs-filename': 'off',

      // ── SonarJS tuning ──
      'sonarjs/cognitive-complexity': ['warn', 15],

      // ── TypeScript tuning ──
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },

  // ── React / TSX files ──
  {
    files: ['**/*.tsx'],
    rules: {
      'unicorn/no-keyword-prefix': 'off',
    },
  },
);
