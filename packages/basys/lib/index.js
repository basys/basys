const fs = require('fs-extra');
const opn = require('opn');
const path = require('path');
const {config, loadConfig} = require('./config');
const {devRun, prodRun} = require('./utils');

// command='dev'/'start'/'build'/'e2e'
async function executeCommand(command, deplName) {
  const projectDir = process.cwd(); // BUG: is it always correct? Only if called from the project root directory?
  const firstRun = !fs.pathExistsSync(path.join(projectDir, '.basys'));

  if (command === 'dev') {
    loadConfig(projectDir, 'dev');
    await devRun();

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
  } else if (command === 'start') {
    loadConfig(projectDir, 'prod', deplName);
    await prodRun();
  } else if (command === 'build') {
    loadConfig(projectDir, 'prod', deplName);
    await require('./webpack/build').build();
  } else if (command === 'e2e') {
    // BUG: adopt it for running in CI tools
    const createTestCafe = require('testcafe');

    loadConfig(projectDir, 'test');

    // BUG: support working with desktop and mobile apps
    // BUG: we'll need to setup a database (if relevant) and remove it once finished
    // BUG: accept the list of apps/browsers to test on (via config, allow to override via CLI arguments)
    await require('./webpack/build').build();
    await prodRun();

    // BUG: look at https://github.com/DevExpress/testcafe/blob/master/src/cli/index.js
    // BUG: support remote browsers
    // BUG: look at https://devexpress.github.io/testcafe/documentation/using-testcafe/programming-interface/runner.html#screenshots
    // BUG: looks like testcafe uses stage-2 babel preset - disallow stage-2/stage-3 features
    const testcafe = await createTestCafe(config.host);
    const runner = testcafe.createRunner();
    await runner
      .src([path.join(projectDir, 'tests', 'e2e', 'index.js')])
      .browsers(config.testBrowsers)
      .run(); // BUG: look at options https://devexpress.github.io/testcafe/documentation/using-testcafe/programming-interface/runner.html#run

    testcafe.close();
    process.exit();

    // return testcafe.createBrowserConnection().then(remoteConnection => {
    //   remoteConnection.once('ready', () => {
    //     // BUG: call runner
    //   });
    // });
  }
}

module.exports = {executeCommand};
