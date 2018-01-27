const chokidar = require('chokidar');
const CLIEngine = require('eslint/lib/cli-engine');
const fs = require('fs-extra');
const nodemon = require('nodemon');
const opn = require('opn');
const path = require('path');
const portfinder = require('portfinder');
const {config, exit, loadConfig} = require('./config');
const {monitorServerStatus} = require('./utils');
const {startDevServer} = require('./webpack/server');

async function devRun() {
  const host = config.host;
  config.port = await portfinder.getPortPromise({host, port: config.port});
  if (config.type === 'web') {
    config.backendPort = await portfinder.getPortPromise({host, port: config.backendPort});
  }

  let server = await startDevServer();

  // On basys.json changes restart the webpack dev server
  chokidar.watch(path.join(config.projectDir, 'basys.json'), {ignoreInitial: true}).on('change', () => {
    // BUG: not all changes in basys.json require to restart the dev server and recompile the project
    server.close(async () => {
      const {backendPort, port} = config;
      loadConfig(config.projectDir, config.appName, 'dev');
      config.port = port;
      config.backendPort = backendPort;
      server = await startDevServer();
    });

    // BUG: nodemon may need to be stopped or started
  });

  if (config.appBuilder) {
    // BUG: what if config.appBuilder option changes?
    config.appBuilder.port = await portfinder.getPortPromise({host, port: config.appBuilder.port});
    const configPath = path.join(config.tempDir, 'app-builder.json');
    fs.writeFileSync(
      configPath,
      JSON.stringify({
        host,
        port: config.appBuilder.port,
        backendPort: config.appBuilder.port,
        appPort: config.port,
        targetProjectDir: config.projectDir,
      }),
    );
    process.env.BASYS_CONFIG_PATH = configPath;
    require('basys-app-builder/backend.js');
  }

  if (config.type === 'web') {
    const backendEntryPath = path.join(config.tempDir, 'backend.js');
    const watchPaths = [backendEntryPath];
    // BUG: only if there are pages
    watchPaths.push(path.join(config.tempDir, 'index.html'));
    // BUG: watch other files (like basys.json)?

    nodemon({
      script: backendEntryPath,
      watch: watchPaths,
      // BUG: configure stdout so that log is printed
    });

    return new Promise((resolve, reject) => {
      nodemon
        .on('start', resolve)
        .on('crash', reject) // BUG: test it
        .on('restart', () => console.log('Express app restarted'));
    });
  }
}

async function prodRun() {
  if (config.type === 'web') {
    config.backendPort = config.port;
    require(path.join(config.distDir, 'backend.js'));
  }
}

function lint(projectDir, fix) {
  const engine = new CLIEngine({
    cwd: projectDir,
    extensions: ['.js', '.vue'],
    cache: true,
    cacheLocation: '.basys/.eslintcache',
    reportUnusedDisableDirectives: true,
    fix,
  });
  const report = engine.executeOnFiles(['src', 'tests']);

  if (fix) CLIEngine.outputFixes(report);

  const formatter = engine.getFormatter();
  const output = formatter(report.results);
  if (output) console.log(output);
}

// command='dev'/'start'/'build'/'test:e2e'/'lint'/'lint:fix'
async function executeCommand(projectDir, command, appName) {
  const firstRun = !fs.pathExistsSync(path.join(projectDir, '.basys'));

  if (command === 'dev') {
    loadConfig(projectDir, appName, 'dev');
    await devRun();

    const promises = [];

    // Open web app and app builder when running dev server for the first time
    if (config.type === 'web') {
      const appUrl = `http://${config.host}:${config.port}`;
      console.log(`Your application is available at ${appUrl}`);

      if (firstRun) {
        // BUG: exclude page paths with parameters from the search
        const pagePaths = Object.values(config.vueComponents).map(info => info.path);
        const pagePath = pagePaths.includes('/') ? '/' : pagePaths[0];
        if (pagePath) opn(appUrl + pagePath);
      }
    }

    if (config.appBuilder) {
      await new Promise((resolve, reject) => {
        monitorServerStatus(config.host, config.appBuilder.port, true, () => {
          const appBuilderUrl = `http://${config.host}:${config.appBuilder.port}`;
          console.log(`App builder is available at ${appBuilderUrl}`);
          if (firstRun) opn(appBuilderUrl);

          resolve();
        });
      });
    }
  } else if (command === 'start') {
    loadConfig(projectDir, appName, 'prod');
    await prodRun();
  } else if (command === 'build') {
    loadConfig(projectDir, appName, 'prod');
    await require('./webpack/build').build();
  } else if (command === 'test:e2e') {
    loadConfig(projectDir, appName, 'test');

    if (!config.e2eEntry) exit('End-to-end tests are not configured for this app');

    // BUG: allow to reuse an existing production build?
    // BUG: support working with desktop and mobile apps
    // BUG: we'll need to setup a database (if relevant) and remove it once finished
    await require('./webpack/build').build();
    await prodRun();

    // BUG: look at https://github.com/DevExpress/testcafe/blob/master/src/cli/index.js
    // BUG: support remote browsers
    // BUG: look at https://devexpress.github.io/testcafe/documentation/using-testcafe/programming-interface/runner.html#screenshots
    const testcafe = await require('testcafe')(config.host);
    const runner = testcafe.createRunner();
    await runner.src([path.join(projectDir, 'tests', 'e2e', config.e2eEntry)]).browsers(config.testBrowsers);

    try {
      await runner.run(); // BUG: look at options https://devexpress.github.io/testcafe/documentation/using-testcafe/programming-interface/runner.html#run
    } finally {
      await testcafe.close();
    }

    process.exit();
  } else if (command === 'lint') {
    lint(projectDir);
  } else if (command === 'lint:fix') {
    lint(projectDir, true);
  }
}

module.exports = {executeCommand};
