// BUG: https://eslint.org/docs/user-guide/configuring
// BUG: https://github.com/prettier/eslint-config-prettier
// BUG: "eslint-plugin-node": "^5.2.0",
// BUG: "eslint-plugin-promise": "^3.4.0",
module.exports = {
  root: true,
  extends: [
    'airbnb-base',
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
    // BUG: maybe use https://www.npmjs.com/package/eslint-import-resolver-webpack
    'import/extensions': ['.js', '.vue'],
    // 'html/indent': '+2',
  },
  env: {
    browser: true,
    // BUG: add more
    // commonjs: true,
    // es6: true,
    // jest: true,
    // node: true,
  },
  globals: {
    // BUG: differs for front-end/backend code
    Vue: true,
    BASYS_CONFIG: true,
  },
  plugins: [
    'html', // BUG: not compatible with a eslint-plugin-vue
    'prettier',
    // BUG: look at https://github.com/babel/eslint-plugin-babel
  ],
  rules: {
    'prettier/prettier': [
      'error',
      {
        // BUG: allow to override it (already possible?)
        singleQuote: true,
        trailingComma: 'all',
        printWidth: 100,
      },
    ],
    'import/no-extraneous-dependencies': 'off', // BUG: shouldn't report built-in dependencies
    // 'html/report-bad-indent': 'error',
    // 'vue/no-duplicate-attributes': 'error',

    // allow async-await
    // 'generator-star-spacing': 0,
    // allow debugger during development
    // 'no-debugger': process.env.NODE_ENV === 'production' ? 2 : 0, // BUG: fix NODE_ENV usage?
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
