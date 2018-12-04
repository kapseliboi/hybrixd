// list.js -> handle list calls
//
// (c)2016 metasync r&d / internet of coins project - Joachim de Koning
//

// export every function
exports.process = process;
var functions = require('../functions');

// functions start here

function process (request, xpath) {
  var result = {
    'error': 0,
    'info': 'Listable items.',
    'id': 'list',
    'data': ['asset']
  };

  // DEBUG: console.log(" [i] returning asset on request "+JSON.stringify(xpath));
  if (xpath.length > 1) {
    switch (xpath[1]) {
      case 'asset':
        switch (xpath[2]) {
          case 'names':
            result = assetnames();
            break;
          case 'modes':
            result = assetmodes();
            break;
          case 'details':
            result = assetDetails();
            break;
          default:
            result = {
              'error': 0,
              'info': 'Please specify the property you want to list.',
              'id': 'list/asset',
              'data': ['names', 'modes']
            };
        }
        break;
      default:
        result = {
          'error': 1,
          'info': 'Please specify what you want to list.',
          'id': 'list',
          'data': ['asset']
        };
    }
  }

  return result;
}

// asset specific functions start here
function assetnames () {
  var assetcnt = 0;
  var asset = {};
  var key;
  for (key in global.hybrixd.asset) {
    asset[key] = typeof global.hybrixd.asset[key].name !== 'undefined' ? global.hybrixd.asset[key].name : global.hybrixd.asset[key].module;
    assetcnt++;
  }

  return {
    'error': 0,
    'info': 'List of asset names.',
    'id': 'asset',
    'count': assetcnt,
    'data': functions.sortObjectByKey(asset)
  };
}

function assetmodes () {
  var assetcnt = 0;
  var asset = {};
  var key;
  for (key in global.hybrixd.asset) {
    asset[key] = typeof global.hybrixd.asset[key].mode !== 'undefined' ? global.hybrixd.asset[key].mode : global.hybrixd.asset[key].module;
    assetcnt++;
  }

  return {
    'error': 0,
    'info': 'List of asset modes.',
    'id': 'asset',
    'count': assetcnt,
    'data': functions.sortObjectByKey(asset)
  };
}

function assetDetails () {
  var asset = [];
  for (var key in global.hybrixd.asset) {
    var recipe = global.hybrixd.asset[key];
    // TODO include hashes '/s/deterministic/hashes'
    asset.push({symbol: recipe.symbol, name: recipe.name, mode: recipe.mode});
  }

  return {
    'error': 0,
    'info': 'List of basic asset details.',
    'id': 'asset',
    'count': asset.length,
    'data': asset
  };
}
