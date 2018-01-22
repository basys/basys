const chokidar = require('chokidar');
const CLIEngine = require('eslint/lib/cli-engine');
const fs = require('fs');
const nodemon = require('nodemon');
const path = require('path');
const portfinder = require('portfinder');
const {config, loadConfig} = require('./config');
const {startDevServer} = require('./webpack/server');

async function devRun() {
  config.port = await portfinder.getPortPromise({host: config.host, port: config.port});
  if (config.type === 'web') {
    config.backendPort = await portfinder.getPortPromise({
      host: config.host,
      port: config.backendPort,
    });
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
    config.appBuilder.port = await portfinder.getPortPromise({
      host: config.host,
      port: config.appBuilder.port,
    });
    const configPath = path.join(config.tempDir, 'app-builder.json');
    fs.writeFileSync(
      configPath,
      JSON.stringify({
        host: config.host,
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

module.exports = {devRun, lint, prodRun};
