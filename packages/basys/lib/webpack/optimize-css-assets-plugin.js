const autoprefixer = require('autoprefixer');
const csso = require('csso');
const LastCallWebpackPlugin = require('last-call-webpack-plugin');
const path = require('path');
const postcss = require('postcss');

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

  async processCss(assetName, asset, assets) {
    let css = asset.source();
    css = await postcss([autoprefixer({browsers: this.options.browsers})]).process(css).css;

    const result = csso.minify(css, Object.assign({filename: assetName}, this.options));
    css = result.css;

    if (this.options.sourceMap) {
      assets.setAsset(`${assetName}.map`, result.map.toString());
      css += `/*# sourceMappingURL=${path.basename(assetName)}.map */`;
    }

    return css;
  }
}

module.exports = OptimizeCssAssetsPlugin;
