const ExtractTextPlugin = require('extract-text-webpack-plugin');
const path = require('path');
const {config} = require('../config');

function assetsPath(_path) {
  return path.posix.join('static', _path);
}

function cssLoaders(options) {
  options = options || {};

  // Generate loader string to be used with extract text plugin
  function generateLoaders(loader, loaderOptions) {
    const loaders = [
      {
        loader: 'css-loader',
        options: {
          sourceMap: config.cssSourceMap,
        },
      },
    ];

    // BUG: do we need a flag? currently it's always true.
    if (options.usePostCSS) {
      // loaders.push({
      //   loader: 'postcss-loader',
      //   options: {
      //     sourceMap: config.cssSourceMap,
      //   },
      // });
    }

    if (loader) {
      loaders.push({
        loader: `${loader}-loader`,
        options: Object.assign({}, loaderOptions, {
          sourceMap: config.cssSourceMap,
        }),
      });
    }

    // Extract CSS when that option is specified
    // (which is the case during production build)
    if (options.extract) {
      return ExtractTextPlugin.extract({
        use: loaders,
        fallback: 'vue-style-loader',
      });
    }
    return ['vue-style-loader'].concat(loaders);
  }

  // https://vue-loader.vuejs.org/en/configurations/extract-css.html
  return {
    css: generateLoaders(),
    less: generateLoaders('less'),
    sass: generateLoaders('sass', {indentedSyntax: true}), // BUG: remove it?
    scss: generateLoaders('sass'),
  };
}

// Generate loaders for standalone style files (outside of .vue)
function styleLoaders(options) {
  return Object.entries(cssLoaders(options)).map(([extension, loader]) => ({
    test: new RegExp(`\\.${extension}$`),
    use: loader,
  }));
}

module.exports = {assetsPath, cssLoaders, styleLoaders};
