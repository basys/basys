const chalk = require('chalk');
const fs = require('fs-extra');
const ora = require('ora');
const path = require('path');
const {getConfig} = require('../config');
const {exit} = require('../utils');

function prodWebpackConfigs(config) {
  // const CopyWebpackPlugin = require('copy-webpack-plugin');
  const MiniCssExtractPlugin = require('mini-css-extract-plugin');
  const webpack = require('webpack');
  const merge = require('webpack-merge');
  const baseWebpackConfig = require('./base-config');

  const plugins = [
    // Extract css into its own file
    new MiniCssExtractPlugin({
      filename: 'static/css/[name].[contenthash].css',
    }),
    // Keep module.id stable when vendor modules don't change
    new webpack.HashedModuleIdsPlugin(),
    // // Split vendor js into its own file
    // new webpack.optimize.CommonsChunkPlugin({
    //   name: 'vendor',
    //   minChunks(module) {
    //     // Any required modules inside node_modules are extracted to vendor
    //     return (
    //       module.resource && /\.js$/.test(module.resource) && module.resource.indexOf('/node_modules/') > 0
    //       // module.resource.indexOf(path.join(config.projectDir, 'node_modules')) === 0
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
    //     from: path.join(config.projectDir, 'src', 'static'), // BUG: think about it
    //     to: 'static', // BUG: is it correct?
    //     ignore: ['.*'], // BUG: what is it?
    //   },
    // ]),
  ];

  const optimization = {minimizer: []};
  if (config.env === 'prod') {
    const UglifyJsPlugin = require('uglifyjs-webpack-plugin');
    const OptimizeCSSPlugin = require('./optimize-css-assets-plugin');
    optimization.minimizer.push(
      new UglifyJsPlugin({
        uglifyOptions: {
          compress: {
            warnings: false,
            comparisons: false,
          },
        },
        sourceMap: config.jsSourceMap,
        cache: true,
        parallel: true,
      }),

      new OptimizeCSSPlugin({
        browsers: config.browsers,
        sourceMap: config.cssSourceMap,
      }),
    );

    const {BundleAnalyzerPlugin} = require('webpack-bundle-analyzer');
    plugins.push(
      new BundleAnalyzerPlugin({
        analyzerMode: 'static',
        openAnalyzer: false,
        reportFilename: path.join(config.tempDir, 'report.html'),
      }),
    );
  }

  const webpackConfigs = [
    merge(baseWebpackConfig(config, 'frontend'), {
      devtool: config.cssSourceMap ? 'source-map' : false,
      recordsPath: path.join(config.tempDir, 'records.json'),
      output: {
        path: config.distDir,
        filename: 'static/js/[name].[chunkhash].js',
        chunkFilename: 'static/js/[id].[chunkhash].js',
      },
      optimization,
      plugins,
      performance: {
        hints: false,
      },
    }),
  ];

  if (config.type === 'web') {
    webpackConfigs.push(merge(baseWebpackConfig(config, 'backend'), {optimization}));
  }

  return webpackConfigs;
}

async function build(projectDir, appName, env = 'prod') {
  const FriendlyErrorsWebpackPlugin = require('./friendly-errors-plugin');
  const GenerateEntriesWebpackPlugin = require('./generate-entries-plugin');
  const webpack = require('webpack');

  const config = getConfig(projectDir, appName, env);

  const spinner = ora('building for production...');
  spinner.start();

  fs.emptyDirSync(config.distDir);

  await new Promise((resolve, reject) => {
    const compiler = webpack(prodWebpackConfigs(config));
    new GenerateEntriesWebpackPlugin(config).apply(compiler);
    new FriendlyErrorsWebpackPlugin(config).apply(compiler);
    compiler.run((err, multiStats) => {
      spinner.stop();
      if (err) return reject(err);

      if (config.type === 'web') {
        // Generate package.json
        const data = JSON.parse(fs.readFileSync(path.join(projectDir, 'package.json'), 'utf8'));

        const dependencies = data.dependencies || {};
        const basysPackageJson = require('basys/package.json');
        for (const name of ['body-parser', 'express', 'morgan', 'nunjucks']) {
          dependencies[name] = basysPackageJson.dependencies[name];
        }

        const packageJson = {
          name: data.name,
          version: data.version,
          description: data.description,
          homepage: data.homepage,
          author: data.author,
          license: data.license,
          private: true,
          scripts: {start: 'node backend.js'},
          dependencies,
        };

        fs.writeFileSync(
          path.join(config.distDir, 'package.json'),
          JSON.stringify(packageJson, null, 2),
        );
      }

      for (const stats of multiStats.stats) {
        // BUG: print the name of stats (app type)?
        process.stdout.write(
          `${stats.toString({
            all: false,
            assets: true,
            colors: true,
            performance: true,
            warnings: true,
          })}\n\n`,
        );

        if (stats.hasErrors()) exit('  Build failed with errors.\n');
      }

      // BUG: fix the command, show deployment name if needed?
      if (config.env === 'prod') {
        console.log(`Build complete, you can find it in ${chalk.cyan.bold(config.distDir)}.`);
        const command = `basys start${appName ? ` ${appName}` : ''}`;
        console.log(
          `Use \`${chalk.green.bold(command)}\` to test the production build on your machine.`,
        );
      } else {
        console.log(chalk.cyan('Build complete.'));
      }

      resolve();
    });
  });

  return config;
}

module.exports = {build};
