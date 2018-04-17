const csso = require('csso');
const LastCallWebpackPlugin = require('last-call-webpack-plugin');
const path = require('path');

class OptimizeCssAssetsPlugin {
  constructor(options) {
    this.options = options;
  }

  apply(compiler) {
    const lastCallInstance = new LastCallWebpackPlugin({
      assetProcessors: [
        {
          phase: LastCallWebpackPlugin.PHASES.OPTIMIZE_CHUNK_ASSETS,
          regExp: /\.css$/g,
          processor: (assetName, asset, assets) => this.processCss(assetName, asset, assets),
        },
      ],
      canPrint: true,
    });
    return lastCallInstance.apply(compiler);
  }

  processCss(assetName, asset, assets) {
    const result = csso.minify(asset.source(), Object.assign({filename: assetName}, this.options));
    let css = result.css;
    if (this.options.sourceMap) {
      assets.setAsset(`${assetName}.map`, result.map.toString());
      css += `/*# sourceMappingURL=${path.basename(assetName)}.map */`;
    }
    return Promise.resolve(css);
  }
}

module.exports = OptimizeCssAssetsPlugin;
