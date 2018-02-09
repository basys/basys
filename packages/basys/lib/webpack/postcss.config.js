const path = require('path');
const resolve = require('postcss-import/lib/resolve-id');

module.exports = function({file, options}) {
  if (file) {
    // BUG: Apply parser and some plugins for css/sass/less files? Expose appName and env depending in sass/less files?
    //      Configure ~/@ in imports.
    return {};
  } else {
    return {
      parser: 'postcss-scss',
      plugins: {
        'postcss-import': {
          resolve(id, basedir, importOptions) {
            let filePath = id;
            if (id.startsWith('@/')) {
              basedir = path.join(options.projectDir, 'assets');
              filePath = './' + id.substr(2);
            } else if (id.startsWith('~/')) {
              basedir = path.join(options.projectDir, 'src');
              filePath = './' + id.substr(2);
            }
            return resolve(filePath, basedir, importOptions).catch(e => {
              e.code = 'RESOLVE_POSTCSS_IMPORT';
              e.resolvePath = id;
              throw e;
            });
          },
        },
        'postcss-simple-vars': {
          variables() {
            return {appName: options.appName, env: options.appName};
          },
        },
        'postcss-conditionals': {},
        'postcss-nested': {},
      },
    };
  }
};
