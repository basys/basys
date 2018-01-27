const chalk = require('chalk');
const {exec} = require('child_process');
const fs = require('fs-extra');
const http = require('http');
const path = require('path');
const util = require('util');
const {dev, e2eTest, lint} = require('../lib/index');

async function testBasysAPI() {
  const tempDir = path.join(__dirname, '..', '..', 'basys-test');
  await fs.emptyDir(tempDir);

  const {initProject} = require('../../basys-cli/utils');
  await initProject({name: '../basys-todomvc', dest: tempDir}, false);

  // Prevent the app from being opened in the browser on first start of dev server
  await fs.ensureDir(path.join(tempDir, '.basys'));

  const {stdout, stderr} = await util.promisify(exec)(`cd ${tempDir}; yarn install`);
  console.log(stdout, stderr);

  await lint(tempDir, true);
  await e2eTest(tempDir);

  const devConfig = await dev(tempDir);
  await new Promise((resolve, reject) => {
    http.get(`http://${devConfig.host}:${devConfig.port}/`, res => {
      if (res.statusCode === 200) {
        resolve();
      } else {
        reject('Failed to start dev server');
      }
    });
  });

  await fs.remove(tempDir);
}

testBasysAPI()
  .then(() => console.log(chalk.bold.green('Tests completed successfully')))
  .catch(err => console.log(chalk.bold.red(err.stack)))
  .then(() => process.exit());
