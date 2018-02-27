const path = require('path');
const resolve = require('postcss-import/lib/resolve-id');

module.exports = function({file, options}) {
  const config = options;
  // BUG: existing outdated prefixes don't get removed
  const autoprefixer = require('autoprefixer')({browsers: config.browsers});
  if (file) {
    // Applied to asset styles
    // BUG: Apply parser and some plugins for css/scss/less files? Expose appName and env depending in scss/less files?
    //      Configure ~/@ in imports.
    return {
      plugins: [autoprefixer],
    };
  } else {
    // Applied to styles extracted from .vue files
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
        autoprefixer,
      ],
    };
  }
};
