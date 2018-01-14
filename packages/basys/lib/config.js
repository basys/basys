const deepmerge = require('deepmerge');
const fs = require('fs-extra');
const JSON5 = require('json5');
const path = require('path');
const {exit} = require('./utils');

const config = {};

function merge(dest, src) {
  return deepmerge(dest, src, {arrayMerge: (destination, source) => source});
}

// `appName` may be null if config defines only 1 app
function loadConfig(projectDir, appName, env) {
  if (!['dev', 'test', 'prod'].includes(env)) exit(`Incorrect env value: ${env}`);
  process.env.NODE_ENV = {dev: 'development', test: 'testing', prod: 'production'}[env];

  const configPath = path.join(projectDir, 'basys.json');
  let projectConfig;
  try {
    projectConfig = fs.readFileSync(configPath, 'utf8');
  } catch (e) {
    exit(`${e.message}\n`);
  }

  try {
    projectConfig = JSON5.parse(projectConfig);
  } catch (e) {
    exit(
      `Syntax error in ${configPath}: ${e.message}\n` +
        'You can use JSON5 (http://json5.org) which is an extension of the JSON format, that includes:\n' +
        '  - comments,\n  - unquoted and single-quoted object keys,\n  - trailing commas,\n  - single-quoted and multi-line strings.\n',
    );
  }

  // BUG: Introduce some shortcuts for validating the configs, or use some library. App builder import function should do it.
  if (!projectConfig || projectConfig.constructor !== Object) {
    exit(`${configPath} value must be an object`);
  }

  if (!projectConfig.apps) exit("'apps' option must be provided in basys.json");
  const appNames = Object.keys(projectConfig.apps);
  if (appNames.length === 0) exit('At least one app must be defined in basys.json');
  // BUG: validate that all appNames use allowed symbols only

  if (!appName) {
    if (appNames.length > 1) exit('App name must be specified');
    appName = appNames[0];
  }

  if (!appNames.includes(appName)) exit(`Incorrect app name. Available names are: ${appNames.join(', ')}.`);

  let conf = projectConfig.apps[appName];
  if (!['web', 'mobile', 'desktop'].includes(conf.type)) exit(`Incorrect app type: ${conf.type}`);

  // Default app configuration
  const defaultConfig = {
    entry: null, // Path to UI entry file (relative to src/ directory)
    favicon: false,
    styles: [],
    cssSourceMap: env === 'test',
    jsSourceMap: env === 'test',

    // BUG: shorten the list of supported editors?
    editor: null, // 'sublime', 'atom', 'code', 'webstorm', 'phpstorm', 'idea14ce', 'vim', 'emacs', 'visualstudio'

    host: 'localhost',
    // In dev env another free port will be determined if this one is occupied.
    // In other envs the server will fail to start.
    port: 8080,

    poll: false, // dev env only, see https://webpack.js.org/configuration/dev-server/#devserver-watchoptions-
    bundleAnalyzerReport: false, // BUG: think about it, makes sense only if env==='prod'
    custom: {}, // Holds custom config options (shouldn't overlap with any built-in options)
  };

  if (projectConfig.appBuilder) {
    defaultConfig.appBuilder = merge({port: 8090}, projectConfig.appBuilder);
  }

  if (conf.type === 'web') {
    Object.assign(defaultConfig, {
      backendEntry: null, // Path to backend entry file (relative to src/ directory)
      backendPort: 3000,
      nodeVersion: env === 'dev' ? 'current' : '8.9',

      browsers: ['> 1%', 'last 2 versions'],

      // BUG: automatically detect the browsers available on developer's machine? (only relevant if web app is present)
      // BUG: allow to override it via CLI arguments?
      // BUG: support remote browsers
      // Available values: 'chromium', 'chrome', 'chrome:headless', 'chrome-canary', 'ie', 'edge',
      // 'firefox', 'firefox:headless', 'opera', 'safari'
      testBrowsers: [],
    });
  }
  // BUG: for mobile apps provide ios/android configuration, supported versions

  if (conf[env]) {
    conf = merge(conf, conf[env]);
    delete conf.dev;
    delete conf.test;
    delete conf.prod;
  }

  conf = merge(defaultConfig, conf);

  // Validate that custom options don't overlap with any built-in options
  for (const key in conf.custom) {
    if (key in conf) exit(`Custom config option '${key}' is not allowed`);
  }

  const tempDir = path.join(projectDir, '.basys', appName, env);
  fs.ensureDirSync(tempDir);

  conf = merge(conf, {
    appName,
    env,
    assetsPublicPath: '/', // BUG: maybe set it to '/static/'? don't expose to user?
    tempDir,
    projectDir,
    distDir: env === 'prod' ? path.join(projectDir, 'dist', appName) : tempDir,
  });

  // BUG: Validate both config files (depending on env), if invalid raise a meaningful error (with a link to local or public docs?)
  //      Look at https://github.com/mozilla/node-convict , https://github.com/ianstormtaylor/superstruct

  for (const key in config) {
    delete config[key];
  }
  Object.assign(config, conf);
}

module.exports = {config, loadConfig};
