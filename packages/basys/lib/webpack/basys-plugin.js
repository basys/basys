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
        const externalStyleUrls = (config[this.appType].styles || [])
          .filter(entry => entry.startsWith('http://') || entry.startsWith('https://'));
        htmlPluginData.assets.css = externalStyleUrls.concat(htmlPluginData.assets.css);
        callback(null, htmlPluginData);
      });

      // Save index.html on hard disk
      compilation.plugin('html-webpack-plugin-after-emit', (htmlPluginData, callback) => {
        fs.outputFileSync(path.resolve(compilation.compiler.outputPath, htmlPluginData.outputName), compilation.assets[htmlPluginData.outputName].source());
        callback(null);
      });
    });
  }
}

module.exports = BasysWebpackPlugin;
