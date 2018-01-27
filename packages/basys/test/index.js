const chalk = require('chalk');
const {exec} = require('child_process');
const fs = require('fs-extra');
const http = require('http');
const path = require('path');
const util = require('util');
const {executeCommand} = require('../lib/index');
const {config} = require('../lib/config');

const testBasysAPI = async () => {
  const tempDir = path.join(__dirname, '..', '..', 'basys-test');
  await fs.emptyDir(tempDir);

  const {initProject} = require('../../basys-cli/utils');
  await initProject({name: '../basys-todomvc', dest: tempDir}, false);

  // Prevent the app from being opened in the browser on first start of dev server
  await fs.ensureDir(path.join(tempDir, '.basys'));

  const {stdout, stderr} = await util.promisify(exec)(`cd ${tempDir}; yarn install`);
  console.log(stdout, stderr);

  await executeCommand(tempDir, 'lint:fix');
  await executeCommand(tempDir, 'test:e2e');

  // Test dev server
  await executeCommand(tempDir, 'dev');
  await new Promise((resolve, reject) => {
    http.get(`http://${config.host}:${config.port}/`, res => {
      if (res.statusCode === 200) {
        resolve();
      } else {
        reject('Failed to start dev server');
      }
    });
  });

  await fs.remove(tempDir);
};

testBasysAPI()
  .then(() => console.log(chalk.bold.green('Tests completed successfully')))
  .catch(err => console.log(chalk.bold.red(err.stack)))
  .then(() => process.exit());
