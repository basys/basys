const chalk = require('chalk');
const fs = require('fs-extra');
const http = require('http');
const path = require('path');
const {dev, e2eTest, initProject, lint} = require('../lib/index');
const {execShellCommand} = require('../../basys-cli/utils');

async function testBasysAPI() {
  const projectDir = path.join(__dirname, '..', '..', 'basys-test');
  await fs.emptyDir(projectDir);

  await initProject({name: 'basys/basys-todomvc', dest: projectDir, vscode: false}, false);

  // Prevent the app from being opened in the browser on first start of dev server
  await fs.ensureFile(path.join(projectDir, '.basys', 'todomvc', 'dev', 'index.html'));

  await execShellCommand('yarn', ['install'], projectDir);

  await lint(projectDir, true);
  await e2eTest(projectDir);

  // BUG: running dev server prevents AppVeyor test from completing since some Node process is not killed
  if (process.platform !== 'win32') {
    const devConfig = await dev(projectDir, null, false);
    await new Promise((resolve, reject) => {
      http.get(`http://${devConfig.host}:${devConfig.port}/`, res => {
        if (res.statusCode === 200) {
          resolve();
        } else {
          reject(new Error('Failed to start dev server'));
        }
      });
    });
  }

  await fs.remove(projectDir);
}

testBasysAPI()
  .then(() => console.log(chalk.bold.green('Tests completed successfully')))
  .catch(err => {
    console.log(chalk.bold.red(err.stack));
    process.exitCode = 1;
  })
  .then(() => process.exit());
