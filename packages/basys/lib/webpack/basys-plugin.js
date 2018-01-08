const chalk = require('chalk');
const fs = require('fs-extra');
const path = require('path');
const {config} = require('../config');

class BasysWebpackPlugin {
  constructor(options) {
    this.appType = options.appType;
  }

  apply(compiler) {
    compiler.plugin('compilation', compilation => {
      // Insert external CSS URLs into HTML before project chunks
      compilation.plugin('html-webpack-plugin-before-html-generation', (htmlPluginData, callback) => {
        const externalStyleUrls = (config[this.appType].styles || []).filter(
          entry => entry.startsWith('http://') || entry.startsWith('https://'),
        );
        htmlPluginData.assets.css = externalStyleUrls.concat(htmlPluginData.assets.css);
        callback(null, htmlPluginData);
      });

      compilation.plugin('html-webpack-plugin-alter-asset-tags', (htmlPluginData, callback) => {
        // Add favicon
        if (this.appType === 'web' && config.web.favicon) {
          const fullFaviconPath = path.resolve(config._projectDir, config.web.favicon);

          if (!fs.existsSync(fullFaviconPath)) {
            // BUG: improve how this error is printed
            console.log(chalk.red(`Favicon file is missing: ${fullFaviconPath}`));
            return callback(null, htmlPluginData);
          }

          // BUG: use config.assetsPublicPath here?
          const faviconPath = 'static/' + path.basename(fullFaviconPath);
          compilation.fileDependencies.push(fullFaviconPath);
          // BUG: prevent overlap with other files
          compilation.assets[faviconPath] = {
            source: () => fs.readFileSync(fullFaviconPath),
            size: () => fs.statSync(fullFaviconPath).size,
          };

          htmlPluginData.head.push({
            tagName: 'link',
            selfClosingTag: false,
            attributes: {
              rel: 'shortcut icon',
              href: `/${faviconPath}` + (config.env === 'dev' ? `?${compilation.hash}` : ''),
            },
          });
        }

        callback(null, htmlPluginData);
      });

      // Save index.html on hard disk
      compilation.plugin('html-webpack-plugin-after-emit', (htmlPluginData, callback) => {
        fs.outputFileSync(
          path.resolve(compilation.compiler.outputPath, htmlPluginData.outputName),
          compilation.assets[htmlPluginData.outputName].source(),
        );
        callback(null);
      });
    });
  }
}

module.exports = BasysWebpackPlugin;
