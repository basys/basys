const FriendlyErrorsPlugin = require('friendly-errors-webpack-plugin');
const webpack = require('webpack');
const Server = require('webpack-dev-server/lib/Server');
const merge = require('webpack-merge');
const {config} = require('../config');
const BackendWebpackPlugin = require('./backend-plugin');
const baseWebpackConfig = require('./base-config');
const {generateEntries, styleLoaders} = require('./utils');

function devWebpackConfigs() {
  const webpackConfigs = [
    merge(baseWebpackConfig('frontend'), {
      module: {
        rules: styleLoaders({usePostCSS: true}),
      },
      devtool: config.jsSourceMap ? 'eval-source-map' : false,
      output: {
        filename: '[name].js',
      },
      plugins: [
        new webpack.HotModuleReplacementPlugin(),
        new webpack.NamedModulesPlugin(), // HMR shows correct file names in console on update
        // BUG: fix it and set quiet=true - so far no errors are printed
        new webpack.NoEmitOnErrorsPlugin(),
        new FriendlyErrorsPlugin({
          compilationSuccessInfo: {
            messages: [`Your application is running here: http://${config.host}:${config.port}`],
          },
        }),
      ],
    }),
  ];

  if (config.type === 'web') {
    webpackConfigs.push(
      merge(baseWebpackConfig('backend'), {
        plugins: [new BackendWebpackPlugin()],
      }),
    );
  }

  return webpackConfigs;
}

function startDevServer() {
  return new Promise((resolve, reject) => {
    generateEntries();

    const compiler = webpack(devWebpackConfigs());
    compiler.apply(new webpack.ProgressPlugin());

    compiler.plugin('done', () => resolve(server));
    compiler.plugin('failed', reject);

    const server = new Server(compiler, {
      clientLogLevel: 'info', // BUG: think about it, expose to config? use 'warning'?
      hot: true,
      compress: true,
      host: config.host,
      port: config.port,
      overlay: true,
      publicPath: config.assetsPublicPath,
      proxy: config.type === 'web' ? {'/': `http://${config.host}:${config.backendPort}`} : {}, // BUG: allow to add more proxies?
      // BUG: webpack errors aren't printed when quiet==true
      quiet: true, // necessary for FriendlyErrorsPlugin
      watchOptions: {
        poll: config.poll,
        ignored: 'node_modules/**',
      },
      contentBase: false,
      stats: {
        cached: false,
        cachedAssets: false,
      },
    });

    ['SIGINT', 'SIGTERM'].forEach(sig => {
      process.on(sig, () => {
        server.close(() => process.exit());
      });
    });

    server.listen(config.port, config.host, err => {
      // BUG: print error and exit?
      if (err) throw err;
    });
  });
}

module.exports = {startDevServer};
