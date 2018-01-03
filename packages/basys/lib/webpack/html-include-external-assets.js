// Used to insert external JS and CSS URLs into HTML before project assets
class HtmlWebpackIncludeExternalAssetsPlugin {
  constructor(options) {
    this.options = options; // {jsAssets, cssAssets}
  }

  apply(compiler) {
    compiler.plugin('compilation', compilation => {
      compilation.plugin('html-webpack-plugin-before-html-generation', (htmlPluginData, callback) => {
        const {assets} = htmlPluginData;
        assets.js = this.options.jsAssets.concat(assets.js);
        assets.css = this.options.cssAssets.concat(assets.css);
        callback(null, htmlPluginData);
      });

      // BUG: not currently used
      // compilation.plugin('html-webpack-plugin-alter-asset-tags', (htmlPluginData, callback) => {
      //   for (const tag of htmlPluginData.head.concat(htmlPluginData.body)) {
      //     const href = tag.attributes.href || tag.attributes.src;
      //     for (const asset of this.options.assets) {
      //       if (typeof asset !== 'string' && asset.attributes && href === asset.path) {
      //         Object.assign(tag.attributes, asset.attributes);
      //         break;
      //       }
      //     }
      //   }
      //   callback(null, htmlPluginData);
      // });
    });
  }
}

module.exports = HtmlWebpackIncludeExternalAssetsPlugin;
