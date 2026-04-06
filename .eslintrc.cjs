/** @type {import("eslint").Linter.Config} */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  plugins: ['@typescript-eslint', 'react', 'react-hooks'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'prettier',
  ],
  settings: {
    react: { version: 'detect' },
  },
  rules: {
    // Security: ban dangerous patterns absolutely
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',

    // React 18 — no need to import React in every file
    'react/react-in-jsx-scope': 'off',

    // No any — period. Use unknown and narrow it.
    '@typescript-eslint/no-explicit-any': 'error',

    // Consistent type imports — critical for verbatimModuleSyntax
    '@typescript-eslint/consistent-type-imports': [
      'error',
      { prefer: 'type-imports' }
    ],

    // Unused vars are bugs waiting to happen
    '@typescript-eslint/no-unused-vars': [
      'error',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }
    ],
  },
  ignorePatterns: ['dist/', 'node_modules/', '*.js', '*.mjs', '*.cjs'],
};