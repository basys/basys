const path = require('path');

function assetsPath(_path) {
  return path.posix.join('static', _path);
}

// Generate loader string to be used with extract text plugin
function generateLoaders(config, extension, usePostCSS) {
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

  if (extension !== 'css') {
    loaders.push({
      loader: extension !== 'scss' ? `${extension}-loader` : 'sass-loader',
      options: {sourceMap: config.sourceMap},
    });
  }

  // Extract CSS when that option is specified (which is the case during production build)
  if (config.env === 'prod') {
    const MiniCssExtractPlugin = require('mini-css-extract-plugin');
    return [MiniCssExtractPlugin.loader].concat(loaders);
  }
  return ['vue-style-loader'].concat(loaders);
}

module.exports = {assetsPath, generateLoaders};
