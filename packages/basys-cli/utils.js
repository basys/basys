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
function initProject(answers, install = true) {
  const inquirer = require('inquirer');
  let promise;
  let templateName;
  if (answers.name) {
    templateName = answers.name;
    promise = Promise.resolve();
  } else {
    // If starter project is not provided in command arguments ask to select one
    promise = inquirer
      .prompt([
        {
          type: 'list',
          name: 'name',
          message: 'Select a starter project',
          choices: [
            {name: 'Blank project', value: 'basys/basys-starter-project'},
            {name: 'Todo list sample web app', value: 'basys/basys-todomvc'},
          ],
        },
      ])
      .then(answers => {
        templateName = answers.name;
      });
  }

  let destDir;
  let spinner;

  function validateDestPath(dest) {
    if (!dest || dest.startsWith('.')) {
      destDir = path.join(process.cwd(), dest);
    } else {
      destDir = dest;
    }
    destDir = path.normalize(destDir);

    if (detectBasysProject(destDir)) return 'Provided location is already inside another Basys project';
    // BUG: check that directory doesn't exist or empty, attempt to create if needed or show an error

    return true;
  }

  return promise
    .then(() => {
      if (answers.dest) {
        const res = validateDestPath(answers.dest);
        if (typeof res === 'string') throw Error(res);
        return Promise.resolve();
      } else {
        return inquirer.prompt([
          {
            type: 'input',
            name: 'dest',
            message: 'Project location',
            default: '.',
            validate: validateDestPath,
          },
        ]);
      }
    })
    .then(() => {
      const ora = require('ora');
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
        const downloadUrl = require('download');
        return downloadUrl(url, destDir, {
          extract: true,
          strip: 1,
          mode: '666',
          headers: {accept: 'application/zip'},
        });
      }
    })
    .then(async () => {
      if (!detectBasysProject(destDir)) {
        spinner.stop();
        throw new Error('Project provided with starter template is missing basys.json or package.json file');
      }

      if (install) {
        spinner.text = 'Installing packages';
        process.chdir(destDir);
        await require('util').promisify(require('child_process').exec)('npm install');
      }

      spinner.stop();
      // BUG: add a message about 'cd' (what about windows?), only if needed
      // BUG: add colors? change message if this is a local basys-cli instance?
      spinner.succeed('Successfully generated the project. To start the dev server run `basys dev`.');
    });
}

module.exports = {detectBasysProject, initProject};
