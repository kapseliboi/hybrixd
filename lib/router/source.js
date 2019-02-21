// source.js -> handle source calls
//
// (c)2018 internet of coins project - Joachim de Koning
//

const cache = require('../cache');
const scheduler = require('../scheduler');
const modules = require('../modules');
const DJB2 = require('../../common/crypto/hashDJB2'); // fast DJB2 hashing

function listSources () {
  const sources = Object.keys(global.hybrixd.routetree.source)
    .filter(s => !s.startsWith('_'));

  return {
    'error': 0,
    'data': sources
  };
}

function process (request, xpath) {
  // xpath = ["source",sourceId, ... ]
  let result;
  if (xpath.length === 1) {
    result = listSources();
  } else {
    let sourceId = xpath[1];

    if (global.hybrixd.source.hasOwnProperty(sourceId) && global.hybrixd.source[sourceId].hasOwnProperty('module')) {
      let target = global.hybrixd.source[sourceId];

      let cacheVal = typeof target.cache !== 'undefined' ? target.cache : 12000;
      let cacheIdx = DJB2.hash(request.sessionID + xpath.join('/'));

      let cacheResult = cache.get(cacheIdx, cacheVal);

      if (!cacheResult) { // Nothing cached
        result = sourceexec(target, xpath, request.sessionID, request.data);
        if (!result.error && !result.noCache) {
          cache.add(cacheIdx, result);
        }
      } else if (cacheResult.fresh) { // Cached is still fresh/relevant
        result = cacheResult.data;
      } else { // Cached is no longer fresh/relevant but could be used as a fallback
        result = sourceexec(target, xpath, request.sessionID, request.data);
        if (!result.error) { // if there's no error, use the new value
          cache.add(cacheIdx, result); // Update the cache
        } else { // if there is an error, use the old value
          result = cacheResult.data;
        }
      }
    } else {
      result = {
        'error': 1,
        'id': `source/${xpath[1]}`,
        'info': 'Source not found!'
      };
    }
  }
  return result;
}

function sourceexec (target, xpath, sessionID, data) { // TODO rename target to recipe
  let command = xpath.slice(2);
  // init new process
  let processID = scheduler.init(0, {sessionID, data, path: xpath, command: command, recipe: target});
  let main = modules.module[global.hybrixd.source[target.source].module].main;
  if (!main.hasOwnProperty('exec')) {
    main = modules.module['quartz'].main;
  }
  if (target.hasOwnProperty('quartz') && target.quartz.hasOwnProperty(command[0])) {
    main = global.hybrixd.module['quartz'].main;
  }

  let result;
  try {
    result = main.exec({
      command: command,
      processID,
      target
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

exports.process = process;
