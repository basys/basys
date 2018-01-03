#!/usr/bin/env node

const chalk = require('chalk');
const fs = require('fs-extra');
const opn = require('opn');
const path = require('path');
const yargs = require('yargs');
const {config, loadConfig} = require('./config');
const {devRun, exit, prodRun} = require('./utils');

// BUG: think about --version output
const {argv} = yargs
  .usage('$0 <command> [args]')
  .command('dev', 'Start a development server')
  .command('build <deployment-name>', 'Build the project for production deployment', yargs => {
    yargs.positional('deployment-name', {type: 'string'});
  })
  .command('start <deployment-name>', 'Serve a production bundle', yargs => {
    yargs.positional('deployment-name', {type: 'string'});
  })
  .command('e2e', 'Run end-to-end tests')
  // BUG: add other commands (incl. 'help'?)
  .help();

const command = argv._[0];
try {
  if (argv._.length < 1) {
    throw new Error('You need to provide a command and the name of deployment config file');
  }

  if (!['dev', 'build', 'start', 'e2e'].includes(command)) {
    throw new Error('Invalid command provided');
  }
} catch (e) {
  yargs.showHelp();
  exit(chalk.bold.red(e.message));
}

const projectDir = process.cwd(); // BUG: is it always correct? Only if called from the project root directory?
const firstRun = !fs.pathExistsSync(path.join(projectDir, '.basys'));

// BUG: use async/await instead (first move the code to a function)?
let promise;
if (command === 'dev') {
  loadConfig(projectDir, 'dev');
  promise = devRun().then(() => {
    // Open web app and app builder when running dev server for the first time
    if (config.web && firstRun) {
      // BUG: exclude page paths with parameters from the search
      const pagePaths = Object.values(config._routes).map(route => route.path);
      const pagePath = pagePaths.includes('/') ? '/' : pagePaths[0];
      if (pagePath) {
        // BUG: setTimeout() hack waits for express server to start listening
        setTimeout(() => opn(`http://${config.host}:${config.port}${pagePath}`), 500);
      }
    }

    if (config.appBuilder) {
      // BUG: wait before printing the message - it may get lost if the start is slow.
      //      It should probably be printed in server.listen() callback.
      const appBuilderUrl = `http://${config.host}:${config.appBuilderPort}`;
      console.log(`App builder is available at ${appBuilderUrl}`);

      if (firstRun) opn(appBuilderUrl);
    }
  });
} else if (command === 'start') {
  loadConfig(projectDir, 'prod', argv['deployment-name']);
  promise = prodRun();
} else if (command === 'build') {
  loadConfig(projectDir, 'prod', argv['deployment-name']);
  promise = require('./webpack/build').build();
} else if (command === 'e2e') {
  // BUG: adopt it for running in CI tools
  const createTestCafe = require('testcafe');

  loadConfig(projectDir, 'test');

  // BUG: support working with desktop and mobile apps
  // BUG: we'll need to setup a database (if relevant) and remove it once finished
  // BUG: accept the list of apps/browsers to test on (via config, allow to override via CLI arguments)
  promise = require('./webpack/build')
    .build()
    .then(() => Promise.all([prodRun(), createTestCafe(config.host)]))
    .then(([_, testcafe]) => {
      // BUG: look at https://github.com/DevExpress/testcafe/blob/master/src/cli/index.js
      // BUG: support remote browsers
      // BUG: look at https://devexpress.github.io/testcafe/documentation/using-testcafe/programming-interface/runner.html#screenshots
      // BUG: looks like testcafe uses stage-2 babel preset - disallow stage-2/stage-3 features
      const runner = testcafe.createRunner();
      runner
        .src([path.join(projectDir, 'tests', 'e2e', 'index.js')])
        .browsers(config.testBrowsers)
        .run() // BUG: look at options https://devexpress.github.io/testcafe/documentation/using-testcafe/programming-interface/runner.html#run
        .then(() => {
          testcafe.close();
          process.exit();
        })
        .catch(error => {
          // BUG: improve it
          console.log(error);
        });

      // return testcafe.createBrowserConnection().then(remoteConnection => {
      //   remoteConnection.once('ready', () => {
      //     // BUG: call runner
      //   });
      // });
    });
}

promise.catch(err => {
  // console.log(err.stack);
  exit(chalk.bold.red(err));
});
