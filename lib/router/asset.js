// asset.js -> handle asset calls
//
// (c)2016 metasync r&d / internet of coins project - Amadeus de Koning / Joachim de Koning
//

var cache = require('../cache');
var scheduler = require('../scheduler');
var modules = require('../modules');
var DJB2 = require('../../common/crypto/hashDJB2'); // fast DJB2 hashing

// export every function
exports.process = process;

// functions start here

function process (request, xpath) {
  // DEBUG: console.log(" [i] returning asset on request "+JSON.stringify(xpath));
  if (xpath.length == 1) {
    var result = assetlist();
  } else {
    var asset = xpath[1];
    if (assetlist().data.indexOf(asset) === -1) {
      result = {
        'error': 1,
        'info': 'Asset not found!',
        'id': `asset/${asset}`
      };
    } else {
      var target = global.hybridd.asset[asset];
      target.symbol = typeof asset !== 'undefined' ? asset : null;
      // possible asset functions
      var paths_assetexec = [
        'address',
        'balance',
        'contract',
        'details',
        'factor',
        'fee',
        'history',
        'push',
        'sample',
        'status',
        'test',
        'unspent',
        'validate',
        'transaction'
      ];
      if (paths_assetexec.indexOf(xpath[2]) > -1) {
        // except for unspent cache everything else
        if (xpath[2] === 'unspent' || xpath[2] === 'push') {
          result = assetexec(target, xpath, request.sessionID, request.data);
        } else {
          var cacheVal = typeof target.cache !== 'undefined' ? target.cache : 12000;
          var cacheIdx = DJB2.hash(request.sessionID + xpath.join('/'));
          var cacheResult = cache.get(cacheIdx, cacheVal);
          if (!cacheResult) { // Nothing cached
            result = assetexec(target, xpath, request.sessionID, request.data);
            if (!result.error) {
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
function assetlist () {
  var assetcnt = 0;
  var asset = [];
  var key;
  for (key in global.hybridd.asset) {
    asset.push(key);
    assetcnt++;
  }

  asset.sort();

  return {
    'error': 0,
    'info': 'Available assets.',
    'id': 'asset',
    'count': assetcnt,
    'data': asset
  };
}

function assetexec (target, xpath, sessionID, data) { // TODO rename target to recipe
  // activate module exec function - disconnects and sends results to processID!
  // run the module connector function - disconnects and sends results to processID!
  if (typeof modules.module[global.hybridd.asset[target.symbol].module] !== 'undefined') {
    var command = xpath.slice(2);
    // init new process
    var processID = scheduler.init(0, {sessionID, data, path: xpath, command: command, recipe: target});
    var result = modules.module[global.hybridd.asset[target.symbol].module].main.exec({
      processID: processID,
      target: target,
      command: command
    });
    if (typeof result === 'undefined') {
      return scheduler.result(processID, xpath);
    } else {
      return result;
    }
  } else {
    console.log(` [!] module ${global.hybridd.asset[target.symbol].module}: not loaded, or disfunctional!`);
    var result = {
      'error': 1,
      'info': 'Module not found or disfunctional!'
    };
  }

  return result;
}
