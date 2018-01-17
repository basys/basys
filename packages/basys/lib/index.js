const fs = require('fs-extra');
const opn = require('opn');
const path = require('path');
const {config, loadConfig} = require('./config');
const {devRun, exit, prodRun} = require('./utils');

// command='dev'/'start'/'build'/'e2e'
async function executeCommand(projectDir, command, appName) {
  const firstRun = !fs.pathExistsSync(path.join(projectDir, '.basys'));

  if (command === 'dev') {
    loadConfig(projectDir, appName, 'dev');
    await devRun();

    // Open web app and app builder when running dev server for the first time
    if (config.type === 'web' && firstRun) {
      // BUG: exclude page paths with parameters from the search
      const pagePaths = Object.values(config.vueComponents).map(info => info.path);
      const pagePath = pagePaths.includes('/') ? '/' : pagePaths[0];
      if (pagePath) {
        // BUG: setTimeout() hack waits for express server to start listening
        setTimeout(() => opn(`http://${config.host}:${config.port}${pagePath}`), 500);
      }
    }

    if (config.appBuilder) {
      // BUG: wait before printing the message - it may get lost if the start is slow.
      //      It should probably be printed in server.listen() callback.
      const appBuilderUrl = `http://${config.host}:${config.appBuilder.port}`;
      console.log(`App builder is available at ${appBuilderUrl}`);
      if (firstRun) opn(appBuilderUrl);
    }
  } else if (command === 'start') {
    loadConfig(projectDir, appName, 'prod');
    await prodRun();
  } else if (command === 'build') {
    loadConfig(projectDir, appName, 'prod');
    await require('./webpack/build').build();
  } else if (command === 'e2e') {
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
  }
}

module.exports = {executeCommand};
