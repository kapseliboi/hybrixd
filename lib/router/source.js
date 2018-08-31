// source.js -> handle source calls
//
// (c)2018 internet of coins project - Joachim de Koning
//

var cache = require('../cache');
var scheduler = require('../scheduler');
var modules = require('../modules');
var DJB2 = require('../../common/crypto/hashDJB2'); // fast DJB2 hashing

function listSources () {
  var data = Object.keys(global.hybridd.routetree.source);
  return {
    'error': 0,
    'info': "List of available source id's.",
    'id': 'source',
    'count': data.length,
    'data': functions.sortObjectByKey(data)
  };
}

function listSourceModes (sourceId) {
  if (global.hybridd.routetree.source.hasOwnProperty(sourceId)) {
    var data = Object.keys(global.hybridd.routetree.source[sourceId]);

    return {
      'error': 0,
      'info': "List of available source id's and their modes.",
      'id': `source/${sourceId}`,
      'count': data.length,
      'data': functions.sortObjectByKey(data)
    };
  } else {
    return {
      'error': 1,
      'info': `source ${sourceId} not found.`,
      'data': null
    };
  }
}

function process (request, xpath) {
  // xpath = ["source",sourceId, ... ]
  var result;
  if (xpath.length === 1) {
    result = listSources();
  } else if (xpath.length === 2) {
    result = listSourceModes(xpath[1]);
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

  modules.module[global.hybridd.source[target.source].module].main.exec({
    command: command,
    processID,
    target
  });

  return scheduler.result(processID, xpath);
}

exports.process = process;
