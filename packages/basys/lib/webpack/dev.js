const fs = require('fs-extra');
const path = require('path');
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
      devtool: config.sourceMap ? 'eval-source-map' : false,
      output: {
        filename: '[name].js',
      },
      plugins: [new webpack.HotModuleReplacementPlugin()],
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
    new GenerateEntriesWebpackPlugin(config).apply(compiler);
    new webpack.ProgressPlugin().apply(compiler);
    new FriendlyErrorsWebpackPlugin(config).apply(compiler);
    compiler.hooks.done.tap('startDevServer', () => resolve(server));
    compiler.hooks.invalid.tap('startDevServer', reject); // BUG: was named 'failed' before. is it correct?

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

    ['SIGHUP', 'SIGINT', 'SIGKILL', 'SIGTERM'].forEach(sig => {
      process.on(sig, () => {
        server.close(() => process.exit());
      });
    });

    // Save dev server host and port info for access by external tools
    const infoPath = path.join(config.tempDir, 'dev-server.json');
    fs.writeFileSync(
      infoPath,
      JSON.stringify({host: config.host, port: config.port, pid: process.pid}, null, 2),
    );
    process.on('exit', () => {
      fs.removeSync(infoPath);
    });

    server.listen(config.port, config.host, err => {
      // BUG: print error and exit?
      if (err) throw err;
    });
  });
}

module.exports = {startDevServer};
