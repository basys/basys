const fs = require('fs-extra');
const opn = require('opn');
const path = require('path');
const portfinder = require('portfinder');
const {codeConfig, getConfig} = require('./config');
const {exit, monitorServerStatus} = require('./utils');
const {build} = require('./webpack/build');
const {startDevServer} = require('./webpack/dev');

async function dev(projectDir, appName) {
  let config = getConfig(projectDir, appName, 'dev');
  const host = config.host;
  const firstRun = !fs.pathExistsSync(path.join(config.tempDir, 'index.html'));

  config.port = await portfinder.getPortPromise({host, port: config.port});
  if (config.type === 'web') {
    config.backendPort = await portfinder.getPortPromise({host, port: config.backendPort});
  }

  let server = await startDevServer(config);

  // On basys.json changes restart the webpack dev server
  require('chokidar')
    .watch(path.join(projectDir, 'basys.json'), {ignoreInitial: true})
    .on('change', () => {
      // BUG: not all changes in basys.json require to restart the dev server and recompile the project
      // BUG: if host or app name changes dev server should be stopped
      server.close(async () => {
        const {backendPort, port} = config;
        config = getConfig(projectDir, config.appName, 'dev');
        config.port = port;
        config.backendPort = backendPort;
        server = await startDevServer(config);
      });

      // BUG: nodemon may need to be stopped or started (if config.type === 'web')
    });

  if (config.type === 'web') {
    const backendEntryPath = path.join(config.tempDir, 'backend.js');
    const watchPaths = [backendEntryPath];
    // BUG: only if there are pages
    watchPaths.push(path.join(config.tempDir, 'index.html'));
    // BUG: watch other files (like basys.json)?

    const nodemon = require('nodemon');
    nodemon({
      script: backendEntryPath,
      watch: watchPaths,
    });

    await new Promise((resolve, reject) => {
      nodemon
        .on('start', resolve)
        .on('crash', reject) // BUG: test it
        .on('restart', () => console.log('Express app restarted'));
    });

    const appUrl = `http://${host}:${config.port}`;
    console.log(`Your application is available at ${appUrl}`);

    // Open web app when running dev server for the first time
    if (firstRun) {
      // BUG: exclude page paths with parameters from the search
      const pagePaths = Object.values(config.vueComponents).map(info => info.path);
      const pagePath = pagePaths.includes('/') ? '/' : pagePaths[0];
      if (pagePath) opn(appUrl + pagePath);
    }
  }

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
        targetProjectDir: projectDir,
      }),
    );
    process.env.BASYS_CONFIG_PATH = configPath;
    require('basys-app-builder/backend.js');

    // Open app builder when running dev server for the first time
    await new Promise(resolve => {
      monitorServerStatus(host, config.appBuilder.port, true, connected => {
        if (connected) {
          const appBuilderUrl = `http://${host}:${config.appBuilder.port}`;
          console.log(`App builder is available at ${appBuilderUrl}`);
          if (firstRun) opn(appBuilderUrl);

          resolve();
        }
      });
    });
  }

  // BUG: expose API for stopping the dev server?
  return config;
}

async function start(projectDir, appName, env = 'prod') {
  const config = getConfig(projectDir, appName, env);
  if (config.type === 'web') {
    const backendPath = path.join(config.distDir, 'backend.js');
    if (!fs.pathExistsSync(backendPath)) {
      exit(`Please run \`basys build${appName ? ' ' + appName : ''}\` command first`);
    }

    const port = await portfinder.getPortPromise({host: config.host, port: config.port});
    config.port = port;
    config.backendPort = port;
    fs.ensureDirSync(config.distDir);
    fs.writeFileSync(path.join(config.distDir, 'config.json'), JSON.stringify({port}));

    require(backendPath);

    console.log(`Your application is available at http://${config.host}:${port}`);
  }
  return config;
}

function lint(projectDir, fix) {
  const CLIEngine = require('eslint/lib/cli-engine');
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

async function e2eTest(projectDir, appName) {
  // BUG: get fixture file detection in line with testcafe (see https://github.com/DevExpress/testcafe/issues/2074)
  const testPaths = require('glob').sync(path.join(projectDir, 'tests', 'e2e', '**', '*.js'));
  if (testPaths.length === 0) exit(`No tests found in ${path.join(projectDir, 'tests', 'e2e')}`);

  const env = 'test';
  await build(projectDir, appName, env);
  const config = await start(projectDir, appName, env);

  // Set the global variable accessible in test files
  global.basys = {
    env,
    appName,
    config: codeConfig(config),
  };

  // BUG: look at https://github.com/DevExpress/testcafe/blob/master/src/cli/index.js
  // BUG: support remote browsers
  // BUG: look at https://devexpress.github.io/testcafe/documentation/using-testcafe/programming-interface/runner.html#screenshots
  const testcafe = await require('testcafe')(config.host);
  const runner = testcafe.createRunner();
  await runner.src(testPaths).browsers(config.testBrowsers);

  try {
    await runner.run(); // BUG: look at options https://devexpress.github.io/testcafe/documentation/using-testcafe/programming-interface/runner.html#run
  } finally {
    await testcafe.close();
  }

  return config;
}

module.exports = {build, dev, e2eTest, lint, start};
