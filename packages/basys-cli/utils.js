const chalk = require('chalk');
const fs = require('fs-extra');
const path = require('path');
const {showHelp} = require('yargs');

// Detect whether `dir` is inside a Basys project directory
function detectBasysProject(dir) {
  while (true) {
    if (dir === path.dirname(dir)) break;
    if (fs.existsSync(path.join(dir, 'basys.json'))) return dir;
    dir = path.dirname(dir);
  }
}

function exit(error, help = false) {
  console.log(chalk.red.bold(error));
  if (help) showHelp();
  process.exit(1);
}

function execShellCommand(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const execa = require('execa');
    const child = execa(command, args, {
      cwd,
      stdio: ['inherit', 'inherit', 'inherit'],
    });

    child.on('close', code => {
      if (code !== 0) {
        reject(new Error(`Command \`${command} ${args.join(' ')}\` failed with exit code ${code}`));
        return;
      }
      resolve();
    });
  });
}

async function runCommand(projectDir, argv) {
  if (argv._.length < 1) exit('You need to provide a command', true);

  const command = argv._[0];
  const isProjectCommand = [
    'dev',
    'build',
    'start',
    'test:unit',
    'test:e2e',
    'lint',
    'lint:fix',
  ].includes(command);
  const isGenericCommand = ['help', 'init'].includes(command);
  if (!isProjectCommand && !isGenericCommand) exit(`Invalid command: ${command}`, true);

  if (isProjectCommand) {
    if (projectDir !== process.cwd()) {
      console.log(`Basys project detected at ${projectDir}`);
    }

    const {build, dev, e2eTest, lint, start, unitTest} = require(require.resolve(
      'basys/lib/index',
      {
        paths: [projectDir, __dirname],
      },
    ));
    const appName = argv['app-name'];
    if (command === 'dev') {
      return dev(projectDir, appName, !argv.b);
    } else if (command === 'start') {
      return start(projectDir, appName);
    } else if (command === 'build') {
      return build(projectDir, appName);
    } else if (command === 'test:unit') {
      await unitTest(projectDir);
    } else if (command === 'test:e2e') {
      // BUG: allow to customize the options via CLI options https://devexpress.github.io/testcafe/documentation/using-testcafe/programming-interface/runner.html#run
      await e2eTest(projectDir, appName, {debugOnFail: true});
      process.exit();
    } else if (command === 'lint') {
      return lint(projectDir);
    } else if (command === 'lint:fix') {
      return lint(projectDir, true);
    }
  } else {
    if (command === 'help') {
      // BUG: show help for command if provided
      showHelp();
    } else if (command === 'init') {
      return initProject({name: argv['template-name']});
    }
  }
}

// `answers.name` can be an absolute/relative directory path or a github repo (with an optional branch)
async function initProject(answers, install = true) {
  const inquirer = require('inquirer');
  let templateName;
  if (answers.name) {
    templateName = answers.name;
  } else {
    // If starter project is not provided in command arguments ask to select one
    templateName = (await inquirer.prompt([
      {
        type: 'list',
        name: 'name',
        message: 'Select a starter project',
        choices: [
          {name: 'Blank project', value: 'basys/basys-starter-project'},
          {name: 'Todo list sample web app', value: 'basys/basys-todomvc'},
        ],
      },
    ])).name;
  }

  const cwd = process.cwd();
  let destDir;

  function validateDestPath(dest) {
    if (!dest || !path.isAbsolute(dest)) {
      destDir = path.join(cwd, dest);
    } else {
      destDir = dest;
    }
    destDir = path.normalize(destDir);

    if (fs.pathExistsSync(destDir) && fs.readdirSync(destDir).length > 0)
      return 'Provided directory is not empty';
    if (detectBasysProject(destDir))
      return 'Provided location is already inside another Basys project';

    return true;
  }

  if (answers.dest) {
    const res = validateDestPath(answers.dest);
    if (typeof res === 'string') throw Error(res);
  } else {
    await inquirer.prompt([
      {
        type: 'input',
        name: 'dest',
        message: 'Project location',
        default: '.',
        validate: validateDestPath,
      },
    ]);
  }

  // Generate Visual Studio Code workspace settings
  let addVSCode;
  if (typeof answers.vscode === 'boolean') {
    addVSCode = answers.vscode;
  } else {
    addVSCode = (await inquirer.prompt([
      {
        type: 'confirm',
        name: 'vscode',
        message: 'Would you like to add Visual Studio Code settings?',
        default: true,
      },
    ])).vscode;
  }

  const ora = require('ora');
  const spinner = ora('Downloading starter project');
  if (
    path.isAbsolute(templateName) ||
    templateName.startsWith('.') ||
    templateName.startsWith('~')
  ) {
    // Local directory
    let templateDir;
    if (templateName.startsWith('.')) {
      templateDir = path.join(cwd, templateName);
    } else {
      templateDir = path.normalize(templateName);
    }
    await fs.copy(templateDir, destDir);
  } else {
    spinner.start();
    // Github repository
    const m = /^([^/]+)\/([^#]+)(#(.+))?$/.exec(templateName);
    const url = `https://github.com/${m[1]}/${m[2]}/archive/${m[4] || 'master'}.zip`;
    const downloadUrl = require('download');
    await downloadUrl(url, destDir, {
      extract: true,
      strip: 1,
      mode: '666',
      headers: {accept: 'application/zip'},
    });
    spinner.stop();
  }

  if (!detectBasysProject(destDir)) {
    await fs.remove(destDir); // BUG: don't remove the directory if it existed before
    throw new Error(
      'Project provided with starter template is missing basys.json or package.json file',
    );
  }

  await fs.ensureDir(path.join(destDir, 'assets'));

  if (!fs.existsSync(path.join(destDir, '.gitignore'))) {
    await fs.copy(path.join(__dirname, 'templates', 'gitignore'), path.join(destDir, '.gitignore'));
  }

  await fs.copy(
    path.join(__dirname, 'templates', 'jest.config.js'),
    path.join(destDir, 'jest.config.js'),
  );

  if (addVSCode) {
    await fs.copy(
      path.join(__dirname, 'templates', 'jsconfig.json'),
      path.join(destDir, 'jsconfig.json'),
    );
    await fs.copy(
      path.join(__dirname, 'templates', 'settings.json'),
      path.join(destDir, '.vscode', 'settings.json'),
    );
    await fs.copy(
      path.join(__dirname, 'templates', 'extensions.json'),
      path.join(destDir, '.vscode', 'extensions.json'),
    );
  }

  if (install) {
    console.log();
    try {
      await execShellCommand('npm', ['install'], destDir);
    } catch (e) {
      spinner.stop();
      exit('Installing npm packages failed');
    }
  }

  let commands = '';
  if (cwd !== destDir) {
    commands += `\`${chalk.green.bold(`cd ${path.relative(cwd, destDir)}`)}\`, then `;
  }
  // BUG: change commands to 'npm run/yarn basys dev' if a local basys-cli instance is used?
  commands += `\`${chalk.green.bold('basys dev')}\``;
  spinner.succeed(`Successfully generated the project. To start the dev server run ${commands}.`);
}

module.exports = {detectBasysProject, execShellCommand, exit, initProject, runCommand};
