const chalk = require('chalk');
const chokidar = require('chokidar');
const fs = require('fs-extra');
const glob = require('glob');
const JSON5 = require('json5');
const nunjucks = require('nunjucks');
const path = require('path');
const pathToRegexp = require('path-to-regexp');
const parseVue = require('vue-loader/lib/parser');

class GenerateEntriesWebpackPlugin {
  constructor(config) {
    this.config = config;
  }

  apply(compiler) {
    this.generateEntries(true);

    if (this.config.env === 'dev') {
      // Re-generate webpack entries when .vue files inside src/ folder change
      chokidar
        .watch(this.vuePattern, {ignoreInitial: true})
        .on('add', () => this.generateEntries())
        .on('change', () => this.generateEntries())
        .on('unlink', filePath => {
          // Ignore deleting Vue components from other apps
          if (filePath in this.config.vueComponents) this.generateEntries();
        });
    }

    compiler.plugin('done', multiStats => {
      Array.prototype.push.apply(multiStats.stats[0].compilation.errors, this.errors);
    });
  }

  // BUG: Perform validation of component options, at least the ones that affect whether and how they are used.
  //      Warn if component names are not unique or missing.
  generateEntries(init) {
    nunjucks.configure(path.join(__dirname, '..', 'templates'), {autoescape: false});
    this.errors = [];
    this.vuePattern = path.join(this.config.projectDir, 'src', '**', '*.vue');

    const vuePaths = glob.sync(this.vuePattern);
    this.config.vueComponents = {}; // {vuePath: info}
    for (const vuePath of vuePaths) {
      const parts = parseVue(fs.readFileSync(vuePath, 'utf8'), vuePath);
      const infoBlock = parts.customBlocks.find(block => block.type === 'info');
      if (infoBlock) {
        let info;
        try {
          info = JSON5.parse(infoBlock.content);
        } catch (e) {
          this.errors.push(new Error(`${vuePath}: ${e.message}`));
          continue;
        }
        // BUG: validate the data inside info (e.g. path starts with '/' if present)

        const usedInApp = !Array.isArray(info.apps) || info.apps.includes(this.config.appName);
        if (usedInApp) {
          this.config.vueComponents[vuePath] = info; // BUG: needs special processing to adopt for Vue and express (e.g. url params)
        }
      } else {
        this.config.vueComponents[vuePath] = {};
      }
    }

    const entries = {};

    // Generate backend entry for web apps
    if (this.config.type === 'web') {
      // Expose only whitelisted and custom config options to backend code
      const conf = {};
      for (const key in this.config.custom) {
        conf[key] = this.config.custom[key];
      }
      for (const key of ['host', 'port', 'backendPort']) {
        conf[key] = this.config[key];
      }

      const pagePaths = [];
      for (const vuePath in this.config.vueComponents) {
        const info = this.config.vueComponents[vuePath];
        if (info.path) {
          try {
            // We use the version 1.7.0 of path-to-regexp package, which is used in vue-router
            pagePaths.push(pathToRegexp(info.path, [], {sensitive: this.config.caseSensitive}).toString());
          } catch (e) {
            this.errors.push(new Error(`${vuePath} page path error: ${e.message}`));
            continue;
          }
        }
      }

      entries.backend = nunjucks.render('backend.js', {
        env: this.config.env,
        appName: this.config.appName,
        pagePaths,
        entry: this.config.backendEntry && path.join(this.config.projectDir, 'src', this.config.backendEntry),
        conf,
      });
    }

    // BUG: for web app don't generate front-end bundle if there are no pages (what about mobile/desktop?)
    entries.frontend = nunjucks.render('frontend.js', {
      vueComponents: this.config.vueComponents,
      entry: this.config.entry && path.join(this.config.projectDir, 'src', this.config.entry),
      caseSensitive: !!this.config.caseSensitive,
    });

    for (const entryType in entries) {
      const entryPath = path.join(this.config.tempDir, `${entryType}-entry.js`);
      fs.writeFileSync(entryPath, entries[entryType]);

      if (init) {
        // A fix for the webpack-dev-server issue https://github.com/webpack/webpack-dev-server/issues/1208
        const time = new Date(Date.now() - 100000);
        fs.utimesSync(entryPath, time, time);
      }
    }
  }
}

module.exports = GenerateEntriesWebpackPlugin;
