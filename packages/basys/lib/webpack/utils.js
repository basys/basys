const ExtractTextPlugin = require('extract-text-webpack-plugin');
const path = require('path');

function assetsPath(_path) {
  return path.posix.join('static', _path);
}

// Generate loader string to be used with extract text plugin
function generateLoaders(config, usePostCSS, loader) {
  const loaders = [
    {
      loader: 'css-loader',
      options: {
        sourceMap: config.sourceMap,
      },
    },
  ];

  if (usePostCSS) {
    loaders.push({
      loader: 'postcss-loader',
      options: {
        sourceMap: config.sourceMap,
        config: {
          path: __dirname,
          ctx: config,
        },
      },
    });
  }

  if (loader) {
    loaders.push({
      loader: loader !== 'scss' ? `${loader}-loader` : 'sass-loader',
      options: Object.assign({sourceMap: config.sourceMap}, loader === 'sass' ? {indentedSyntax: true} : {}),
    });
  }

  // Extract CSS when that option is specified (which is the case during production build)
  if (config.env === 'prod') {
    return ExtractTextPlugin.extract({
      use: loaders,
      fallback: 'vue-style-loader',
    });
  }
  return ['vue-style-loader'].concat(loaders);
}

module.exports = {assetsPath, generateLoaders};
