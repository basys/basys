const chalk = require('chalk');
const fs = require('fs-extra');
const http = require('http');
const path = require('path');
const util = require('util');
const {executeCommand} = require('../lib/index');

const exec = util.promisify(require('child_process').exec);

const testBasysAPI = async () => {
  const tempDir = path.join(__dirname, '..', '..', 'basys-starter-project');
  await fs.emptyDir(tempDir);
  await fs.copy(path.join(__dirname, '..', 'docs'), tempDir);
  await fs.move(path.join(tempDir, 'package_.json'), path.join(tempDir, 'package.json'));
  await fs.ensureDir(path.join(tempDir, '.basys')); // Prevent the app being opened in the browser on first start

  const {stdout, stderr} = await exec(`cd ${tempDir}; yarn install`);
  console.log(stdout, stderr);

  // Test dev server
  await executeCommand(tempDir, 'dev');
  await new Promise((resolve, reject) => {
    // BUG: a temporary timeout hack - executeCommand() should wait for backend server to start
    setTimeout(() => {
      // BUG: localhost and port should come from the result of command execution
      http.get('http://localhost:8080/', res => {
        if (res.statusCode === 200) {
          resolve();
        } else {
          reject('Failed to start dev server');
        }
      });
    }, 500);
  });
  // BUG: stop webpack and backend servers

  // BUG: test other operations: build, start, lint, lint:fix, test:e2e and check outcomes

  await fs.remove(tempDir);
};

testBasysAPI()
  .then(() => console.log(chalk.bold.green('Tests completed successfully')))
  .catch(err => console.log(chalk.bold.red(err)))
  .then(() => process.exit());
