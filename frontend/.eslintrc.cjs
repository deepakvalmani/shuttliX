module.exports = {
  root: true,
  env: { browser: true, es2022: true },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended',
  ],
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
  settings: { react: { version: 'detect' } },
  rules: {
    'no-unused-vars':         ['warn', { argsIgnorePattern: '^_' }],
    'react/prop-types':       'off',   // using TypeScript or runtime checks
    'react-hooks/rules-of-hooks':     'error',
    'react-hooks/exhaustive-deps':    'warn',
    'no-console':             ['warn', { allow: ['warn', 'error'] }],
    'prefer-const':           'error',
  },
  ignorePatterns: ['dist/', 'node_modules/'],
};
