const chokidar = require('chokidar');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const fs = require('fs-extra');
const glob = require('glob');
const JSON5 = require('json5');
const nunjucks = require('nunjucks');
const path = require('path');
const pathToRegexp = require('path-to-regexp');
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
//      Warn if component names are not unique or missing.
function generateEntries(init = true) {
  const vuePattern = path.join(config.projectDir, 'src', '**', '*.vue');
  const vuePaths = glob.sync(vuePattern);
  config.vueComponents = {}; // {vuePath: info}
  for (const vuePath of vuePaths) {
    const parts = parseVue(fs.readFileSync(vuePath, 'utf8'), vuePath);
    const infoBlock = parts.customBlocks.find(block => block.type === 'info');
    if (infoBlock) {
      // BUG: can it contain js code?
      let info;
      try {
        info = JSON5.parse(infoBlock.content);
      } catch (e) {
        exit(`${vuePath}: ${e.message}`);
      }
      // BUG: validate the data inside info (e.g. path starts with '/' if present)

      const usedInApp = !Array.isArray(info.apps) || info.apps.includes(config.appName);
      if (usedInApp) {
        config.vueComponents[vuePath] = info; // BUG: needs special processing to adopt for Vue and express (e.g. url params)
      }
    } else {
      config.vueComponents[vuePath] = {};
    }
  }

  if (config.env === 'dev' && init) {
    // Re-generate webpack entries when .vue files inside src/ folder are change.
    // Ignore changes of Vue components from other apps.
    chokidar
      .watch(vuePattern, {ignoreInitial: true})
      .on('add', () => generateEntries(false))
      .on('change', filePath => {
        if (filePath in config.vueComponents) generateEntries(false);
      })
      .on('unlink', filePath => {
        if (filePath in config.vueComponents) generateEntries(false);
      });
  }

  const entries = {};

  // Generate backend entry for web apps
  if (config.type === 'web') {
    // Expose only whitelisted and custom config options to backend code
    const conf = {};
    for (const key in config.custom) {
      conf[key] = config.custom[key];
    }
    for (const key of ['host', 'port', 'backendPort']) {
      conf[key] = config[key];
    }

    const pagePaths = [];
    for (const vuePath in config.vueComponents) {
      const info = config.vueComponents[vuePath];
      if (info.path) {
        try {
          // We use the version 1.7.0 of path-to-regexp package, which is used in vue-router
          pagePaths.push(pathToRegexp(info.path, [], {sensitive: config.caseSensitive}).toString());
        } catch (e) {
          exit(`${vuePath} path: ${e.message}`);
        }
      }
    }

    entries.backend = nunjucks.render('backend.js', {
      env: config.env,
      appName: config.appName,
      pagePaths,
      entry: config.backendEntry && path.join(config.projectDir, 'src', config.backendEntry),
      conf,
    });
  }

  // BUG: for web app don't generate front-end bundle if there are no pages (what about mobile/desktop?)
  entries.frontend = nunjucks.render('frontend.js', {
    vueComponents: config.vueComponents,
    entry: config.entry && path.join(config.projectDir, 'src', config.entry),
    caseSensitive: !!config.caseSensitive,
  });

  for (const entryType in entries) {
    const entryPath = path.join(config.tempDir, `${entryType}-entry.js`);
    fs.writeFileSync(entryPath, entries[entryType]);

    if (init) {
      // BUG: a temporary fix for the webpack-dev-server issue https://github.com/webpack/webpack-dev-server/issues/1208
      const time = new Date(Date.now() - 100000);
      fs.utimesSync(entryPath, time, time);
    }
  }
}

module.exports = {assetsPath, cssLoaders, generateEntries, styleLoaders};
