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
      '**/.wrangler/**',
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
      'unicorn/catch-error-name': 'off',
      'unicorn/prefer-string-replace-all': 'off',
      'unicorn/prefer-number-properties': 'off',
      'unicorn/prefer-global-this': 'off',
      'unicorn/no-nested-ternary': 'off',
      'unicorn/switch-case-braces': 'off',
      'unicorn/prefer-string-raw': 'off',
      'unicorn/prefer-optional-catch-binding': 'off',
      'unicorn/prefer-spread': 'off',
      'unicorn/no-array-sort': 'off',
      'unicorn/no-negated-condition': 'off',
      'unicorn/text-encoding-identifier-case': 'off',
      'unicorn/no-array-push-multiple': 'off',
      'unicorn/no-array-for-each': 'off',
      'unicorn/prefer-add-event-listener': 'off',
      'unicorn/prefer-blob-reading-methods': 'off',
      'unicorn/prefer-set-has': 'off',
      'unicorn/no-array-reduce': 'off',
      'unicorn/prefer-export-from': 'off',
      'unicorn/no-immediate-mutation': 'off',
      'unicorn/prefer-single-call': 'off',
      'unicorn/prefer-array-some': 'off',
      'unicorn/prefer-regexp-test': 'off',
      'unicorn/prefer-array-find': 'off',
      'unicorn/prefer-modern-math-apis': 'off',
      'unicorn/prefer-query-selector': 'off',
      'unicorn/no-useless-undefined': 'off',
      'unicorn/no-array-callback-reference': 'off',
      'unicorn/prefer-node-protocol': 'off',

      // ── Security tuning — false positives for internal tooling ──
      'security/detect-object-injection': 'off',
      'security/detect-non-literal-fs-filename': 'off',

      // ── SonarJS tuning ──
      'sonarjs/cognitive-complexity': ['warn', 15],
      'sonarjs/void-use': 'off',
      'sonarjs/no-nested-conditional': 'off',
      'sonarjs/slow-regex': 'warn',
      'sonarjs/no-ignored-exceptions': 'off',
      'sonarjs/sonar-max-params': 'off',
      'sonarjs/function-return-type': 'off',
      'sonarjs/no-empty-test-file': 'off',
      'sonarjs/no-internal-api-use': 'off',
      'sonarjs/sonar-max-lines-per-function': 'off',
      'sonarjs/todo-tag': 'off',
      'sonarjs/fixme-tag': 'off',
      'sonarjs/unused-import': 'off',
      'sonarjs/sonar-no-unused-vars': 'off',
      'sonarjs/redundant-type-aliases': 'off',
      'sonarjs/no-dead-store': 'off',
      'sonarjs/no-redundant-assignments': 'off',
      'sonarjs/no-all-duplicated-branches': 'off',
      'sonarjs/no-gratuitous-expressions': 'off',
      'sonarjs/class-name': 'off',
      'sonarjs/max-union-size': 'off',
      'sonarjs/function-call-arguments-new-line': 'off',

      // ── TypeScript tuning — non-null assertions OK in app code ──
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/unified-signatures': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/triple-slash-reference': 'off',
      '@typescript-eslint/no-dynamic-delete': 'off',

      'sonarjs/no-nested-functions': 'off',
      'sonarjs/no-unused-vars': 'off',
      'sonarjs/no-redundant-boolean': 'off',

      'no-constant-binary-expression': 'off',

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

  // ── Portal app — suppress rules that conflict with Next.js internal ESLint ──
  {
    files: ['apps/portal/**'],
    rules: {
      'sonarjs/cognitive-complexity': 'off',
      'sonarjs/slow-regex': 'off',
    },
  },
);
