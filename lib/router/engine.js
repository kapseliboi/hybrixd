// engine.js -> handle engine calls
//
// (c) 2018 Internet of Coins project - Joachim de Koning
//

var cache = require('../cache');
var scheduler = require('../scheduler');
var modules = require('../modules');
var DJB2 = require('../../common/crypto/hashDJB2'); // fast DJB2 hashing

var enginelist = function enginelist (module) {
  var enginecnt = 0;
  var engine = [];
  for (var key in global.hybrixd.engine) {
    if (typeof global.hybrixd.engine[key].engine !== 'undefined') {
      engine.push(global.hybrixd.engine[key].engine);
      enginecnt += 1;
    }
  }

  return {
    'error': 0,
    'info': "List of available engine's.",
    'id': 'engine' + (typeof module !== 'undefined' ? '/' + module : ''),
    'count': enginecnt,
    'data': engine.sort()
  };
};

var engineexec = function engineexec (target, xpath, sessionID, data) { // TODO rename target to recipe
  // activate module exec function - disconnects and sends results to processID!
  // run the module connector function - disconnects and sends results to processID!
  if (typeof global.hybrixd.engine[target.id] === 'undefined' || typeof modules.module[global.hybrixd.engine[target.id].module] === 'undefined') {
    console.log(` [!] module ${global.hybrixd.engine[target.id].module}: not loaded, or disfunctional!`);
    var result = {
      'error': 1,
      'info': 'Module not found or disfunctional!'
    };
  } else {
    var command = xpath.slice(2);
    // init new process
    var processID = scheduler.init(0, {sessionID, data, path: xpath, command: command, recipe: target});
    var main = modules.module[global.hybrixd.engine[target.id].module].main;
    if (!main.hasOwnProperty('exec')) {
      main = modules.module['quartz'].main;
    }

    try {
      result = main.exec({
        processID: processID,
        target: target,
        command: command
      });
    } catch (e) {
      result = {error: 1, data: 'Error'};// TODO
    }

    if (typeof result === 'undefined') {
      return scheduler.result(processID, xpath);
    } else {
      return result;
    }
  }

  return result;
};

var process = function process (request, xpath) {
  var result = null;
  var target = {};
  if (xpath.length === 1) {
    result = enginelist();
  } else {
    var engines = enginelist().data;

    if (engines.indexOf(xpath[1]) > -1) {
      target = global.hybrixd.engine[xpath[1]];
      target.id = target.engine;

      var cacheVal = typeof target.cache !== 'undefined' ? target.cache : 12000;
      var cacheIdx = DJB2.hash(request.sessionID + xpath.join('/'));
      var cacheResult = cache.get(cacheIdx, cacheVal);

      if (!cacheResult) { // Nothing cached
        result = engineexec(target, xpath, request.sessionID, request.data);
        if (!result.error && !result.noCache) {
          cache.add(cacheIdx, result);
        }
      } else if (cacheResult.fresh) { // Cached is still fresh/relevant
        result = cacheResult.data;
      } else { // Cached is no longer fresh/relevant but could be used as a fallback
        result = engineexec(target, xpath, request.sessionID, request.data);
        if (!result.error) { // if there's no error, use the new value
          cache.add(cacheIdx, result); // Update the cache
        } else { // if there is an error, use the old value
          result = cacheResult.data;
        }
      }
    } else {
      result = {
        'error': 1,
        'id': `engine/${xpath[1]}`,
        'info': 'Engine not found!'
      };
    }
  }

  return result;
};

exports.process = process;
