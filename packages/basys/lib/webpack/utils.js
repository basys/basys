const chokidar = require('chokidar');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const fs = require('fs-extra');
const glob = require('glob');
const JSON5 = require('json5');
const nunjucks = require('nunjucks');
const path = require('path');
const parseVue = require('vue-loader/lib/parser');
const {exit} = require('../utils');
const {config} = require('../config');

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
          sourceMap: config.cssSourceMap,
        },
      },
    ];

    // BUG: do we need a flag? currently it's always true.
    if (options.usePostCSS) {
      // loaders.push({
      //   loader: 'postcss-loader',
      //   options: {
      //     sourceMap: config.cssSourceMap,
      //   },
      // });
    }

    if (loader) {
      loaders.push({
        loader: `${loader}-loader`,
        options: Object.assign({}, loaderOptions, {
          sourceMap: config.cssSourceMap,
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

  config._routes = {}; // {vuePath: routeInfo}
  for (const vuePath of config._vuePaths) {
    const parts = parseVue(fs.readFileSync(vuePath, 'utf8'), vuePath);
    const routeBlock = parts.customBlocks.find(block => block.type === 'route');
    if (routeBlock) {
      // BUG: can it contain js code?
      let routeInfo;
      try {
        routeInfo = JSON5.parse(routeBlock.content);
      } catch (e) {
        exit(`${vuePath}: ${e.message}`);
      }
      // BUG: validate the data inside routeInfo (e.g. path starts with '/')

      routeInfo.file = vuePath;

      const usedInApp = !Array.isArray(routeInfo.apps) || routeInfo.apps.includes(config.appName);
      if (usedInApp) {
        config._routes[vuePath] = routeInfo; // BUG: needs special processing to adopt for Vue and express (e.g. url params)
      } else {
        // BUG: remove vuePath from config._vuePaths
      }
    }
  }

  const entries = {};
  if (config.type === 'web') {
    // Expose only whitelisted and custom config options to backend code
    const conf = {};
    for (const key of ['host', 'port', 'backendPort', 'appName', 'env']) {
      conf[key] = config[key];
    }
    for (const key in config.custom) {
      conf[key] = config.custom[key];
    }

    entries.backend = nunjucks.render('backend.js', {
      pagePaths: JSON.stringify(Object.values(config._routes).map(route => route.path), null, 2),
      entry: config.backendEntry && path.join(config._projectDir, 'src', config.backendEntry),
      conf,
    });
  }

  // BUG: for web app don't generate front-end bundle if there are no pages (what about mobile/desktop?)
  entries.frontend = nunjucks.render('frontend.js', {
    vuePaths: config._vuePaths,
    routes: config._routes,
    entry: config.entry && path.join(config._projectDir, 'src', config.entry),
  });

  for (const entryType in entries) {
    const entryPath = path.join(config._tempDir, `${entryType}-entry.js`);
    fs.writeFileSync(entryPath, entries[entryType]);

    if (init) {
      // BUG: a temporary fix for the webpack-dev-server issue https://github.com/webpack/webpack-dev-server/issues/1208
      const time = new Date(Date.now() - 100000);
      fs.utimesSync(entryPath, time, time);
    }
  }
}

module.exports = {assetsPath, cssLoaders, generateEntries, styleLoaders};
