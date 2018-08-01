// engine.js -> handle engine calls
//
// (c) 2018 Internet of Coins project - Joachim de Koning
//

/* global DEBUG DJB2 functions modules proc scheduler:true */

var cache = require('../cache');

var enginelist = function enginelist (module) {
  var enginecnt = 0;
  var engine = [];
  for (var key in global.hybridd.engine) {
    if (typeof global.hybridd.engine[key].engine !== 'undefined') {
      engine.push(global.hybridd.engine[key].engine);
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

var directcommand = function directcommand (target, lxpath, sessionID, data) {
  if (lxpath[3]) {
    // init new process
    var processID = scheduler.init(0, {sessionID, data, request: lxpath});
    // add up all arguments into a flexible command result
    var cnta = 1;
    var cntb = 4;
    var command = [];
    command[0] = lxpath[3];
    while (typeof lxpath[cntb] !== 'undefined') {
      command[cnta] = lxpath[cntb];
      cnta += 1;
      cntb += 1;
    }
    // run the module connector function - disconnects and sends results to processID!
    if (typeof modules.module[target.module] === 'undefined') {
      console.log(` [!] module ${target.module}: not loaded, or disfunctional!`);
      var result = {
        'error': 1,
        'info': 'Module not found or dysfunctional!'
      };
    } else {
      modules.module[target.module].main.link({
        command,
        processID,
        target
      });
      result = {
        'data': processID,
        'error': 0,
        'id': 'id',
        'info': 'Command process ID.',
        'request': command
      };
    }
  } else {
    result = {
      'error': 1,
      'info': `You must give a command! (Example: http://${global.hybridd.restbind}:${global.hybridd.restport}/engine/blockexplorer/command/help)`
    };
  }

  return result;
};

var engineexec = function engineexec (target, lxpath, sessionID, data) {
  // init new process
  var processID = scheduler.init(0, {sessionID, data, request: lxpath});

  // add up all arguments into a flexible standard result
  var cnta = 1;
  var cntb = 3;
  var command = [];
  command[0] = lxpath[2];
  while (typeof lxpath[cntb] !== 'undefined') {
    command[cnta] = lxpath[cntb];
    cnta += 1;
    cntb += 1;
  }
  // activate module exec function - disconnects and sends results to processID!
  // run the module connector function - disconnects and sends results to processID!
  if (typeof global.hybridd.engine[target.id] === 'undefined' || typeof modules.module[global.hybridd.engine[target.id].module] === 'undefined') {
    console.log(` [!] module ${module}: not loaded, or disfunctional!`);
    var result = {
      'error': 1,
      'info': 'Module not found or disfunctional!'
    };
  } else {
    modules.module[global.hybridd.engine[target.id].module].main.exec({
      command,
      processID,
      target
    });
    result = {
      'data': processID,
      'error': 0,
      'id': 'id',
      'info': 'Command process ID.',
      'request': command
    };
  }

  return result;
};

var process = function process (request, xpath) {
  var result = null;
  var target = {};
  if (xpath.length === 1) {
    result = enginelist();
  } else {
    // possible engine functions (depending on its class)
    var pathsengineExec = [];
    var command = null;

    var engines = enginelist().data;

    if (engines.indexOf(xpath[1]) > -1) {
      target = global.hybridd.engine[xpath[1]];
      target.id = target.engine;

      var cacheVal = typeof target.cache !== 'undefined' ? target.cache : 12000;
      var cacheIdx = DJB2.hash(request.sessionID + xpath.join('/'));
      var cacheResult = cache.get(cacheIdx, cacheVal);

      if (!cacheResult) { // Nothing cached
        result = engineexec(target, xpath, request.sessionID, request.data);
        if (!result.error) {
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
