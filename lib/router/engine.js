// engine.js -> handle engine calls
//
// (c) 2018 Internet of Coins project - Joachim de Koning
//

const cache = require('../cache');
const scheduler = require('../scheduler');
const modules = require('../modules');
const DJB2 = require('../../common/crypto/hashDJB2'); // fast DJB2 hashing

function enginelist (module) {
  const engine = Object.keys(global.hybrixd.engine);

  return {
    'error': 0,
    'data': engine.sort()
  };
}

function engineexec (target, xpath, sessionID, data) { // TODO rename target to recipe
  // activate module exec function - disconnects and sends results to processID!
  // run the module connector function - disconnects and sends results to processID!
  if (typeof global.hybrixd.engine[target.id] === 'undefined' || typeof modules.module[global.hybrixd.engine[target.id].module] === 'undefined') {
    console.log(` [!] module ${global.hybrixd.engine[target.id].module}: not loaded, or disfunctional!`);
    var result = {
      'error': 1,
      'info': 'Module not found or disfunctional!'
    };
  } else {
    let command = xpath.slice(2);
    // init new process
    let processID = scheduler.init(0, {sessionID, data, path: xpath, command: command, recipe: target});
    let main = modules.module[global.hybrixd.engine[target.id].module].main;
    if (!main.hasOwnProperty('exec')) {
      main = modules.module['quartz'].main;
    }
    if (target.hasOwnProperty('quartz') && target.quartz.hasOwnProperty(command[0])) {
      main = global.hybrixd.module['quartz'].main;
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
}

function process (request, xpath) {
  let result = null;
  let target = {};
  if (xpath.length === 1) {
    result = enginelist();
  } else {
    let engines = enginelist().data;

    if (engines.indexOf(xpath[1]) > -1) {
      target = global.hybrixd.engine[xpath[1]];
      target.id = target.engine;

      let cacheVal = typeof target.cache !== 'undefined' ? target.cache : 12000;
      let cacheIdx = DJB2.hash(request.sessionID + xpath.join('/'));
      let cacheResult = cache.get(cacheIdx, cacheVal);

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
}

exports.process = process;
