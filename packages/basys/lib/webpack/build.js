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
const {getConfig} = require('../config');
const {exit} = require('../utils');
const baseWebpackConfig = require('./base-config');
const GenerateEntriesWebpackPlugin = require('./generate-entries-plugin');
const {assetsPath, styleLoaders} = require('./utils');

function prodWebpackConfigs(config) {
  const uglifyJsPlugin = new UglifyJsPlugin({
    uglifyOptions: {
      compress: {
        warnings: false,
      },
    },
    sourceMap: config.jsSourceMap,
    parallel: true,
  });

  const webpackConfigs = [
    merge(baseWebpackConfig(config, 'frontend'), {
      module: {
        rules: styleLoaders({
          extract: true,
          usePostCSS: true, // BUG: think about it
          sourceMap: config.cssSourceMap,
        }),
      },
      devtool: config.cssSourceMap ? 'source-map' : false,
      output: {
        path: config.distDir,
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
      ],
    }),
  ];

  // BUG: document it
  // BUG: does it work with multiple apps? (see https://github.com/webpack-contrib/webpack-bundle-analyzer/issues/12)
  if (config.bundleAnalyzerReport) {
    const {BundleAnalyzerPlugin} = require('webpack-bundle-analyzer');
    webpackConfigs[0].plugins.push(new BundleAnalyzerPlugin()); // BUG: pass configuration?
  }

  if (config.type === 'web') {
    webpackConfigs.push(
      merge(baseWebpackConfig(config, 'backend'), {
        plugins: [uglifyJsPlugin],
      }),
    );
  }

  return webpackConfigs;
}

async function build(projectDir, appName, env = 'prod') {
  const config = getConfig(projectDir, appName, env);

  const spinner = ora('building for production...');
  spinner.start();

  fs.emptyDirSync(config.distDir);

  await new Promise((resolve, reject) => {
    const compiler = webpack(prodWebpackConfigs(config));
    compiler.apply(new GenerateEntriesWebpackPlugin(config));
    compiler.run((err, multiStats) => {
      spinner.stop();
      if (err) return reject(err);

      if (config.type === 'web') {
        // Generate package.json
        const packageJson = JSON.parse(fs.readFileSync(path.join(projectDir, 'package.json'), 'utf8'));
        packageJson.scripts = {start: 'node backend.js'};
        delete packageJson.devDependencies;

        packageJson.dependencies = packageJson.dependencies || {};
        const basysPackageJson = require('basys/package.json');
        for (const name of ['body-parser', 'express', 'morgan', 'nunjucks']) {
          packageJson.dependencies[name] = basysPackageJson.dependencies[name];
        }

        fs.writeFileSync(path.join(config.distDir, 'package.json'), JSON.stringify(packageJson, null, 2));
      }

      for (const stats of multiStats.stats) {
        // BUG: print the name of stats (app type)?
        process.stdout.write(
          `${stats.toString({
            all: false,
            assets: true,
            colors: true,
            errors: true,
            errorDetails: true,
            performance: true,
            warnings: true,
          })}\n\n`,
        );

        if (stats.hasErrors()) exit('  Build failed with errors.\n');
      }

      console.log(chalk.cyan('Build complete.\n'));

      // BUG: depends on the list of apps built
      // BUG: fix the command, show deployment name if needed?
      if (config.env === 'prod') {
        console.log(chalk.yellow(`Use \`npm run start\` to test the production build on your machine.\n`));
      }

      resolve();
    });
  });

  return config;
}

module.exports = {build};
