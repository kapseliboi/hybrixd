// asset.js -> handle asset calls
//
// (c)2016 metasync r&d / internet of coins project - Amadeus de Koning / Joachim de Koning
//

let cache = require('../cache');
let scheduler = require('../scheduler');
let modules = require('../modules');
let DJB2 = require('../../common/crypto/hashDJB2'); // fast DJB2 hashing

function process (request, xpath) {
  const foo = global.hybrixd.asset;
  // DEBUG: console.log(" [i] returning asset on request "+JSON.stringify(xpath));
  if (xpath.length === 1) {
    var result = assetList(foo);
  } else {
    let asset = xpath[1];
    if (assetList(foo).data.indexOf(asset) === -1) {
      result = {
        'error': 1,
        'info': 'Asset not found!',
        'id': `asset/${asset}`
      };
    } else {
      let target = global.hybrixd.asset[asset];
      target.symbol = typeof asset !== 'undefined' ? asset : null;
      // possible asset functions
      let paths_assetexec = [
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
      if (paths_assetexec.indexOf(xpath[2]) > -1) {
        // except for unspent cache everything else
        if (xpath[2] === 'unspent' || xpath[2] === 'push') {
          result = assetexec(target, xpath, request.sessionID, request.data);
          result.noCache = true;
        } else {
          let cacheVal = typeof target.cache !== 'undefined' ? target.cache : 12000;
          let cacheIdx = DJB2.hash(request.sessionID + xpath.join('/'));
          let cacheResult = cache.get(cacheIdx, cacheVal);
          if (!cacheResult) { // Nothing cached
            result = assetexec(target, xpath, request.sessionID, request.data);
            if (!result.error && !result.noCache) {
              cache.add(cacheIdx, result);
            }
          } else if (cacheResult.fresh) { // Cached is still fresh/relevant
            result = cacheResult.data;
          } else { // Cached is no longer fresh/relevant but could be used as a fallback
            result = assetexec(target, xpath, request.sessionID, request.data); // We do a fresh call
            if (!result.error) { // if there's no error, use the new value
              cache.add(cacheIdx, result);
            } else { // if there is an error, use the old value
              result = cacheResult.data;
            }
          }
        }
      } else {
        result = {
          'error': 1,
          'info': 'Please use an asset function!',
          'id': `asset/${asset}`,
          'data': paths_assetexec
        };
      }
    }
  }

  return result;
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

function assetexec (target, xpath, sessionID, data) { // TODO rename target to recipe
  // activate module exec function - disconnects and sends results to processID!
  // run the module connector function - disconnects and sends results to processID!
  let result;

  if (typeof modules.module[global.hybrixd.asset[target.symbol].module] !== 'undefined') {
    let command = xpath.slice(2);
    // init new process
    let processID = scheduler.init(0, {sessionID, data, path: xpath, command: command, recipe: target});
    let main = modules.module[global.hybrixd.asset[target.symbol].module].main;
    if (!main.hasOwnProperty('exec')) {
      main = modules.module['quartz'].main;
    }
    if (target.hasOwnProperty('quartz') && target.quartz.hasOwnProperty(command[0])) {
      main = global.hybrixd.module['quartz'].main;
    }

    //  try {
    result = main.exec({
      processID: processID,
      target: target,
      command: command
    });
    //    } catch (e) {
    //    result = {error: 1, data: 'Error: ' + e};// TODO
    // }
    if (typeof result === 'undefined') {
      return scheduler.result(processID, xpath);
    } else {
      return result;
    }
  } else {
    console.log(` [!] module ${global.hybrixd.asset[target.symbol].module}: not loaded, or disfunctional!`);
    result = {error: 1, data: 'Module not found or disfunctional!'};
  }

  return result;
}

exports.process = process;
