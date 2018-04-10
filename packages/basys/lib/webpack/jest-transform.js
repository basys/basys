const babelJest = require('babel-jest');

// Keep it consistent with base-config.js
module.exports = babelJest.createTransformer({
  presets: [['@babel/preset-env', {targets: {node: 'current'}}]],
});
