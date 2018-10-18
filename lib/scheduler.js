//
// hybridd - scheduler.js
// Main processing engine and scheduler

/* global DEBUG : true */
/* eslint no-new-func: "off" */

// required libraries in this context
var functions = require('./functions');
var scheduler = require('./scheduler');
var modules = require('./modules');

var proc = require('./scheduler/proc.js');

// pause the scheduler
var pause = function pause (callbackArray) {
  if (global.hybridd.schedulerCoreInterval) {
    console.log('[i] scheduler has been paused.');
  }
  clearInterval(global.hybridd.schedulerCoreInterval);
  clearInterval(global.hybridd.schedulerCronInterval);
  global.hybridd.schedulerCoreInterval = null;
  global.hybridd.schedulerCronInterval = null;
  global.hybridd.schedulerInitiated = false;
  functions.sequential(callbackArray);
};

// resume the scheduler
var resume = function resume (callbackArray) {
  if (!global.hybridd.schedulerCoreInterval) {
    console.log('[i] scheduler has been started...');
    initialize(callbackArray);
  } else {
    functions.sequential(callbackArray);
  }
};

var unqueue = function () {
  // Start processes from the queue
  for (var processID in global.hybridd.procqueue) {
    if (global.hybridd.schedulerParallelProcesses < global.hybridd.schedulerMaxParallelProcesses) { // limit amount of active processes
      if (DEBUG) { console.log(` [D] processing engine creating process ${processID}`); }

      proc.start(processID, global.hybridd.procqueue[processID]);

      delete global.hybridd.procqueue[processID];
    }
  }
};

var coreLoop = function () {
  if (global.hybridd.schedulerCoreBusy) { return; } // only execute when previous timeframe has finished
  unqueue();

  global.hybridd.schedulerCoreBusy = true;
  var maxUsage = global.hybridd.schedulerTick * global.hybridd.schedulerMaxUsage / 100; // limit the amount of time spent during cycle "throttle"
  var end = Date.now() + maxUsage; // end of the allowed timeframe

  global.hybridd.schedulerParallelProcesses = 1;

  while (Date.now() <= end && global.hybridd.schedulerParallelProcesses > 0) { // run through all processes for a maximum timeframe if there are active processes
    global.hybridd.schedulerParallelProcesses = 0;
    var total = 0;
    for (var processID in global.hybridd.proc) {
      ++total;
      if (proc.next(processID)) { // if a process is active add it to the process count
        ++global.hybridd.schedulerParallelProcesses;
      }
    }
    if (DEBUG) { console.log(' [D] Active/Total Processes' + global.hybridd.schedulerParallelProcesses + '/' + total); }
  }
  global.hybridd.schedulerCoreBusy = false;
};

var initialize = function initialize (callbackArray) {
  global.hybridd.schedulerCoreInterval = setInterval(function () {
    if (!global.hybridd.schedulerInitiated) {
      global.hybridd.schedulerInitiated = true;
      console.log(' [i] scheduler is running');
      functions.sequential(this.callbackArray);
    }
    coreLoop();
  }.bind({callbackArray: callbackArray}), global.hybridd.schedulerTick);
  // every tick perform tasks from the queue and execute all processes...

  global.hybridd.schedulerCronInterval = setInterval(() => { // process recipe and module crons, and purge old processes
    cron();
    purge();
  }, 1000); // run every second
};

