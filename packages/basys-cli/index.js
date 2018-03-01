#!/usr/bin/env node

const fs = require('fs');
const {usage} = require('yargs');
const {detectBasysProject, exit, runCommand} = require('./utils');

const projectDir = detectBasysProject(process.cwd());

// If we run Basys CLI inside a project directory use the local version of basys-cli if installed
let localCLIPath = null;
if (projectDir && projectDir !== detectBasysProject(__dirname)) {
  localCLIPath = require.resolve('basys-cli', {paths: [projectDir]});
  if (!fs.existsSync(localCLIPath)) localCLIPath = null;
}

if (localCLIPath) {
  require(localCLIPath);
} else {
  let cli = usage('$0 <command> [<arguments>]');

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
    .command(
      'init [<template-name>]',
      'Scaffold a Basys project using a starter template',
      yargs => {
        yargs.positional('template-name', {
          type: 'string',
          describe: 'username/repo from GitHub or local directory',
        });
      },
    )
    .command('help [<command>]', 'Show help for basys-cli', yargs => {
      yargs.positional('command', {type: 'string'});
    })
    .help();

  module.exports = runCommand(projectDir, argv).catch(err => exit(err.stack));

  process.on('SIGINT', () => process.exit());
}
