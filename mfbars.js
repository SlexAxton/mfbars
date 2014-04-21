var Handlebars = require('handlebars');

function walk(node, transform) {
  // Make sure we have a valid node
  if (node && node.type) {
    // Make sure we can handle the type
    if (!node.type in node_types) {
      throw new Error(node.type + ' is not a recognized type.');
    }

    return node_types[node.type](node);
  }
  else {
    throw new Error('Node is invalid because it has no type.');
  }
}

var node_types = {

  program: function(node) {
    return this.statements(node.statements);
  },

  content: function(node) {
    return node.string;
  },

  block: function(node) {
    // Due to the nature of trees, multiple returns
    // is necessary
    return [
      walk(node.program),
      walk(node.inverse)
    ];
  },

  statements: function(nodes) {
    return nodes.map(function(node) {
      return walk(node);
    });
  }
};

var testTmpl = "This {{#if test}}is{{else}}is not{{/if}} a test.";
var testTmplAST = Handlebars.parse(testTmpl);

console.log(walk(testTmplAST));
