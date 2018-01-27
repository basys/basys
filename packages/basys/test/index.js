const chalk = require('chalk');
const {exec} = require('child_process');
const fs = require('fs-extra');
const http = require('http');
const path = require('path');
const util = require('util');
const {executeCommand} = require('../lib/index');

const testBasysAPI = async () => {
  const tempDir = path.join(__dirname, '..', '..', 'basys-test');
  await fs.emptyDir(tempDir);

  const {initProject} = require('../../basys-cli/utils');
  await initProject({name: '../basys-todomvc', dest: tempDir}, false);

  // Prevent the app from being opened in the browser on first start of dev server
  await fs.ensureDir(path.join(tempDir, '.basys'));

  const {stdout, stderr} = await util.promisify(exec)(`cd ${tempDir}; yarn install`);
  console.log(stdout, stderr);

  // Test dev server
  await executeCommand(tempDir, 'dev');
  await new Promise((resolve, reject) => {
    // BUG: localhost and port should come from the result of command execution
    http.get('http://localhost:8080/', res => {
      if (res.statusCode === 200) {
        resolve();
      } else {
        reject('Failed to start dev server');
      }
    });
  });
  // BUG: stop webpack and backend servers

  // BUG: test other operations: build, start, lint, lint:fix, test:e2e and check outcomes

  await fs.remove(tempDir);
};

testBasysAPI()
  .then(() => console.log(chalk.bold.green('Tests completed successfully')))
  .catch(err => console.log(chalk.bold.red(err)))
  .then(() => process.exit());
