const path = require('path');
const resolve = require('postcss-import/lib/resolve-id');

// Applied to CSS inside .vue files and .css files in assets/ directory
module.exports = function({file, options}) {
  const config = options;
  return {
    parser: 'postcss-scss',
    plugins: [
      require('postcss-import', {
        resolve(id, basedir, importOptions) {
          let filePath = id;
          if (id.startsWith('@/')) {
            basedir = path.join(config.projectDir, 'assets');
            filePath = `./${id.substr(2)}`;
          } else if (id.startsWith('~/')) {
            basedir = path.join(config.projectDir, 'src');
            filePath = `./${id.substr(2)}`;
          }
          return resolve(filePath, basedir, importOptions).catch(e => {
            e.code = 'RESOLVE_POSTCSS_IMPORT';
            e.resolvePath = id;
            throw e;
          });
        },
      }),
      require('postcss-simple-vars', {
        variables() {
          return {appName: config.appName, env: config.appName};
        },
      }),
      require('postcss-conditionals', {}),
      require('postcss-nested', {}),
    ],
  };
};
