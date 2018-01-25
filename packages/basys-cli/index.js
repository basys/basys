#!/usr/bin/env node

const {exec} = require('child_process');
const downloadUrl = require('download');
const fs = require('fs-extra');
const inquirer = require('inquirer');
const ora = require('ora');
const path = require('path');
const util = require('util');
const yargs = require('yargs');

// Detect whether `dir` is inside a Basys project directory
function detectBasysProject(dir) {
  while (true) {
    if (dir === path.dirname(dir)) break;

    if (fs.existsSync(path.join(dir, 'basys.json')) && fs.existsSync(path.join(dir, 'package.json'))) {
      return dir;
    }

    dir = path.dirname(dir);
  }
}

const projectDir = detectBasysProject(process.cwd());
let cli = yargs.usage('$0 <command> [<arguments>]');

if (projectDir) {
  cli = cli
    .command('dev [<app-name>]', 'Start a development server', yargs => {
      yargs.positional('app-name', {type: 'string'});
    })
    .command('build [<app-name>]', 'Build the app for production', yargs => {
      yargs.positional('app-name', {type: 'string'});
    })
    .command('start [<app-name>]', 'Serve a production bundle', yargs => {
      yargs.positional('app-name', {type: 'string'});
    })
    .command('test:e2e [<app-name>]', 'Run end-to-end tests', yargs => {
      yargs.positional('app-name', {type: 'string'});
    })
    .command('lint', 'Lint the project code')
    .command('lint:fix', 'Lint the project code and apply fixes');
}

const {argv} = cli
  .command('init [<template-name>]', 'Scaffold a Basys project using a starter template', yargs => {
    yargs.positional('template-name', {
      type: 'string',
      describe: 'username/repo from GitHub or local directory',
    });
  })
  .command('help [<command>]', 'Show help for basys-cli', yargs => {
    yargs.positional('command', {type: 'string'});
  })
  .help();

async function runCommand() {
  if (argv._.length < 1) throw new Error('You need to provide a command');

  const command = argv._[0];
  const isProjectCommand = ['dev', 'build', 'start', 'test:e2e', 'lint', 'lint:fix'].includes(command);
  const isGenericCommand = ['help', 'init'].includes(command);
  if (!isProjectCommand && !isGenericCommand) throw new Error(`Invalid command: ${command}`);

  if (projectDir) {
    if (projectDir !== process.cwd()) {
      console.log(`Basys project detected at ${projectDir}`);
    }

    const {executeCommand} = require(require.resolve('basys/lib/index', {paths: [projectDir, __dirname]}));
    return executeCommand(projectDir, command, argv['app-name']);
  } else {
    if (isProjectCommand) throw new Error('This command must be run inside a Basys project directory');

    if (command === 'help') {
      // BUG: show help for command if provided
      yargs.showHelp();
    } if (command === 'init') {
      // Starter project can be an absolute/relative path or a github repo (with an optional branch)
      let templateName = argv['template-name'];
      let destDir;
      let promise = Promise.resolve();
      if (!argv['template-name']) {
        // If starter project is not provided in command arguments ask to select one
        promise = inquirer
          .prompt([{
            type: 'list',
            name: 'name',
            message: 'Select a starter project',
            choices: [
              {name: 'Blank project', value: 'basys/basys-starter-project'},
              {name: 'Todo list sample web app', value: 'basys/basys-todomvc'},
            ],
          }])
          .then(answers => {
            templateName = answers.name;
          });
      }

      let spinner;
      return promise
        .then(() => inquirer.prompt([{
          type: 'input',
          name: 'dest',
          message: 'Project location',
          default: '.',
          validate(dest) {
            if (!dest || dest.startsWith('.')) {
              destDir = path.join(process.cwd(), dest);
            } else {
              destDir = dest;
            }
            destDir = path.normalize(destDir);

            if (detectBasysProject(destDir)) return false; // BUG: provide error message about another Basys project
            // BUG: check that directory doesn't exist or empty, attempt to create if needed or show an error.

            return true;
          },
        }]))
        .then(() => {
          spinner = ora('Downloading starter project').start();
          if (path.isAbsolute(templateName) || templateName.startsWith('.') || templateName.startsWith('~')) {
            // Local directory
            let templateDir;
            if (templateName.startsWith('.')) {
              templateDir = path.join(process.cwd(), templateName);
            } else {
              templateDir = path.normalize(templateName);
            }
            return fs.copy(templateDir, destDir);
          } else {
            // Github repository
            const m = /^([^/]+)\/([^#]+)(#(.+))?$/.exec(templateName);
            const url = `https://github.com/${m[1]}/${m[2]}/archive/${m[4] || 'master'}.zip`;
            return downloadUrl(url, destDir, {extract: true, strip: 1, mode: '666', headers: {accept: 'application/zip'}});
          }
        })
        .then(async () => {
          if (!detectBasysProject(destDir)) {
            spinner.stop();
            throw new Error('Project provided with starter template is missing basys.json or package.json file');
          }

          spinner.text = 'Installing packages';
          process.chdir(destDir);
          await util.promisify(exec)('npm install');

          spinner.stop();
          // BUG: add a message about 'cd' (what about windows?), only if needed
          // BUG: add colors? change message if this is a local basys-cli instance?
          spinner.succeed('Successfully generated the project. To start the dev server run `basys dev`.');
        });
    }
  }
}

runCommand().catch(err => {
  // BUG: some errors are not bugs (like incorrect commands) - print error.message instead (errors without special attribute?)
  console.log(err.stack);
  process.exit(1);
});
