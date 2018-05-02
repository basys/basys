const chalk = require('chalk');
const FriendlyErrorsPlugin = require('friendly-errors-webpack-plugin');
const path = require('path');

class FriendlyErrorsWebpackPlugin extends FriendlyErrorsPlugin {
  constructor(config) {
    super();

    function wrapError(error, message, file = null) {
      // Override error message to be used in dev server browser overlay
      error.webpackError.message = message;
      error.webpackError.file =
        file ||
        chalk.bgRed.black(' error ') + (error.file ? ` in ${error.file.split('!').pop()}` : '');
      error.webpackError.module = null;

      const res = Object.assign({}, error, {message, severity: 1000, origin: null});
      if (file) res.file = file;
      return res;
    }

    this.transformers = [
      function(error) {
        if (error.name === 'ModuleNotFoundError') {
          const module = error.webpackError.dependencies[0].request;
          let message;
          if (module.startsWith('./') || module.startsWith('../')) {
            message = `Module not found: ${error.webpackError.error.message}`;
          } else {
            message = `Module not found: Can't resolve '${module}'`;
          }
          return wrapError(error, message);
        }

        // Vue html parsing error (dev env)
        if (error.name === 'ModuleError' && error.message.includes('Error compiling template:')) {
          return wrapError(
            error,
            error.message.substr(error.message.indexOf('Error compiling template:')),
          );
        }

        // BUG: so far only happened due to a bug in code loading vue files
        if (error.name === 'ModuleParseError') {
          return wrapError(error, error.webpackError.message);
        }

        if (error.name === 'ModuleBuildError') {
          const err = error.webpackError.error;

          // Pug syntax error in Vue file
          if (err.code && err.code.startsWith('PUG:')) {
            return wrapError(error, err.message);
          }

          // Vue html parsing error (prod env)
          if (err.name === 'SyntaxError' && err.snippet) {
            return wrapError(error, `${err.name}: ${err.message}\n${err.snippet}`);
          }

          const cssError = config.env !== 'prod' ? err : err.error;
          if (cssError) {
            // Style syntax error in a file listed in config.styles or its imports
            if (cssError.name === 'Syntax Error') {
              return wrapError(
                error,
                cssError.message.replace(/^Syntax Error\s*/, 'Syntax error: '),
              );
            }

            // PostCSS syntax error in a .vue file or its imports
            if (cssError.name === 'CssSyntaxError') {
              return wrapError(
                error,
                `Syntax error: ${cssError.reason} (${cssError.line}:${
                  cssError.column
                })\n\n${cssError.showSourceCode()}`,
                path.relative(config.projectDir, cssError.file),
              );
            }

            // SCSS syntax error
            if (cssError.formatted && cssError.formatted.startsWith('Error: Invalid CSS')) {
              return wrapError(
                error,
                `${cssError.message
                  .split('\n')
                  .slice(1, -1)
                  .join('\n')} (line ${cssError.line}, column ${cssError.column})`,
              );
            }

            // LESS syntax error
            if (cssError.constructor.name === 'LessError') {
              return wrapError(
                error,
                `${cssError.message
                  .split('\n')
                  .slice(2, -1)
                  .join('\n')} (line ${cssError.line}, column ${cssError.column})`,
              );
            }

            // Missing style module import in .vue file
            if (cssError.name === 'Error' && cssError.message.indexOf('Failed to find') >= 0) {
              return wrapError(error, cssError.message);
            }
          }

          // Babel syntax error
          if (err.code === 'BABEL_PARSE_ERROR') {
            let message = error.message.replace(/^Module build failed.*:\s/, 'Syntax Error: ');
            message = `${message}\n`.replace(/^\s*at\s.*:\d+:\d+[\s)]*\n/gm, ''); // Clean stack trace
            return wrapError(error, message);
          }

          // BUG: is it still needed?
          // Happens when resolving an import with postcss-import fails
          // if (err.code === 'RESOLVE_POSTCSS_IMPORT') {
          //   return wrapError(error, `Cannot resolve '${err.resolvePath}' module in <style> block`);
          // }
        }

        return error;
      },
    ];

    this.formatters = [require('friendly-errors-webpack-plugin/src/formatters/defaultError')];
  }
}

module.exports = FriendlyErrorsWebpackPlugin;
