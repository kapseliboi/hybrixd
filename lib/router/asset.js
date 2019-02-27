// asset.js -> handle asset calls
//
// (c)2016 internet of coins project
//

const {getFreshOrCachedData, getFreshDataWithoutCaching} = require('./cache');

function process (request, xpath) {
  const dataOrError = xpath.length === 1
    ? assetList(global.hybrixd.asset)
    : retrieveDataOrError(global.hybrixd.asset, request, xpath);

  return dataOrError;
}

function retrieveDataOrError (assets, request, xpath) {
  const symbol = xpath[1];
  const recipeDoesNotExist = !assets.hasOwnProperty(symbol);

  return recipeDoesNotExist
    ? mkErrorObj(symbol)
    : retrieveExecDataOrError(symbol, assets, request, xpath);
}

function retrieveExecDataOrError (symbol, assets, request, xpath) {
  const recipe = assets[symbol];
  const disableCaching = xpath[2] === 'unspent' || xpath[2] === 'push';

  return disableCaching
    ? getFreshDataWithoutCaching(recipe, request, xpath)
    : getFreshOrCachedData(recipe, request, xpath);
}

// asset specific functions start here
function assetList (assets) {
  let asset = Object
    .keys(assets)
    .sort();

  return {
    error: 0,
    data: asset
  };
}

function mkErrorObj (symbol) {
  return {
    'error': 1,
    'data': 'Asset "' + symbol + '" not found!'
  };
}

exports.process = process;
