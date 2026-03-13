import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FlatCompat } from '@eslint/eslintrc';
import rootConfig from '../../eslint.config.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  { ignores: ['next-env.d.ts'] },
  ...rootConfig,
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
];

export default eslintConfig;
