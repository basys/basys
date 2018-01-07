const chalk = require('chalk');
// const CopyWebpackPlugin = require('copy-webpack-plugin');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const fs = require('fs-extra');
const OptimizeCSSPlugin = require('optimize-css-assets-webpack-plugin');
const ora = require('ora');
const path = require('path');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');
const merge = require('webpack-merge');
const webpack = require('webpack');
const {appTypes, config} = require('../config');
const baseWebpackConfig = require('./base-config');
const {assetsPath, generateEntries, styleLoaders} = require('./utils');
const {exit} = require('../utils');

function prodWebpackConfig(appType) {
  const uglifyJsPlugin = new UglifyJsPlugin({
    uglifyOptions: {
      compress: {
        warnings: false,
      },
    },
    sourceMap: config.jsSourceMap,
    parallel: true,
  });

  let webpackConfig = baseWebpackConfig(appType);

  if (appType !== 'backend') {
    webpackConfig = merge(webpackConfig, {
      module: {
        rules: styleLoaders({
          sourceMap: config.cssSourceMap,
          extract: true,
          usePostCSS: true, // BUG: think about it
        }),
      },
      devtool: config.cssSourceMap ? 'source-map' : false,
      output: {
        path: path.join(config._distDir, appType),
        filename: assetsPath('js/[name].[chunkhash].js'),
        chunkFilename: assetsPath('js/[id].[chunkhash].js'),
      },
      plugins: [
        uglifyJsPlugin,
        // Extract css into its own file
        new ExtractTextPlugin({
          filename: assetsPath('css/[name].[contenthash].css'),
          // Set the following option to `true` if you want to extract CSS from
          // codesplit chunks into this main css file as well.
          // This will result in *all* of your app's CSS being loaded upfront.
          allChunks: false,
        }),
        // BUG: think about using cssnano in postcss-loader instead (no dedupe then)
        // Compress extracted CSS. We are using this plugin so that possible
        // duplicated CSS from different components can be deduped.
        new OptimizeCSSPlugin({
          cssProcessorOptions: {
            safe: true,
            // BUG: existing prefixes don't seem to get removed
            autoprefixer: {browsers: config.browsers, add: true},
            map: config.cssSourceMap ? {inline: false} : undefined,
          },
        }),
        // Keep module.id stable when vendor modules don't change
        new webpack.HashedModuleIdsPlugin(),
        // Enable scope hoisting
        new webpack.optimize.ModuleConcatenationPlugin(),
        // // Split vendor js into its own file
        // new webpack.optimize.CommonsChunkPlugin({
        //   name: 'vendor',
        //   minChunks(module) {
        //     // Any required modules inside node_modules are extracted to vendor
        //     return (
        //       module.resource && /\.js$/.test(module.resource) && module.resource.indexOf('/node_modules/') > 0
        //       // module.resource.indexOf(path.join(config._projectDir, 'node_modules')) === 0
        //     );
        //   },
        // }),
        // // Extract webpack runtime and module manifest to its own file in order to
        // // prevent vendor hash from being updated whenever app bundle is updated
        // new webpack.optimize.CommonsChunkPlugin({
        //   name: 'manifest',
        //   minChunks: Infinity,
        // }),
        // // This instance extracts shared chunks from code splitted chunks and bundles them
        // // in a separate chunk, similar to the vendor chunk.
        // // See: https://webpack.js.org/plugins/commons-chunk-plugin/#extra-async-commons-chunk
        // new webpack.optimize.CommonsChunkPlugin({
        //   name: 'app',
        //   async: 'vendor-async',
        //   children: true,
        //   minChunks: 3,
        // }),
        // BUG: Exclude files like css. Most static files will be bundled. Introduce a separate directory for copy-only files?
        //      Or copy files that are not processed by webpack (not entry depends on them)?
        //      Or just use `static` directory for files that are simply copied?
        //      See http://vuejs-templates.github.io/webpack/static.html .
        // BUG: should be customizable - there can be separate dist directories/sets of assets per app?
        // Copy custom static assets
        // new CopyWebpackPlugin([
        //   {
        //     from: path.join(config._projectDir, 'src', 'static'), // BUG: think about it
        //     to: 'static', // BUG: is it correct?
        //     ignore: ['.*'], // BUG: what is it?
        //   },
        // ]),
      ],
    });
  } else {
    webpackConfig = merge(webpackConfig, {
      plugins: [uglifyJsPlugin],
    });
  }

  // BUG: only for web apps?
  // if (config.productionGzip) {
  //   const CompressionWebpackPlugin = require('compression-webpack-plugin');
  //   webpackConfig.plugins.push(
  //     new CompressionWebpackPlugin({
  //       asset: '[path].gz[query]',
  //       algorithm: 'gzip',
  //       test: new RegExp('\\.(' +config.productionGzipExtensions.join('|') + ')$'),
  //       threshold: 10240,
  //       minRatio: 0.8,
  //     })
  //   );
  // }

  // BUG: document it
  // BUG: does it work with multiple apps? (see https://github.com/webpack-contrib/webpack-bundle-analyzer/issues/12)
  if (config.bundleAnalyzerReport) {
    const {BundleAnalyzerPlugin} = require('webpack-bundle-analyzer');
    webpackConfig.plugins.push(new BundleAnalyzerPlugin()); // BUG: pass configuration?
  }

  return webpackConfig;
}

function build() {
  const spinner = ora('building for production...');
  spinner.start();

  return fs.emptyDir(config._distDir).then(
    () =>
      new Promise((resolve, reject) => {
        generateEntries();

        const configs = appTypes().map(prodWebpackConfig);
        webpack(configs, (err, multiStats) => {
          spinner.stop();
          if (err) return reject(err);

          if (config.backend) {
            // Generate package.json
            const packageJson = JSON.parse(fs.readFileSync(path.join(config._projectDir, 'package.json'), 'utf8'));
            packageJson.scripts = {start: 'node backend/backend.js'};
            delete packageJson.devDependencies;

            packageJson.dependencies = packageJson.dependencies || {};
            const basysPackageJson = require('basys/package.json');
            for (const name of ['body-parser', 'express', 'morgan']) {
              packageJson.dependencies[name] = basysPackageJson.dependencies[name];
            }

            fs.writeFileSync(path.join(config._distDir, 'package.json'), JSON.stringify(packageJson, null, 2));
          }

          for (const stats of multiStats.stats) {
            // BUG: print the name of stats (app type)?
            process.stdout.write(
              `${stats.toString({
                colors: true,
                modules: false,
                children: false,
                chunks: false,
                chunkModules: false,
              })}\n\n`,
            );

            if (stats.hasErrors()) {
              exit(chalk.red('  Build failed with errors.\n'));
            }
          }

          console.log(chalk.cyan('Build complete.\n'));

          // BUG: depends on the list of apps built
          // BUG: fix the command, show deployment name if needed?
          if (config.env === 'prod') {
            console.log(chalk.yellow(`Use \`npm run start\` to test the production build on your machine.\n`));
          }

          resolve();
        });
      }),
  );
}

module.exports = {build};
