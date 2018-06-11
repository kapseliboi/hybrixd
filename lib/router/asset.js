// asset.js -> handle asset calls
//
// (c)2016 metasync r&d / internet of coins project - Amadeus de Koning / Joachim de Koning
//

var cache = require("../cache");

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
        "error": 1,
        "info": "Asset not found!",
        "id": `asset/${asset}`
      };
    }else{
      var target = global.hybridd.asset[asset];
      target.symbol = typeof asset !== "undefined" ? asset : null;
      // possible asset functions
      var paths_assetexec = [
        "address",
        "balance",
        "contract",
        "details",
        "factor",
        "fee",
        "history",
        "push",
        "status",
        "test",
        "unspent",
        "validate",
        "transaction"
      ];
      // commands for (example RPC) connected clients
      if (xpath[2] === "command" && request.sessionID===1) {

        result = directcommand(target, xpath, request.sessionID, request.data);

      } else if (paths_assetexec.indexOf(xpath[2]) > -1) {
        // except for unspent cache everything else
        if(xpath[2] === "unspent" || xpath[2] === "push") {
          result = assetexec(target, xpath, request.sessionID, request.data);
        } else {
          var cacheVal = typeof target.cache !== "undefined" ? target.cache : 12000;
          var cacheIdx = DJB2.hash(request.sessionID + xpath.join("/"));
          var cacheResult = cache.get(cacheIdx, cacheVal);
          if (!cacheResult) { // Nothing cached
            result = assetexec(target, xpath, request.sessionID, request.data);
            if (!result.error) {
              cache.add(cacheIdx, result);
            }
          }else if(cacheResult.fresh){ // Cached is still fresh/relevant
            result = cacheResult.data;
          }else{  // Cached is no longer fresh/relevant but could be used as a fallback
            result = assetexec(target, xpath, request.sessionID, request.data); // We do a fresh call
            if (!result.error) {  // if there's no error, use the new value
              cache.add(cacheIdx, result);
            }else{ // if there is an error, use the old value
              result = cacheResult.data;
            }
          }
        }
      } else {

        result = {
          "error": 1,
          "info": "Please use an asset function!",
          "id": `asset/${asset}`,
          "data": paths_assetexec
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
    "error": 0,
    "info": "Available assets.",
    "id": "asset",
    "count": assetcnt,
    "data": asset
  };

}

function assetexec (target, lxpath, sessionID,data) {

  // init new process
  var processID = scheduler.init(0, {sessionID,data});

  // add up all arguments into a flexible standard result
  var cnta = 1;
  var cntb = 3;
  var command = [];
  command[0] = lxpath[2];
  while (typeof lxpath[cntb] !== "undefined") {

    command[cnta] = lxpath[cntb];
    cnta++;
    cntb++;

  }
  // activate module exec function - disconnects and sends results to processID!
  // run the module connector function - disconnects and sends results to processID!
  if (typeof modules.module[global.hybridd.asset[target.symbol].module] !== "undefined") {

    modules.module[global.hybridd.asset[target.symbol].module].main.exec({
      processID:processID,
      target:target,
      command:command
    });
    var result = {
      "error": 0,
      "info": "Command process ID.",
      "id": "id",
      "request": command,
      "data": processID
    };

  } else {

    console.log(` [!] module ${module}: not loaded, or disfunctional!`);
    var result = {
      "error": 1,
      "info": "Module not found or disfunctional!"
    };

  }

  return result;

}

function directcommand (target, lxpath, sessionID,data) {

  if (lxpath[3]) {

    // init new process
    var processID = scheduler.init(0, {sessionID,data});
    // add up all arguments into a flexible command result
    var cnta = 1;
    var cntb = 4;
    var command = [];
    command[0] = lxpath[3];
    while (typeof lxpath[cntb] !== "undefined") {

      command[cnta] = lxpath[cntb];
      cnta++;
      cntb++;

    }
    // run the module connector function - disconnects and sends results to processID!
    if (typeof modules.module[target.module] !== "undefined") {

      if (typeof global.hybridd.asset[target.symbol].mode !== "undefined") {

        var mode = global.hybridd.asset[target.symbol].mode;

      } else {

        mode = null;

      }
      if (typeof global.hybridd.asset[target.symbol].type !== "undefined") {

        var type = global.hybridd.asset[target.symbol].type;

      } else {

        type = null;

      }
      if (typeof global.hybridd.asset[target.symbol].factor !== "undefined") {

        var factor = global.hybridd.asset[target.symbol].factor;

      } else {

        factor = 8;

      }
      modules.module[target.module].main.link({
        processID,
        target,
        mode,
        type,
        factor,
        command
      });
      var result = {
        "error": 0,
        "info": "Command process ID.",
        "id": "id",
        "request": command,
        "data": processID
      };

    } else {

      console.log(` [!] module ${target.module}: not loaded, or dysfunctional!`);
      var result = {
        "error": 1,
        "info": "Module not found or dysfunctional!"
      };

    }

  } else {

    var result = {
      "error": 1,
      "info": `You must give a command! (Example: http://${global.hybridd.restbind}:${global.hybridd.restport}/asset/btc/command/help)`
    };

  }

  return result;

}
