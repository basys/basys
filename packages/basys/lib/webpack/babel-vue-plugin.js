// Removes 'info' option from Vue components - it's only used by Basys at compilation time
module.exports = () => ({
  visitor: {
    ObjectProperty(path) {
      if (
        path.hub &&
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
