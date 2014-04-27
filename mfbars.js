var fs = require('fs');

var Handlebars = require('handlebars');
var MessageFormat = require('messageformat');
var mf = new MessageFormat();

var HELPER_NAME = 'mfblock';
var HELPER_PREFIX = '_mf_';

var helper_template = Handlebars.compile(fs.readFileSync('./src/mf_helper.hbs', 'utf8'));
var output_template = Handlebars.compile(fs.readFileSync('./src/output.hbs', 'utf8'));

function walk(node, condition, transform, out) {
  // Make sure we have a valid node
  if (node && node.type) {
    // Make sure we can handle the type
    if (!node.type in node_types) {
      throw new Error(node.type + ' is not a recognized type.');
    }

    return node_types[node.type](node, condition, transform, out);
  }
  else {
    throw new Error('Node is invalid because it has no type.');
  }
}

var node_types = {

  program: function(node, condition, transform, out) {
    return node.statements.map(function(node) {
      return walk(node, condition, transform, out);
    });
  },

  block: function(node, condition, transform, out) {
    if (condition(node)) {
      return walk(transform(node, out), condition, transform, out);
    }

    // Due to the nature of trees, multiple returns
    // is sometimes necessary
    var res = [
      walk(node.program, condition, transform, out)
    ];

    if (node.inverse) {
      res.push(walk(node.inverse, condition, transform, out));
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

function condition(node) {
  return node.type == 'block' && node.mustache.id.original == HELPER_NAME;
}

// Since we don't always have a parent to actively switch out a node in the AST,
// instead we stripe it of all it's properties and merge on the new nodes properties.
function clean(node) {
  for(var i in node) {
    if (node.hasOwnProperty(i)) {
      delete node[i];
    }
  }
  return node;
}

function generateMustache(key, attrs) {
  return Handlebars
    .parse('{{' + HELPER_PREFIX + key + ' ' + attrs.join(' ') + '}}')
    .statements[0];
}

function extend(obj1, obj2) {
  for(var i in obj2) {
    if (obj2.hasOwnProperty(i)) {
      obj1[i] = obj2[i];
    }
  }
}

function transform(node, out) {
  // Grab the key out of the block
  var key = node.mustache.params[0].original;
  // Generate the replacement node
  var newNode = generateMustache(key, [node.mustache.params[1].original]);

  var mfAST = mf.parse(node.program.statements[0].string);

  // Render the helper output
  var preFunc = helper_template({
    HELPER_PREFIX: HELPER_PREFIX,
    key: key,
    mf_func: mf.precompile(mfAST)
  });

  out.push(preFunc);

  // Delete all things off of the old node
  node = clean(node);
  // Switch out the inherited item
  node.__proto__ = newNode.__proto__;
  // put all the props from the new node onto
  // the old one
  extend(node, newNode);

  return node;
}

var testTmpl = "This {{#mfblock \"testkey\" .}}You have {num_friends, plural, one{one friend} other{# friends} }.{{/mfblock}} a test.";
var testTmplAST = Handlebars.parse(testTmpl);

var out = [];
walk(testTmplAST, condition, transform, out);

var output = output_template({
  mf_funcs: out,
  template: Handlebars.precompile(testTmplAST)
});

var func = new Function('Handlebars', 'return ' + output)(Handlebars);
console.log(func({num_friends: 5}));
