const chalk = require('chalk');
const chokidar = require('chokidar');
const fs = require('fs');
const nodemon = require('nodemon');
const path = require('path');
const portfinder = require('portfinder');

async function devRun() {
  const {config, loadConfig} = require('./config');
  let backendPort;

  if (config.backend) {
    backendPort = await portfinder.getPortPromise({host: config.host, port: config.backend.port || 3000});
    config.backendPort = backendPort;
  }

  const {startDevServer} = require('./webpack/server');
  const port = await portfinder.getPortPromise({host: config.host, port: config.port});
  config.port = port;
  let server = await startDevServer();

  // On basys.json changes restart the webpack dev server
  chokidar.watch(path.join(config._projectDir, 'basys.json'), {ignoreInitial: true}).on('change', () => {
    // BUG: not all changes in basys.json require to restart the dev server and recompile the project
    server.close(async () => {
      loadConfig(config._projectDir, 'dev');
      config.port = port;
      config.backendPort = backendPort;
      server = await startDevServer();
    });

    // BUG: nodemon may need to be stopped or started
  });

  if (config.appBuilder) {
    // BUG: what if config.appBuilder option changes?
    config.appBuilderPort = await portfinder.getPortPromise({host: config.host, port: 8090});
    const configPath = path.join(config._tempDir, 'app-builder.json');
    fs.writeFileSync(
      configPath,
      JSON.stringify({
        host: config.host,
        port: config.appBuilderPort,
        appPort: config.port,
        targetProjectDir: config._projectDir,
      }),
    );
    process.env.BASYS_CONFIG_PATH = configPath;
    require('basys-app-builder/backend/backend.js');
  }

  if (config.backend) {
    const backendEntryPath = path.join(config._tempDir, 'backend', 'backend.js');
    const watchPaths = [backendEntryPath];
    if (config.web) watchPaths.push(path.join(config._tempDir, 'web', 'index.html'));
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
  const {config} = require('./config');

  if (config.backend) {
    config.backendPort = config.port;
    require(path.join(config._distDir, 'backend', 'backend.js'));
  }
}

function exit(error) {
  console.log(chalk.bold.red(error));
  process.exit(1);
}

module.exports = {devRun, exit, prodRun};
