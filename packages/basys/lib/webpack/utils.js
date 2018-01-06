const chalk = require('chalk');
const chokidar = require('chokidar');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const fs = require('fs-extra');
const glob = require('glob');
const JSON5 = require('json5');
const nunjucks = require('nunjucks');
const path = require('path');
const parseVue = require('vue-loader/lib/parser');
const {exit} = require('../utils');
const {appTypes, config} = require('../config');

nunjucks.configure(path.join(__dirname, '..', 'templates'), {autoescape: false});

function assetsPath(_path) {
  return path.posix.join('static', _path);
}

function cssLoaders(options) {
  options = options || {};

  // Generate loader string to be used with extract text plugin
  function generateLoaders(loader, loaderOptions) {
    const loaders = [
      {
        loader: 'css-loader',
        options: {
          sourceMap: options.sourceMap,
        },
      },
    ];

    // BUG: do we need a flag? currently it's always true.
    if (options.usePostCSS) {
      // loaders.push({
      //   loader: 'postcss-loader',
      //   options: {
      //     sourceMap: options.sourceMap,
      //   },
      // });
    }

    if (loader) {
      loaders.push({
        loader: `${loader}-loader`,
        options: Object.assign({}, loaderOptions, {
          sourceMap: options.sourceMap,
        }),
      });
    }

    // Extract CSS when that option is specified
    // (which is the case during production build)
    if (options.extract) {
      return ExtractTextPlugin.extract({
        use: loaders,
        fallback: 'vue-style-loader',
      });
    }
    return ['vue-style-loader'].concat(loaders);
  }

  // https://vue-loader.vuejs.org/en/configurations/extract-css.html
  return {
    css: generateLoaders(),
    postcss: generateLoaders(),
    less: generateLoaders('less'),
    sass: generateLoaders('sass', {indentedSyntax: true}), // BUG: remove it?
    scss: generateLoaders('sass'),
  };
}

// Generate loaders for standalone style files (outside of .vue)
function styleLoaders(options) {
  const output = [];
  const loaders = cssLoaders(options);
  for (const extension in loaders) {
    output.push({
      test: new RegExp(`\\.${extension}$`),
      use: loaders[extension],
    });
  }
  return output;
}

// BUG: Perform validation of component options, at least the ones that affect whether and how they are used.
//      Warn if component names are not unique.
function generateEntries(init = true) {
  config._routes = {}; // {vuePath: routeInfo}
  config._vuePaths = [];
  if (config.web || config.mobile || config.desktop) {
    const vuePattern = path.join(config._projectDir, 'src', '**', '*.vue');
    config._vuePaths = glob.sync(vuePattern);

    if (config.env === 'dev' && init) {
      // Re-generate webpack entries when .vue files are added or deleted inside src/ folder
      chokidar
        .watch(vuePattern, {ignoreInitial: true})
        .on('add', () => generateEntries(false))
        .on('change', () => generateEntries(false))
        .on('unlink', () => generateEntries(false));
    }

    for (const vuePath of config._vuePaths) {
      const parts = parseVue(fs.readFileSync(vuePath, 'utf8'), vuePath);
      const routeBlock = parts.customBlocks.find(block => block.type === 'route');
      if (routeBlock) {
        // BUG: can it contain js code?
        let routeInfo;
        try {
          routeInfo = JSON5.parse(routeBlock.content);
        } catch (e) {
          exit(chalk.red(`${vuePath}: ${e.message}`));
        }

        routeInfo.file = vuePath;
        config._routes[vuePath] = routeInfo; // BUG: needs special processing to adopt for Vue and express (e.g. url params)
        // BUG: validate the data inside routeInfo (e.g. path starts with '/')
      }
    }
  }

  for (const appType of appTypes()) {
    let js;
    if (appType === 'backend') {
      // When bundling for production exclude all internal config options (starting with '_')
      let conf = Object.assign({}, config);
      if (config.env !== 'dev') {
        for (let key of Object.keys(config)) {
          if (key.startsWith('_')) delete conf[key];
        }
      }

      js = nunjucks.render('backend.js', {
        pagePaths: JSON.stringify(Object.values(config._routes).map(route => route.path)),
        entry: config.backend && config.backend.entry && path.join(config._projectDir, 'src', config.backend.entry),
        conf,
      });
    } else {
      // BUG: frontend.js code may depend on app type
      js = nunjucks.render('frontend.js', {
        vuePaths: config._vuePaths,
        routes: config._routes,
        entry: config[appType].entry && path.join(config._projectDir, 'src', config[appType].entry),
      });
    }

    const entryPath = path.join(config._tempDir, `${appType}-entry.js`);
    fs.writeFileSync(entryPath, js);

    if (init) {
      // BUG: a temporary fix for the webpack-dev-server issue https://github.com/webpack/webpack-dev-server/issues/1208
      const time = new Date(Date.now() - 100000);
      fs.utimesSync(entryPath, time, time);
    }
  }
}

module.exports = {assetsPath, cssLoaders, generateEntries, styleLoaders};
