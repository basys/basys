const assert = require('assert');
const chalk = require('chalk');
const deepmerge = require('deepmerge');
const fs = require('fs-extra');
const JSON5 = require('json5');
const path = require('path');
const {exit} = require('./utils');

const config = {};

function merge(dest, src) {
  return deepmerge(dest, src, {arrayMerge: (destination, source) => source});
}

function loadConfig(projectDir, env, deplName = null) {
  assert(['dev', 'test', 'prod'].includes(env));

  const configPath = path.join(projectDir, 'basys.json');
  let projectConfig;
  try {
    projectConfig = fs.readFileSync(configPath, 'utf8');
  } catch (e) {
    exit(chalk.red(`${e.message}\n`));
  }

  try {
    projectConfig = JSON5.parse(projectConfig);
  } catch (e) {
    exit(
      chalk.red(`Syntax error in ${configPath}: ${e.message}\n`) +
        chalk.yellow(
          'You can use JSON5 (http://json5.org) which is an extension of the JSON format, that includes:\n' +
            '  - comments,\n  - unquoted and single-quoted object keys,\n  - trailing commas,\n  - single-quoted and multi-line strings.\n',
        ),
    );
  }

  // BUG: Introduce some shortcuts for validating the configs, or use some library. App builder import function should do it.
  if (!projectConfig || projectConfig.constructor !== Object) {
    exit(chalk.red(`${configPath} value must be an object`));
  }

  process.env.NODE_ENV = {dev: 'development', test: 'testing', prod: 'production'}[env];

  // BUG: not all of these configs should be exposed
  const defaultEnvConfig = {
    dev: {
      host: 'localhost',
      port: 8080, // If this port is in use, a free one will be determined automatically

      // CSS Sourcemaps off by default because relative paths are "buggy"
      // with this option, according to the CSS-Loader README
      // (https://github.com/webpack/css-loader#sourcemaps).
      // In our experience, they generally work as expected,
      // just be aware of this issue when enabling this option.
      cssSourceMap: false,

      jsSourceMap: false,

      errorOverlay: true,
      poll: false, // https://webpack.js.org/configuration/dev-server/#devserver-watchoptions-
      proxy: {}, // https://webpack.js.org/configuration/dev-server/#devserver-proxy

      // Use Eslint Loader?
      // If true, your code will be linted during bundling and
      // linting errors and warnings will be shown in the console.
      // useEslint: true,
      // If true, eslint errors and warnings will also be shown in the error overlay in the browser.
      // showEslintErrorsInOverlay: false,

      // poll: null,
    },
    // BUG: reduce duplication with other envs, not all attributes need to be exposed
    test: {
      host: 'localhost',
      port: 8080,
      cssSourceMap: true,
      jsSourceMap: true,

      // BUG: automatically detect the browsers available on developer's machine? (only relevant if web app is present)
      // BUG: allow to override it via CLI arguments?
      // BUG: support remote browsers
      // Available values: 'chromium', 'chrome', 'chrome:headless', 'chrome-canary', 'ie', 'edge',
      // 'firefox', 'firefox:headless', 'opera', 'safari'
      testBrowsers: [],
    },
    // BUG: some/all of these options are per production deployment?
    prod: {
      host: 'localhost',
      port: 8080, // Server will fail to start if this port is in use

      cssSourceMap: true,
      jsSourceMap: true,

      // Gzip off by default as many popular static hosts such as
      // Surge or Netlify already gzip all static assets for you.
      // Before setting to `true`, make sure to:
      // npm install --save-dev compression-webpack-plugin
      // productionGzip: false,
      // productionGzipExtensions: ['js', 'css'],
      bundleAnalyzerReport: process.env.npm_config_report, // BUG: allow to activate it via npm script argument
    },
  };

  // BUG: backend is required for ssr (validate config consistency)
  const defaultAppConfig = {
    backend: {
      entry: null, // Path to backend customization js relative to src/ directory
      nodeVersion: env === 'dev' ? 'current' : '8.9',
    },
    web: {
      entry: null,
      browsers: ['> 1%', 'last 2 versions'],
    },
    mobile: {
      entry: null,
      // BUG: ios/android configuration, supported versions
    },
    desktop: {
      entry: null,
    },
  };

  let conf = defaultEnvConfig[env];

  for (const appType of Object.keys(defaultAppConfig)) {
    // If app is activated merge its options with default options and add to `conf`
    if (projectConfig[appType]) {
      conf[appType] = merge(defaultAppConfig[appType], projectConfig[appType]);
    }
  }

  const tempDir = path.join(projectDir, '.basys', env); // BUG: if env==='prod' use `prod/${deplName}`?
  fs.ensureDirSync(tempDir);

  // BUG: check that name exists (hasOwnProperty) and projectConfig.deployments is an object
  // Deep-merge project-level configuration with deployment configuration. Arrays are not concatenated.
  conf = merge(conf, env === 'prod' ? projectConfig.deployments[deplName] : projectConfig[env]);

  // Copy custom top-level attributes
  const builtinAttrs = Object.keys(defaultAppConfig).concat('dev', 'test', 'deployments');
  for (const key in projectConfig) {
    if (!builtinAttrs.includes(key)) {
      conf[key] = projectConfig[key];
    }
  }

  // BUG: prefix internal (undocumented) options with '_' to avoid overlap with user's custom options
  conf = merge(conf, {
    // BUG: shorten the list of supported editors?
    editor: null, // 'sublime', 'atom', 'code', 'webstorm', 'phpstorm', 'idea14ce', 'vim', 'emacs', 'visualstudio'
    appBuilder: conf.appBuilder !== undefined ? conf.appBuilder : true,
    env,
    assetsPublicPath: '/', // BUG: maybe set it to '/static/'? don't expose to user?
    deplName,
    _tempDir: tempDir,
    _projectDir: projectDir,
    // BUG: what if there are several production deployments? need separate folders for them?
    _distDir: env === 'prod' ? path.join(projectDir, 'dist') : tempDir, // Webpack will compile files to this folder
    // 'package.json': require(path.join(projectDir, 'package.json')), // BUG: do we need it?
  });

  // BUG: Validate both config files (depending on env), if invalid raise a meaningful error (with a link to local or public docs?)
  //      Look at https://github.com/mozilla/node-convict , https://github.com/ianstormtaylor/superstruct

  for (const key in config) {
    delete config[key];
  }
  Object.assign(config, conf);
}

function appTypes() {
  // We always need to compile backend if web app is present (to run the server)
  return ['backend', 'web', 'mobile', 'desktop'].filter(appType => config[appType] || (appType === 'backend' && config.web));
}

module.exports = {appTypes, config, loadConfig};
