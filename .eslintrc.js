module.exports = {
  root: true,
  extends: [
    'prettier',
  ],
  parserOptions: {
    ecmaVersion: 8,
    sourceType: 'module',
    impliedStrict: true,
  },
  env: {
    es6: true,
    node: true,
  },
  plugins: [
    'prettier',
  ],
  rules: {
    'prettier/prettier': ['error', {
      singleQuote: true,
      trailingComma: 'all',
      bracketSpacing: false,
      printWidth: 130,
    }],
  },
};
