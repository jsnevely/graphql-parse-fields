'use strict'

var assert = require('assert')

var castArr = require('cast-array')

module.exports = parseFields

/**
 * parse fields has two signatures:
 * 1)
 * @param {Object} info - graphql resolve info
 * @param {Boolean} [keepRoot] default: true
 * @param {Boolean} [parseArgs] default: false
 * @return {Object} fieldTree
 * 2)
 * @param {Array} asts - ast array
 * @param {Object} [fragments] - optional fragment map
 * @param {Object} [fieldTree] - optional initial field tree
 * @param {Object} [parseArgs] default:false
 * @return {Object} fieldTree
 */
function parseFields (/* dynamic */) {
  var tree
  var info = arguments[0]
  var keepRoot = arguments[1]
  var parseArgs = arguments[2]
  var fieldNodes = info && (info.fieldASTs || info.fieldNodes)
  if (fieldNodes) {
    // (info, keepRoot)
    tree = fieldTreeFromAST(fieldNodes, info.fragments, {}, parseArgs)
    if (!keepRoot) {
      var key = firstKey(tree)
      tree = tree[key]
    }
  } else {
    // (asts, fragments, fieldTree)
    tree = fieldTreeFromAST.apply(this, arguments)
  }
  return tree
}

function fieldTreeFromAST (asts, fragments, init, parseArgs) {
  init = init || {}
  fragments = fragments || {}
  asts = castArr(asts)
  return asts.reduce(function (tree, val) {
    var kind = val.kind
    var name = val.name && val.name.value
    var fragment
    if (kind === 'Field') {
      if (val.selectionSet) {
        tree[name] = tree[name] || {}
        fieldTreeFromAST(val.selectionSet.selections, fragments, tree[name], parseArgs)
      } else {
        tree[name] = true
      }
      if(parseArgs && val.arguments && val.arguments.length > 0) {
        tree[name].args = val.arguments.reduce(function(args, a){
          if(a.value.value !== undefined) {
            args[a.name.value] = a.value.value
            return args;
          }
        }, {})
      }
    } else if (kind === 'FragmentSpread') {
      fragment = fragments[name]
      assert(fragment, 'unknown fragment "' + name + '"')
      fieldTreeFromAST(fragment.selectionSet.selections, fragments, tree, parseArgs)
    } else if (kind === 'InlineFragment') {
      fragment = val
      fieldTreeFromAST(fragment.selectionSet.selections, fragments, tree, parseArgs)
    } // else ignore
    return tree
  }, init)
}

function firstKey (obj) {
  for (var key in obj) {
    return key
  }
}
