const chalk = require('chalk');
const fs = require('fs-extra');
const path = require('path');

class BackendWebpackPlugin {
  apply(compiler) {
    compiler.plugin('done', stats => {
      if (stats.compilation.errors.length) return;

      for (const assetPath in stats.compilation.assets) {
        try {
          fs.outputFileSync(
            path.join(compiler.options.output.path, assetPath),
            stats.compilation.assets[assetPath].source(),
          );
        } catch (e) {
          stats.compilation.errors.push(e);
        }
      }
    });
  }
}

module.exports = BackendWebpackPlugin;
