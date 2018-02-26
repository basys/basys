const chalk = require('chalk');
const {exec} = require('child_process');
const fs = require('fs-extra');
const http = require('http');
const path = require('path');
const util = require('util');
const {dev, e2eTest, lint} = require('../lib/index');

async function testBasysAPI() {
  const projectDir = path.join(__dirname, '..', '..', 'basys-test');
  await fs.emptyDir(projectDir);

  const {initProject} = require('../../basys-cli/utils');
  await initProject({name: '../basys-todomvc', dest: projectDir, vscode: false}, false);

  // Prevent the app from being opened in the browser on first start of dev server
  await fs.ensureFile(path.join(projectDir, '.basys', 'todomvc', 'dev', 'index.html'));

  const {stdout, stderr} = await util.promisify(exec)(`cd ${projectDir}; yarn install`);
  console.log(stdout, stderr);

  await lint(projectDir, true);
  await e2eTest(projectDir);

  const devConfig = await dev(projectDir);
  await new Promise((resolve, reject) => {
    http.get(`http://${devConfig.host}:${devConfig.port}/`, res => {
      if (res.statusCode === 200) {
        resolve();
      } else {
        reject('Failed to start dev server');
      }
    });
  });

  await fs.remove(projectDir);
}

testBasysAPI()
  .then(() => console.log(chalk.bold.green('Tests completed successfully')))
  .catch(err => console.log(chalk.bold.red(err.stack)))
  .then(() => process.exit());
