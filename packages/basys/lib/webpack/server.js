const net = require('net');
const webpack = require('webpack');
const Server = require('webpack-dev-server/lib/Server');
const merge = require('webpack-merge');
const {config} = require('../config');
const BackendWebpackPlugin = require('./backend-plugin');
const baseWebpackConfig = require('./base-config');
const FriendlyErrorsWebpackPlugin = require('./friendly-errors-plugin');
const GenerateEntriesWebpackPlugin = require('./generate-entries-plugin');
const {styleLoaders} = require('./utils');

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
        new webpack.NoEmitOnErrorsPlugin(),
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
    const compiler = webpack(devWebpackConfigs());
    compiler.apply(new GenerateEntriesWebpackPlugin());
    compiler.apply(new webpack.ProgressPlugin());
    compiler.apply(new FriendlyErrorsWebpackPlugin());
    compiler.plugin('done', () => resolve(server));
    compiler.plugin('failed', reject);

    const server = new Server(compiler, {
      clientLogLevel: 'info', // BUG: think about it. use 'warning'?
      hot: true,
      compress: true,
      host: config.host,
      port: config.port,
      overlay: true,
      publicPath: config.assetsPublicPath,
      proxy: config.type === 'web' ? {'/': `http://${config.host}:${config.backendPort}`} : {}, // BUG: allow to add more proxies?
      quiet: true,
      watchOptions: {
        poll: config.poll,
        ignored: 'node_modules/**',
      },
      contentBase: false,
      stats: {
        all: false,
        colors: true,
        errors: true,
        warnings: true,
      },
      before(app) {
        if (config.type === 'web') {
          // Wait for backend server to restart and prevent page load errors
          const opts = {host: config.host, port: config.backendPort};
          const socket = net.connect(opts);
          let connected = false;
          socket.on('connect', () => {
            connected = true;
          });
          socket.on('error', () => {});
          socket.on('close', err => {
            connected = false;
            setTimeout(() => socket.connect(opts), 1000); // BUG: retry several times?
          });
          app.use((req, res, next) => {
            if (connected) {
              next();
            } else {
              socket.once('connect', next);
            }
          });
        }
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
