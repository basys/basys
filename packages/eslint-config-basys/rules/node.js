module.exports = {
  env: {
    node: true,
  },
  rules: {
    // disallow use of the Buffer() constructor
    // http://eslint.org/docs/rules/no-buffer-constructor
    'no-buffer-constructor': 'error',

    // disallow use of new operator with the require function
    'no-new-require': 'error',

    // disallow string concatenation with __dirname and __filename
    // http://eslint.org/docs/rules/no-path-concat
    'no-path-concat': 'error',
  },
};
