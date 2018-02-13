const chalk = require('chalk');
const fs = require('fs-extra');
const path = require('path');

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
  let spinner;

  function validateDestPath(dest) {
    if (!dest || !path.isAbsolute(dest)) {
      destDir = path.join(cwd, dest);
    } else {
      destDir = dest;
    }
    destDir = path.normalize(destDir);

    if (fs.pathExistsSync(destDir) && fs.readdirSync(destDir).length > 0) return 'Provided directory is not empty';
    if (detectBasysProject(destDir)) return 'Provided location is already inside another Basys project';

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

  const ora = require('ora');
  spinner = ora('Downloading starter project').start();
  if (path.isAbsolute(templateName) || templateName.startsWith('.') || templateName.startsWith('~')) {
    // Local directory
    let templateDir;
    if (templateName.startsWith('.')) {
      templateDir = path.join(cwd, templateName);
    } else {
      templateDir = path.normalize(templateName);
    }
    await fs.copy(templateDir, destDir);
  } else {
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
  }

  if (!detectBasysProject(destDir)) {
    spinner.stop();
    throw new Error('Project provided with starter template is missing basys.json or package.json file');
  }

  if (install) {
    spinner.text = 'Installing packages';
    process.chdir(destDir);
    try {
      await require('util').promisify(require('child_process').exec)('npm install');
    } catch (e) {
      spinner.stop();
      throw new Error('Installing npm packages failed');
    }
  }

  spinner.stop();

  // BUG: change commands to 'npm/yarn basys dev' if this is a local basys-cli instance is used?
  let commands = '';
  if (cwd !== destDir) {
    // BUG: what about windows?
    commands += '`' + chalk.green.bold('cd ' + path.relative(cwd, destDir)) + '`, then ';
  }
  commands += '`' + chalk.green.bold('basys dev') + '`';
  spinner.succeed(`Successfully generated the project. To start the dev server run ${commands}.`);
}

module.exports = {detectBasysProject, initProject};
