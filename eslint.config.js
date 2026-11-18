import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';
import ts from 'typescript-eslint';

export default defineConfig(
  {
    ignores: [
      '**/node_modules/',
      '**/.svelte-kit/',
      '**/build/',
      '**/dist/',
      '**/.wrangler/',
      'test-results/',
    ],
  },
  js.configs.recommended,
  ...ts.configs.recommended,
  ...svelte.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
  },
  {
    // TypeScript already checks undefined names, including Workers globals
    files: ['**/*.ts', '**/*.svelte'],
    rules: {
      'no-undef': 'off',
      // `_name` marks a value deliberately ignored
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', destructuredArrayIgnorePattern: '^_' },
      ],
    },
  },
  {
    files: ['**/*.svelte', '**/*.svelte.ts'],
    languageOptions: {
      parserOptions: { parser: ts.parser },
    },
  },
);
