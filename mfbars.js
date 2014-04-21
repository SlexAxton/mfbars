var Handlebars = require('handlebars');

var helper_name = 'mfblock';

function walk(node, condition, transform) {
  // Make sure we have a valid node
  if (node && node.type) {
    // Make sure we can handle the type
    if (!node.type in node_types) {
      throw new Error(node.type + ' is not a recognized type.');
    }

    return node_types[node.type](node, condition, transform);
  }
  else {
    console.log(node);
    throw new Error('Node is invalid because it has no type.');
  }
}

var node_types = {

  program: function(node, condition, transform) {
    return node.statements.map(function(node) {
      return walk(node, condition, transform);
    });
  },

  block: function(node, condition, transform) {
    if (condition(node)) {
      node = transform(node);
    }

    // Due to the nature of trees, multiple returns
    // is sometimes necessary
    var res = [
      walk(node.program, condition, transform)
    ];

    if (node.inverse) {
      res.push(walk(node.inverse, condition, transform));
    }

    return res;
  },

  // These bottom two are base-cases
  content: function(node) {
    return node.string;
  },

  // These are no-ops since they can't be nested, and aren't
  // mf blocks
  mustache: function() {}
};

var testTmpl = "This {{#mfblock \"testkey\" dataname}}is{{/mfblock}} a test. {{somehelper .}}";
var testTmplAST = Handlebars.parse(testTmpl);

var condition = function(node) {
  return node.type == 'block' && node.mustache.id.original == 'mfblock';
};
var transform = function(node) {
  console.log('Found:', "'" + node.program.statements[0].string + "'");
  return node;
}

walk(testTmplAST, condition, transform);