function cron () {
  global.hybridd.cronCounter++; // counting seconds
  if (global.hybridd.cronCounter >= 86400) { global.hybridd.cronCounter = 0; } // reset after 24 hours

  // process recipe and module crons
  for (var asset in global.hybridd.asset) {
    if (typeof global.hybridd.asset[asset].module !== 'undefined' && typeof global.hybridd.asset[asset].cron !== 'undefined' && global.hybridd.cronCounter % global.hybridd.asset[asset].cron === 0) {
      var processID = scheduler.init(0, {sessionID: 1, path: ['asset', asset, 'cron'], command: ['cron'], recipe: global.hybridd.asset[asset]});
      var target = global.hybridd.asset[asset]; target.symbol = asset;
      var mode = (typeof target.mode !== 'undefined' ? target.mode : null);
      var factor = (typeof target.factor !== 'undefined' ? target.factor : 8);
      if (modules.module.hasOwnProperty(global.hybridd.asset[asset].module) && modules.module[global.hybridd.asset[asset].module].hasOwnProperty('main') && typeof modules.module[global.hybridd.asset[asset].module].main.exec === 'function') {
        modules.module[global.hybridd.asset[asset].module].main.exec({processID: processID, target: target, mode: mode, factor: factor, command: ['cron']});
      }
    }
  }
  for (var source in global.hybridd.source) {
    if (typeof global.hybridd.source[source].module !== 'undefined' && typeof global.hybridd.source[source].cron !== 'undefined' && global.hybridd.cronCounter % global.hybridd.source[source].cron === 0) {
      var processID = scheduler.init(0, {sessionID: 1, path: ['source', source, 'cron'], command: ['cron'], recipe: global.hybridd.source[source]});
      var target = global.hybridd.source[source]; target.id = source; target.source = source;
      var mode = (typeof target.mode !== 'undefined' ? target.mode : null);
      if (modules.module.hasOwnProperty(global.hybridd.source[source].module) && modules.module[global.hybridd.source[source].module].hasOwnProperty('main') && typeof modules.module[global.hybridd.source[source].module].main.exec === 'function') {
        modules.module[global.hybridd.source[source].module].main.exec({processID: processID, target: target, mode: mode, command: ['cron']});
      }
    }
  }
  for (var engine in global.hybridd.engine) {
    if (typeof global.hybridd.engine[engine].module !== 'undefined' && typeof global.hybridd.engine[engine].cron !== 'undefined' && global.hybridd.cronCounter % global.hybridd.engine[engine].cron === 0) {
      var processID = scheduler.init(0, {sessionID: 1, path: ['engine', engine, 'cron'], command: ['cron'], recipe: global.hybridd.engine[engine]});
      var target = global.hybridd.engine[engine]; target.id = engine; target.engine = engine;
      var mode = (typeof target.mode !== 'undefined' ? target.mode : null);
      if (modules.module.hasOwnProperty(global.hybridd.engine[engine].module) && modules.module[global.hybridd.engine[engine].module].hasOwnProperty('main') && typeof modules.module[global.hybridd.engine[engine].module].main.exec === 'function') {
        modules.module[global.hybridd.engine[engine].module].main.exec({processID: processID, target: target, mode: mode, command: ['cron']});
      }
    }
  }
}

function purge () {
  // purge stale processes
  var count = 0;
  var procpurgetime = global.hybridd.schedulerProcPurgeTime || 600; // process purge time (sec): two minutes
  var now = Date.now();
  for (var processID in global.hybridd.proc) {
    if (global.hybridd.proc.hasOwnProperty(processID)) {
      var process = global.hybridd.proc[processID];

      // -1 if indefinite, 0 is directly time out
      var proctimeout = (typeof process.timeout === 'undefined' || process.timeout === null) ? 15000 : process.timeout;

      if (typeof global.hybridd.proc[processID] !== 'undefined') {
        // started stale processes are purged here
        if (proctimeout >= 0 && process.stopped && process.stopped < now - procpurgetime * 1000) {
          if (DEBUG) { console.log(` [D] processing engine purging process ${processID}`); }
          delete global.hybridd.proc[processID];
          ++count;
        } else {
          // set error when process has timed out on its short-term action
          if (proctimeout >= 0 && (process.stopped === null && process.started < now - proctimeout)) {
            if (DEBUG) { console.log(` [D] process ${processID} has timed out`); }
            var processIDSplit = processID.split('.');
            var fixedProcessId; // Create a processID that points to a process, not a processStep
            // we want to check the process for a timeHook, if that is present then execute the stop with parameters provided by the hook
            if (processIDSplit.length % 2 === 0) { // processID is a processStep
              fixedProcessId = processIDSplit.slice(0, processIDSplit.length - 1).join('.');
            } else {
              fixedProcessId = processID;
            }
            var fixedProcess = global.hybridd.proc[fixedProcessId];
            if (typeof fixedProcess!=='undefined' && fixedProcess.timeHook) {
              proc.stop(processID, fixedProcess.timeHook.err, fixedProcess.timeHook.data);
            } else {
              proc.error(processID, 'Process ' + processID+' timeout after '+proctimeout+'ms');
            }
          }
        }
      }
    }
  }
  if (count > 0) {
    console.log(' [i] Purged ' + count + ' stale processes.');
  }
}

exports.initialize = initialize; // main scheduler initializer
exports.pause = pause; // pause the scheduler
exports.resume = resume; // resume the scheduler

exports.fire = proc.fire; // queue subprocess steps
exports.init = proc.init; // initialize a new process
exports.stop = proc.stop; // functionally stop a process and all its subprocess
exports.pass = proc.pass; // pass data to to a process step

exports.type = proc.type; // set the type of the proc data
exports.error = proc.error; // functionally stop a process with an error
exports.finish = proc.finish; // creates a callback function that stops this process when finished
exports.result = proc.result; // creates an API result message, a follow-up
