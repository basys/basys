const fs = require('fs-extra');
const path = require('path');

class FrontendWebpackPlugin {
  constructor(config) {
    this.config = config;
  }

  apply(compiler) {
    compiler.hooks.compilation.tap('FrontendWebpackPlugin', compilation => {
      compilation.hooks.htmlWebpackPluginAlterAssetTags.tapPromise(
        'FrontendWebpackPlugin',
        async htmlPluginData => {
          // Add favicon
          if (this.config.type === 'web' && this.config.favicon) {
            const fullFaviconPath = path.resolve(this.config.projectDir, this.config.favicon);

            if (!fs.existsSync(fullFaviconPath)) {
              compilation.errors.push(new Error(`Favicon file is missing: ${fullFaviconPath}`));
              return htmlPluginData;
            }

            // BUG: use this.config.assetsPublicPath here?
            const faviconPath = `static/${path.basename(fullFaviconPath)}`;
            compilation.fileDependencies.add(fullFaviconPath);
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
                href: `/${faviconPath}${this.config.env === 'dev' ? `?${compilation.hash}` : ''}`,
              },
            });
          }

          return htmlPluginData;
        },
      );

      // Save index.html on hard disk
      compilation.hooks.htmlWebpackPluginAfterEmit.tapPromise(
        'FrontendWebpackPlugin',
        async htmlPluginData => {
          fs.outputFileSync(
            path.resolve(compilation.compiler.outputPath, htmlPluginData.outputName),
            compilation.assets[htmlPluginData.outputName].source(),
          );
        },
      );
    });
  }
}

module.exports = FrontendWebpackPlugin;
