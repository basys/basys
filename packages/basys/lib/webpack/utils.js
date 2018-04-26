function generateLoaders(config, format, usePostcss = false) {
  const loaders = [
    config.env !== 'dev'
      ? require('mini-css-extract-plugin').loader
      : {
          loader: 'vue-style-loader',
          options: {sourceMap: config.cssSourceMap},
        },
    {
      loader: 'css-loader',
      options: {
        importLoaders: format === 'less' || format === 'sass' || usePostcss ? 1 : 0,
        sourceMap: config.cssSourceMap,
      },
    },
  ];

  if (format === 'less' || format === 'sass') {
    loaders.push({
      loader: `${format}-loader`,
      options: {sourceMap: config.cssSourceMap},
    });
  } else if (usePostcss) {
    loaders.push({
      loader: 'postcss-loader',
      options: {
        sourceMap: config.cssSourceMap,
        config: {
          path: __dirname,
          ctx: config,
        },
      },
    });
  }

  return loaders;
}

module.exports = {generateLoaders};
