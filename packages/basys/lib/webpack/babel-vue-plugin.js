// Removes 'info' option from Vue components - it's only used by Basys at compilation time.
// Keep this Babel plugin in a separate file so that it can be referred to via path
// (custom js loader in vue-loader options must be JSON-serializable).
module.exports = () => ({
  visitor: {
    ObjectProperty(path) {
      if (
        path.hub.file.opts.filename.endsWith('.vue') &&
        path.node.key.type === 'Identifier' &&
        path.node.key.name === 'info' &&
        path.parent.type === 'ObjectExpression' &&
        path.parentPath.parent.type === 'ExportDefaultDeclaration'
      ) {
        path.remove();
      }
    },
  },
});
