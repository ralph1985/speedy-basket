module.exports = {
  root: true,
  env: {
    es2022: true,
    node: true,
  },
  extends: ['eslint:recommended', 'prettier'],
  overrides: [
    {
      files: ['apps/mobile/**/*.{ts,tsx}'],
      env: {
        browser: true,
      },
      parser: '@typescript-eslint/parser',
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
      plugins: ['@typescript-eslint', 'react', 'react-hooks', 'react-native'],
      settings: {
        react: {
          version: 'detect',
        },
      },
      extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:react/recommended',
        'plugin:react-hooks/recommended',
        'plugin:react-native/all',
        'prettier',
      ],
      rules: {
        'react/react-in-jsx-scope': 'off',
        'react-native/no-inline-styles': 'off',
        'no-unused-vars': 'off',
        '@typescript-eslint/no-unused-vars': [
          'error',
          { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
        ],
      },
    },
  ],
};
