const webpack = require('webpack');
const Server = require('webpack-dev-server/lib/Server');
const merge = require('webpack-merge');
const {monitorServerStatus} = require('../utils');
const BackendWebpackPlugin = require('./backend-plugin');
const baseWebpackConfig = require('./base-config');
const FriendlyErrorsWebpackPlugin = require('./friendly-errors-plugin');
const GenerateEntriesWebpackPlugin = require('./generate-entries-plugin');

function devWebpackConfigs(config) {
  const webpackConfigs = [
    merge(baseWebpackConfig(config, 'frontend'), {
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
      merge(baseWebpackConfig(config, 'backend'), {
        plugins: [new BackendWebpackPlugin()],
      }),
    );
  }

  return webpackConfigs;
}

function startDevServer(config) {
  return new Promise((resolve, reject) => {
    const compiler = webpack(devWebpackConfigs(config));
    compiler.apply(new GenerateEntriesWebpackPlugin(config));
    compiler.apply(new webpack.ProgressPlugin());
    compiler.apply(new FriendlyErrorsWebpackPlugin(config));
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
          let isConnected = false;
          const socket = monitorServerStatus(config.host, config.backendPort, false, connected => {
            isConnected = connected;
          });

          app.use((req, res, next) => {
            if (isConnected) {
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
