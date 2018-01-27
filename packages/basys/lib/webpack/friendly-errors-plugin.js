const FriendlyErrorsPlugin = require('friendly-errors-webpack-plugin');

class FriendlyErrorsWebpackPlugin extends FriendlyErrorsPlugin {
  constructor(options) {
    super();

    this.transformers = [
      require('friendly-errors-webpack-plugin/src/transformers/moduleNotFound'),
      function(error) {
        if (error.name === 'ModuleError' && error.message.includes('Error compiling template:')) {
          // BUG: add colors to the error
          return Object.assign({}, error, {
            message: error.message.substr(error.message.indexOf('Error compiling template:')),
            severity: 1000,
            origin: null,
          });
        }

        if (error.name === 'ModuleBuildError' && error.message.indexOf('SyntaxError') >= 0) {
          // Clean the message. Match until the last semicolon followed by a space.
          // This should match:
          // linux => "(SyntaxError: )Unexpected token (5:11)"
          // windows => "(SyntaxError: C:/projects/index.js: )Unexpected token (5:11)"
          let message = error.message.replace(/^Module build failed.*:\s/, 'Syntax Error: ');

          // Clean stack trace
          message = (message + '\n').replace(/^\s*at\s.*:\d+:\d+[\s\)]*\n/gm, ''); // at ... ...:x:y

          return Object.assign({}, error, {
            message,
            severity: 1000,
            origin: null,
          });
        }

        return error;
      },
    ];

    this.formatters = [
      require('friendly-errors-webpack-plugin/src/formatters/moduleNotFound'),
      require('friendly-errors-webpack-plugin/src/formatters/defaultError'),
    ];
  }
}

module.exports = FriendlyErrorsWebpackPlugin;
