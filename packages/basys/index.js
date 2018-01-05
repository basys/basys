#!/usr/bin/env node

const chalk = require('chalk');
const yargs = require('yargs');
const {executeCommand} = require('./lib/index');


const {argv} = yargs
  .usage('$0 <command> [args]')
  .command('dev', 'Start a development server')
  .command('build <deployment-name>', 'Build the project for production deployment', yargs => {
    yargs.positional('deployment-name', {type: 'string'});
  })
  .command('start <deployment-name>', 'Serve a production bundle', yargs => {
    yargs.positional('deployment-name', {type: 'string'});
  })
  .command('e2e', 'Run end-to-end tests')
  .help();

const command = argv._[0];
try {
  if (argv._.length < 1) {
    throw new Error('You need to provide a command and the name of deployment config file');
  }

  if (!['dev', 'build', 'start', 'e2e'].includes(command)) {
    throw new Error('Invalid command provided');
  }
} catch (e) {
  yargs.showHelp();
  console.log(chalk.bold.red(e.message));
  process.exit(1);
}

executeCommand(command, argv['deployment-name']).catch(err => {
  console.log(chalk.bold.red(err));
  process.exit(1);
});
