module.exports = {
  root: true,
  extends: [
    require.resolve('./rules/best-practices'),
    require.resolve('./rules/errors'),
    require.resolve('./rules/node'),
    require.resolve('./rules/style'),
    require.resolve('./rules/variables'),
    require.resolve('./rules/es6'),
    require.resolve('./rules/imports'),
    'prettier',
    // BUG: Currently doesn't produce any output because of eslint-plugin-html, which must be applies for prettier to work
    //      (see https://github.com/prettier/prettier/issues/2097). Update to version 4.
    // BUG: Rules must be activated explicitly
    'plugin:vue/recommended',
  ],
  parserOptions: {
    ecmaVersion: 8,
    sourceType: 'module',
    impliedStrict: true,
  },
  settings: {
    // 'html/indent': '+2',
  },
  env: {
    browser: true,
    // BUG: clean up
    // commonjs: true,
    // es6: true,
    // jest: true,
    // node: true,
  },
  globals: {
    Vue: true, // BUG: front-end only
    basys: true,
  },
  plugins: [
    'html', // BUG: not compatible with a eslint-plugin-vue
    'prettier',
  ],
  rules: {
    'prettier/prettier': [
      'error',
      {
        singleQuote: true,
        trailingComma: 'all',
        bracketSpacing: false,
        printWidth: 100,
      },
    ],
    // 'html/report-bad-indent': 'error',
    // 'vue/no-duplicate-attributes': 'error',
  },
  overrides: [
    {
      files: ['tests/e2e/*.js'],
      globals: {
        fixture: false,
        test: false,
      },
    },
  ],
};
