// asset.js -> handle asset calls
//
// (c)2016 metasync r&d / internet of coins project - Amadeus de Koning / Joachim de Koning
//

let cache = require('../cache');
let scheduler = require('../scheduler');
let modules = require('../modules');
let DJB2 = require('../../common/crypto/hashDJB2'); // fast DJB2 hashing

const DEFAULT_CACHE_VALUE = 12000;

modules = global.hybrixd; // HACK: Make modules work again.

function process (request, xpath) {
  const globalAssets = modules.asset;
  const asset = xpath[1];
  const target = modules.asset[asset];
  const xpathHasCorrectLength = xpath.length === 1;

  // DEBUG: console.log(" [i] returning asset on request "+JSON.stringify(xpath));

  const dataOrError = xpathHasCorrectLength
    ? assetList(globalAssets)
    : retrieveDataOrError(globalAssets, request, xpath);

  // Handle error logging on top.
  if (dataOrError.error) console.log(` [!] module ${modules.asset[target.symbol].module}: not loaded, or disfunctional!`);

  return dataOrError;
}

function retrieveDataOrError (as, req, xpath) {
  const asset = xpath[1];
  const areAssetsEmpty = assetList(as).data.indexOf(asset) === -1;

  return areAssetsEmpty
    ? mkErrorObj(asset)
    : retrieveExecDataOrError(asset, req, xpath);
}

function retrieveExecDataOrError (a, req, xpath) {
  const pathsAssetExec = [
    'balance',
    'contract',
    'details',
    'factor',
    'fee',
    'fee-factor',
    'fee-symbol',
    'history',
    'keygen-base',
    'mode',
    'peers',
    'push',
    'sample',
    'test',
    'unspent',
    'validate',
    'transaction',
    'unified-symbols'
  ];
  const target = modules.asset[a];
  const symbol = !isNil(a) ? a : null;
  const targetWithSymbol = Object.assign(target, {symbol});
  const isUnspentOrPush = xpath[2] === 'unspent' || xpath[2] === 'push';
  const xpathExists = pathsAssetExec.indexOf(xpath[2]) > -1; // TODO: Give var a proper name!

  return xpathExists
    ? getDataOrCached(isUnspentOrPush, targetWithSymbol, req, xpath)
    : mkErrorObjWithData(a, pathsAssetExec);
}

function getDataOrCached (disableCaching, target, req, xpath) {
  return disableCaching
    ? getFreshDataWithoutCaching(target, req, xpath)
    : getFreshOrCachedData(target, req, xpath);
}

function getFreshOrCachedData (target, req, xpath) {
  const cacheVal = typeof target.cache !== 'undefined' ? target.cache : DEFAULT_CACHE_VALUE;
  const cacheIdx = DJB2.hash(req.sessionID + xpath.join('/'));
  const cacheResult = cache.get(cacheIdx, cacheVal);
  const result = getFreshOrCachedData_(cacheResult, cacheIdx, target, req, xpath);

  // if there's no error, use the new value
  if (!result.error && !result.noCache) cache.add(cacheIdx, result);

  return result;
}

// TODO: Rename!!!
// function getFreshOrCachedData_ (cacheResult, cacheIdx, target, req, xpath) {
//   if (!cacheResult) { // Nothing cached
//     return getExecDataAndMaybeCache(cacheIdx, cacheResult, target, req, xpath);
//   } else if (cacheResult.fresh) { // Cached is still fresh/relevant
//     return cacheResult.data;
//   } else { // Cached is no longer fresh/relevant but could be used as a fallback
//     return getExecDataorCached(cacheIdx, cacheResult, target, req, xpath);
//   }
// }

function getFreshOrCachedData_ (cacheResult, cacheIdx, target, req, xpath) {
  return !isNil(cacheResult) && cacheResult.fresh
    ? cacheResult.data
    : getExecDataorCached(cacheIdx, cacheResult, target, req, xpath);
}

// // TODO: Why wouldn't we want to use cached as fallback here anyway? We filter out the use of caching before already.
// function getExecDataAndMaybeCache (cacheIdx, cacheResult, target, req, xpath) {
//   let result = assetExecOrError(target, xpath, req.sessionID, req.data); // TODO: What happens if this blows up?
//   return result;
// }

// TODO: See TODO above :)
function getExecDataorCached (cacheIdx, cacheResult, target, req, xpath) {
  let result = assetExecOrError(target, xpath, req.sessionID, req.data); // We do a fresh call
  // return !result.error
  return !result.error && !cacheResult
    ? result
    : cacheResult.data;
}

// asset specific functions start here
function assetList (assets) {
  let asset = Object
    .keys(assets)
    .sort();

  return {
    'error': 0,
    'info': 'Available assets.',
    'id': 'asset',
    'count': asset.length,
    'data': asset
  };
}

// TODO rename target to recipe
// activate module exec function - disconnects and sends results to processID!
// run the module connector function - disconnects and sends results to processID!
function assetExecOrError (target, xpath, sessionID, data) {
  const assetModuleExec = modules.module[modules.asset[target.symbol].module];

  return isNil(assetModuleExec)
    ? {error: 1, data: 'Module not found or disfunctional!'}
    : activateModuleExec(data, target, xpath, sessionID);
}

function activateModuleExec (data, target, xpath, sessionID) {
  const command = xpath.slice(2);
  // init new process
  const processID = scheduler.init(0, {sessionID, data, path: xpath, command: command, recipe: target}); // Is this a pure function?
  const main = modules.module[modules.asset[target.symbol].module].main;
  const doesNotHaveExec = !main.hasOwnProperty('exec');
  const targetsQuartz = target.hasOwnProperty('quartz') && target.quartz.hasOwnProperty(command[0]);
  const mainProcess = doesNotHaveExec || targetsQuartz ? modules.module['quartz'].main : main;
  const result = mainProcessDataOrError(mainProcess, processID, target, command);

  return typeof result === 'undefined'
    ? scheduler.result(processID, xpath)
    : result;
}

function mainProcessDataOrError (main, processID, target, command) {
  try {
    return main.exec({
      processID: processID,
      target: target,
      command: command
    });
  } catch (e) {
    console.log(' [!] ' + e);
    return {error: 1, data: 'Error: '};
  }
}

function mkErrorObjWithData (a, data) {
  const result = mkErrorObj(a);
  return Object.assign(result, {data});
}

function getFreshDataWithoutCaching (target, req, xpath) {
  const result = assetExecOrError(target, xpath, req.sessionID, req.data);
  return Object.assign(result({noCache: true}));
}

function mkErrorObj (a) {
  return {
    'error': 1,
    'info': 'Asset not found!',
    'id': `asset/${a}`
  };
}

// TODO: Make common function
function isNil (x) {
  return typeof x === 'undefined' ||
    x === undefined ||
    x === null;
}

exports.process = process;
