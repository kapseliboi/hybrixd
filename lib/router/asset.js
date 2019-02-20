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
  const recipeDoesNotExist = assetList(assets).data.indexOf(symbol) === -1;

  return recipeDoesNotExist
    ? mkErrorObj(symbol)
    : retrieveExecDataOrError(symbol, request, xpath);
}

function retrieveExecDataOrError (symbol, request, xpath) {
  const recipe = global.hybrixd.asset[symbol];
  const assetModuleExecExists = global.hybrixd.module[recipe.module];
  const disableCaching = xpath[2] === 'unspent' || xpath[2] === 'push';

  return disableCaching
    ? getFreshDataWithoutCaching(recipe, request, xpath)
    : getFreshOrCachedData(assetModuleExecExists, recipe, request, xpath);
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
