const HtmlWebpackHarddiskPlugin = require('html-webpack-harddisk-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');
const webpack = require('webpack');
const {config} = require('../config');
const HtmlWebpackIncludeExternalAssetsPlugin = require('./html-include-external-assets');
const {assetsPath, cssLoaders} = require('./utils');

function babelLoader(appType) {
  let targets;
  if (appType === 'backend') {
    targets = {node: config.backend ? config.backend.nodeVersion : 'current'};
  } else if (appType === 'web') {
    targets = {browsers: config.web.browsers};
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

// appType = 'backend'/'web'/'mobile'/'desktop'
module.exports = function(appType) {
  const entryPath = path.join(config._tempDir, `${appType}-entry.js`);
  if (appType === 'backend') {
    return {
      context: config._projectDir, // BUG: maybe use ./src? does it actually help?
      entry: entryPath,
      target: 'node',
      output: {
        filename: 'backend.js',
        // For projects without backend it's still bundled to start web app on developer's machine
        path: path.join(config.backend ? config._distDir : config._tempDir, 'backend'),
      },
      resolve: {
        extensions: ['.js', '.json', '.vue'],
      },
      module: {
        // BUG: think about processing backend-specific static files
        rules: [
          // BUG: do we need eslint-loader?
          {
            test: /\.js$/,
            exclude: /node_modules/,
            // include: ['src/backend'],
            use: [babelLoader('backend')],
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
          if (!request.startsWith('.') && !request.startsWith('/')) {
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

  const assets = [entryPath];
  for (const relPath of config[appType].pathAssets) {
    const resolvePaths = [path.join(config._projectDir, 'src')].concat(require.resolve.paths(relPath));
    const fullPath = require.resolve(relPath, {paths: resolvePaths});
    assets.push(fullPath);
  }

  if (config.env === 'dev') {
    // BUG: only for 'web' app?
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
        // BUG: Fix it and use for dev env only. Should be disabled by default, but allow to customize in config.
        // BUG: custom npm packages (eslint plugins and presets) will be installed in project's directory - need to be resolved
        // ...(config.useEslint
        //   ? [
        //       {
        //         test: /\.(js|vue)$/,
        //         enforce: 'pre',
        //         include: ['src', 'tests'],
        //         use: [
        //           {
        //             loader: 'eslint-loader',
        //             options: {
        //               formatter: require('eslint-friendly-formatter'),
        //               emitWarning: !config.showEslintErrorsInOverlay,
        //             },
        //           },
        //         ],
        //       },
        //     ]
        //   : []),
        {
          test: /\.vue$/,
          include: [path.join(config._projectDir, 'src')], // BUG: can relative path be used?
          use: [
            {
              loader: 'vue-loader',
              options: {
                loaders: Object.assign(
                  {js: babelLoader(appType)},
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
          use: [babelLoader(appType)],
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
          // BUG: think about 'testing'. maybe use `process.env.NODE_ENV` (should be equivalent)?
          NODE_ENV: config.env === 'dev' ? '"development"' : config.env === 'test' ? '"testing"' : '"production"',
        },
      }),
      new webpack.ProvidePlugin({
        // Make `Vue` object available in code without import
        Vue: ['vue/dist/vue.esm.js', 'default'],
      }),
      new HtmlWebpackPlugin({
        filename: path.join(config._distDir, appType, 'index.html'),
        template: path.join(__dirname, 'index.html'),
        inject: true,
        minify:
          config.env === 'prod'
            ? {
                removeComments: true,
                collapseWhitespace: true,
                removeAttributeQuotes: true,
                // BUG: see more options at https://github.com/kangax/html-minifier#options-quick-reference
              }
            : false,
        chunksSortMode: 'dependency', // BUG: is it always correct?
        alwaysWriteToDisk: true,
      }),
      new HtmlWebpackIncludeExternalAssetsPlugin({
        jsAssets: config[appType].jsUrlAssets,
        cssAssets: config[appType].cssUrlAssets,
      }),
      new HtmlWebpackHarddiskPlugin(),
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
