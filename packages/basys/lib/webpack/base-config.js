const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');
const webpack = require('webpack');
const {config} = require('../config');
const FrontendWebpackPlugin = require('./frontend-plugin');
const {assetsPath, cssLoaders} = require('./utils');

function getBabelLoader(entryType) {
  let targets;
  if (config.type === 'web') {
    if (entryType === 'backend') targets = {node: config.nodeVersion};
    if (entryType === 'frontend') targets = {browsers: config.browsers};
  }
  // BUG: use 'electron', 'ios', 'android' targets

  return {
    loader: 'babel-loader',
    options: {
      cacheDirectory: true,
      babelrc: false,
      presets: [
        [
          'babel-preset-env',
          {
            modules: false,
            targets,
            useBuiltIns: true,
          },
        ],
      ],
      plugins: [
        // Only stage 4 syntax features are supported (in line with Espree)
        'syntax-trailing-function-commas',
        'transform-async-to-generator',
        'transform-exponentiation-operator',
      ],
      // BUG: do we need it?
      // env: {
      //   testing: {
      //     plugins: ['istanbul'], // BUG: use with karma
      //     plugins: ['dynamic-import-node'], // BUG: use with jest
      //   },
      // },
    },
  };
}

module.exports = function(entryType) {
  const babelLoader = getBabelLoader(entryType);

  if (config.type === 'web' && entryType === 'backend') {
    return {
      context: config._projectDir,
      entry: path.join(config._tempDir, 'backend-entry.js'),
      target: 'node',
      output: {
        filename: 'backend.js',
        path: config._distDir,
      },
      resolve: {
        extensions: ['.js', '.json', '.vue'],
      },
      module: {
        // BUG: think about processing backend-specific static files
        rules: [
          {
            test: /\.js$/,
            exclude: /node_modules/,
            // include: ['src/backend'],
            use: [babelLoader],
          },
        ],
      },
      node: {
        // BUG: maybe set these values to true? `__dirname` is used in templates/backend.js and requires `false` value.
        __dirname: false,
        __filename: false,
      },
      externals: [
        // Don't bundle packages from node_modules into backend.js
        function(context, request, callback) {
          // BUG: Look at https://github.com/liady/webpack-node-externals and https://github.com/liady/webpack-node-externals/issues/39 .
          //      It's not compatible with lerna and yarn new node_modules hierarchy.
          //      Special processing for 'webpack/hot/dev-server.js' would be required.
          if (!request.startsWith('.') && !path.isAbsolute(request)) {
            return callback(null, `commonjs ${request}`);
          }
          callback();
        },
      ],
      plugins: [
        // BUG: think about these plugins
        // new webpack.IgnorePlugin(/\.(css|less)$/),
        // new webpack.BannerPlugin('require("source-map-support").install();', { raw: true, entryOnly: false }),
      ],
    };
  }

  const assets = [path.join(config._tempDir, 'frontend-entry.js')];
  for (const relPath of config.styles) {
    if (!relPath.startsWith('http://') && !relPath.startsWith('https://')) {
      const resolvePaths = [path.join(config._projectDir, 'src')].concat(require.resolve.paths(relPath));
      assets.push(require.resolve(relPath, {paths: resolvePaths}));
    }
  }

  if (config.env === 'dev') {
    assets.unshift(
      `webpack-dev-server/client/?http://${config.host}:${config.port}`,
      'webpack/hot/dev-server.js', // BUG: or use 'webpack/hot/only-dev-server.js'?
    );
  }

  return {
    context: config._projectDir,
    entry: {
      app: assets,
    },
    // BUG: Target should depend on app type, see https://webpack.js.org/configuration/target/ .
    //      See https://github.com/chentsulin/webpack-target-electron-renderer .
    target: 'web',
    output: {
      publicPath: config.assetsPublicPath,
    },
    resolve: {
      extensions: ['.js', '.json', '.vue'],
      alias: {
        vue$: 'vue/dist/vue.esm.js', // BUG: do we need it?
        // '@': 'src',
      },
    },
    module: {
      rules: [
        {
          test: /\.vue$/,
          include: [path.join(config._projectDir, 'src')],
          use: [
            {
              loader: 'vue-loader',
              options: {
                loaders: Object.assign(
                  {js: babelLoader},
                  cssLoaders({
                    sourceMap: config.cssSourceMap,
                    extract: config.env === 'prod',
                  }),
                ),
                cssSourceMap: config.cssSourceMap,
                transformToRequire: {
                  video: 'src',
                  source: 'src',
                  img: 'src',
                  image: 'xlink:href',
                },
              },
            },
          ],
        },
        {
          test: /\.js$/,
          include: [
            path.join(config._projectDir, 'src'),
            path.join(config._projectDir, 'tests'),
            path.join(config._projectDir, '.basys'), // Required to apply loaders to webpack entries
          ],
          use: [babelLoader],
        },
        // BUG: these loaders are very similar. expose (name, regexp, limit) list and generate the loader?
        {
          test: /\.(png|jpe?g|gif|svg)(\?.*)?$/,
          use: [
            {
              loader: 'url-loader',
              options: {
                limit: 10000, // BUG: allow to customize these limits
                name: assetsPath('img/[name].[hash:7].[ext]'),
              },
            },
          ],
        },
        {
          test: /\.(mp4|webm|ogg|mp3|wav|flac|aac)(\?.*)?$/,
          use: [
            {
              loader: 'url-loader',
              options: {
                limit: 10000,
                name: assetsPath('media/[name].[hash:7].[ext]'),
              },
            },
          ],
        },
        {
          test: /\.(woff2?|eot|ttf|otf)(\?.*)?$/,
          use: [
            {
              loader: 'url-loader',
              options: {
                limit: 10000,
                name: assetsPath('fonts/[name].[hash:7].[ext]'),
              },
            },
          ],
        },
      ],
    },
    plugins: [
      new webpack.DefinePlugin({
        'process.env': {
          NODE_ENV: JSON.stringify(process.env.NODE_ENV),
        },
      }),
      new webpack.ProvidePlugin({
        // Make `Vue` object available in code without import
        Vue: ['vue/dist/vue.esm.js', 'default'],
      }),
      new HtmlWebpackPlugin({
        filename: path.join(config._distDir, 'index.html'),
        template: path.join(config._projectDir, 'src', 'index.html'),
        inject: 'body',
        minify:
          config.env !== 'dev'
            ? {
                removeComments: true,
                collapseWhitespace: true,
                conservativeCollapse: true,
                removeAttributeQuotes: true,
                removeScriptTypeAttributes: true,
                removeStyleLinkTypeAttributes: true,
              }
            : false,
      }),
      new FrontendWebpackPlugin(),
    ],
    // BUG: think about it
    // node: {
    //   // prevent webpack from injecting useless setImmediate polyfill because Vue
    //   // source contains it (although only uses it if it's native).
    //   setImmediate: false,
    //   // prevent webpack from injecting mocks to Node native modules
    //   // that does not make sense for the client
    //   dgram: 'empty',
    //   fs: 'empty',
    //   net: 'empty',
    //   tls: 'empty',
    //   child_process: 'empty',
    // },
  };
};
