// list.js -> handle list calls
//
// (c)2016 metasync r&d / internet of coins project - Joachim de Koning
//

const functions = require('../functions');

function process (request, xpath) {
  const hasMultipleArguments = xpath.length > 1;
  const fstArgument = xpath[1];
  let result = {
    'error': 0,
    'data': ['asset']
  };

  // DEBUG: console.log(" [i] returning asset on request "+JSON.stringify(xpath));
  if (hasMultipleArguments) {
    switch (fstArgument) {
      case 'asset':
        result = getAssetData(xpath);
        break;
      default:
        result = {
          'error': 1,
          'data': 'Invalid list type'
        };
    }
  }

  return result;
}

function getAssetData (xpath) {
  const sndArgument = xpath[2];
  let result;

  switch (sndArgument) {
    case 'names':
      result = mkAssetList('name');
      break;
    case 'modes':
      result = mkAssetList('mode');
      break;
    case 'details':
      result = assetDetails();
      break;
    case undefined:
      result = {
        'error': 0,
        'data': ['names', 'modes']
      };
      break;
    default:
      result = {
        'error': 1,
        'data': 'Invalid list property'
      };
  }
  return result;
}

// asset specific functions start here
function mkAssetList (type) {
  const assets = Object.keys(global.hybrixd.asset);
  const assetsWithNames = assets.reduce(mkAssetsObject(type), {});

  return {
    'error': 0,
    'data': functions.sortObjectByKey(assetsWithNames)
  };
}

function mkAssetsObject (t) {
  return function (acc, key) {
    const type = typeof global.hybrixd.asset[key][t] !== 'undefined'
      ? t
      : 'module';
    acc[key] = global.hybrixd.asset[key][type];
    return acc;
  };
}

function assetDetails () {
  const asset = Object.keys(global.hybrixd.asset).map(mkBasicAssetDetails);

  return {
    'error': 0,
    'data': asset
  };
}

function mkBasicAssetDetails (key) {
  const recipe = global.hybrixd.asset[key];
  return {symbol: recipe.symbol, name: recipe.name, mode: recipe.mode};
}

exports.process = process;
