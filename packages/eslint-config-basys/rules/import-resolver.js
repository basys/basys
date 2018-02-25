const fs = require('fs');
const resolve = require('enhanced-resolve');
const coreLibs = require('node-libs-browser');
const path = require('path');

exports.interfaceVersion = 2;

function detectBasysProject(dir) {
  while (true) {
    if (dir === path.dirname(dir)) break;
    if (fs.existsSync(path.join(dir, 'basys.json'))) return dir;
    dir = path.dirname(dir);
  }
}

exports.resolve = function(source, file) {
  // Strip loaders
  const finalBang = source.lastIndexOf('!');
  if (finalBang >= 0) {
    source = source.slice(finalBang + 1);
  }

  // Strip resource query
  const finalQuestionMark = source.lastIndexOf('?');
  if (finalQuestionMark >= 0) {
    source = source.slice(0, finalQuestionMark);
  }

  if (source in coreLibs) {
    return {found: true, path: coreLibs[source]};
  }

  const projectDir = detectBasysProject(file);
  const resolveSync = resolve.create.sync({
    extensions: ['.js', '.json'],
    alias: projectDir
      ? {
          '@': path.join(projectDir, 'assets'),
          '~': path.join(projectDir, 'src'),
        }
      : {},
  });
  try {
    return {found: true, path: resolveSync(path.dirname(file), source)};
  } catch (err) {
    return {found: false};
  }
};
