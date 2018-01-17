const restrictedGlobals = require('eslint-restricted-globals');

module.exports = {
  rules: {
    // disallow deletion of variables
    'no-delete-var': 'error',

    // disallow labels that share a name with a variable
    // http://eslint.org/docs/rules/no-label-var
    'no-label-var': 'error',

    // disallow specific globals
    'no-restricted-globals': ['error', 'isFinite', 'isNaN'].concat(restrictedGlobals),

    // disallow declaration of variables already declared in the outer scope
    'no-shadow': 'error',

    // disallow shadowing of names such as arguments
    'no-shadow-restricted-names': 'error',

    // disallow use of undeclared variables unless mentioned in a /*global */ block
    'no-undef': 'error',

    // disallow use of undefined when initializing variables
    'no-undef-init': 'error',

    // disallow declaration of variables that are not used in the code
    'no-unused-vars': ['error', {vars: 'all', args: 'none', ignoreRestSiblings: true}],
  },
};
