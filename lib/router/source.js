// source.js -> handle source calls
//
// (c)2018 internet of coins project - Joachim de Koning
//

var cache = require('../cache');
var scheduler = require('../scheduler');
var functions = require('../functions');
var modules = require('../modules');
var DJB2 = require('../../common/crypto/hashDJB2'); // fast DJB2 hashing

function listSources () {
  var sources = [];
  for (var source in global.hybridd.routetree.source) {
    if (!source.startsWith('_')) {
      sources.push(source);
    }
  }
  return {
    'error': 0,
    'info': "List of available source id's.",
    'id': 'source',
    'count': sources.length,
    'data': sources
  };
}

function process (request, xpath) {
  // xpath = ["source",sourceId, ... ]
  var result;
  if (xpath.length === 1) {
    result = listSources();
  } else {
    var sourceId = xpath[1];

    if (global.hybridd.source.hasOwnProperty(sourceId) && global.hybridd.source[sourceId].hasOwnProperty('module')) {
      var target = global.hybridd.source[sourceId];

      var cacheVal = typeof target.cache !== 'undefined' ? target.cache : 12000;
      var cacheIdx = DJB2.hash(request.sessionID + xpath.join('/'));

      var cacheResult = cache.get(cacheIdx, cacheVal);

      if (!cacheResult) { // Nothing cached
        result = sourceexec(target, xpath, request.sessionID, request.data);
        if (!result.error) {
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
  var command = xpath.slice(2);
  // init new process
  var processID = scheduler.init(0, {sessionID, data, path: xpath, command: command, recipe: target});

  var result = modules.module[global.hybridd.source[target.source].module].main.exec({
    command: command,
    processID,
    target
  });
  if (typeof result === 'undefined') {
    return scheduler.result(processID, xpath);
  } else {
    return result;
  }
}

exports.process = process;
