#!/usr/bin/env node

const chalk = require('chalk');
const yargs = require('yargs');
const {detectBasysProject, initProject} = require('./utils');

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

function exit(error, showHelp = false) {
  console.log(chalk.red.bold(error));
  if (showHelp) yargs.showHelp();
  process.exit(1);
}

async function runCommand() {
  if (argv._.length < 1) exit('You need to provide a command', true);

  const command = argv._[0];
  const isProjectCommand = ['dev', 'build', 'start', 'test:e2e', 'lint', 'lint:fix'].includes(command);
  const isGenericCommand = ['help', 'init'].includes(command);
  if (!isProjectCommand && !isGenericCommand) exit(`Invalid command: ${command}`, true);

  if (isProjectCommand) {
    if (projectDir !== process.cwd()) {
      console.log(`Basys project detected at ${projectDir}`);
    }

    const {build, dev, e2eTest, lint, start} = require(require.resolve('basys/lib/index', {
      paths: [projectDir, __dirname],
    }));
    const appName = argv['app-name'];
    if (command === 'dev') {
      return await dev(projectDir, appName);
    } else if (command === 'start') {
      return await start(projectDir, appName);
    } else if (command === 'build') {
      return await build(projectDir, appName);
    } else if (command === 'test:e2e') {
      await e2eTest(projectDir, appName);
      process.exit();
    } else if (command === 'lint') {
      return lint(projectDir);
    } else if (command === 'lint:fix') {
      return lint(projectDir, true);
    }
  } else {
    if (command === 'help') {
      // BUG: show help for command if provided
      yargs.showHelp();
    } else if (command === 'init') {
      return initProject({name: argv['template-name']});
    }
  }
}

runCommand().catch(err => exit(err.stack));

process.on('SIGINT', () => process.exit());
