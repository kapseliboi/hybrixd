//
// hybrixd - scheduler.js
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
  if (global.hybrixd.schedulerCoreInterval) {
    console.log(' [i] scheduler has been paused');
  }
  clearInterval(global.hybrixd.schedulerCoreInterval);
  clearInterval(global.hybrixd.schedulerCronInterval);
  global.hybrixd.schedulerCoreInterval = null;
  global.hybrixd.schedulerCronInterval = null;
  global.hybrixd.schedulerInitiated = false;
  functions.sequential(callbackArray);
};

// resume the scheduler
var resume = function resume (callbackArray) {
  if (!global.hybrixd.schedulerCoreInterval) {
    console.log(' [i] scheduler has been started');
    initialize(callbackArray);
  } else {
    functions.sequential(callbackArray);
  }
};

var unqueue = function () {
  // Start processes from the queue
  for (var processID in global.hybrixd.procqueue) {
    if (global.hybrixd.schedulerParallelProcesses < global.hybrixd.schedulerMaxParallelProcesses) { // limit amount of active processes
      if (DEBUG) { console.log(` [D] processing engine creating process ${processID}`); }

      proc.start(processID, global.hybrixd.procqueue[processID]);

      delete global.hybrixd.procqueue[processID];
    }
  }
};

var coreLoop = function () {
  if (global.hybrixd.schedulerCoreBusy) { return; } // only execute when previous timeframe has finished
  unqueue();

  global.hybrixd.schedulerCoreBusy = true;
  var maxUsage = global.hybrixd.schedulerTick * global.hybrixd.schedulerMaxUsage / 100; // limit the amount of time spent during cycle "throttle"
  var end = Date.now() + maxUsage; // end of the allowed timeframe

  global.hybrixd.schedulerParallelProcesses = 1;

  while (Date.now() <= end && global.hybrixd.schedulerParallelProcesses > 0) { // run through all processes for a maximum timeframe if there are active processes
    global.hybrixd.schedulerParallelProcesses = 0;
    var total = 0;
    for (var processID in global.hybrixd.proc) {
      ++total;
      if (proc.next(processID)) { // if a process is active add it to the process count
        ++global.hybrixd.schedulerParallelProcesses;
      }
    }
    if (DEBUG) { console.log(' [D] Active/Total Processes' + global.hybrixd.schedulerParallelProcesses + '/' + total); }
  }
  global.hybrixd.schedulerCoreBusy = false;
};

var initialize = function initialize (callbackArray) {
  global.hybrixd.schedulerCoreInterval = setInterval(function () {
    if (!global.hybrixd.schedulerInitiated) {
      global.hybrixd.schedulerInitiated = true;
      console.log(' [i] scheduler is running');
      functions.sequential(this.callbackArray);
    }
    coreLoop();
  }.bind({callbackArray: callbackArray}), global.hybrixd.schedulerTick);
  // every tick perform tasks from the queue and execute all processes...

  global.hybrixd.schedulerCronInterval = setInterval(() => { // process recipe and module crons, and purge old processes
    cron();
    purge();
  }, 1000); // run every second
};

function cron () {
  global.hybrixd.cronCounter++; // counting seconds
  if (global.hybrixd.cronCounter >= 86400) { global.hybrixd.cronCounter = 0; } // reset after 24 hours

  // process recipe and module crons
  for (var asset in global.hybrixd.asset) {
    if (typeof global.hybrixd.asset[asset].module !== 'undefined' && typeof global.hybrixd.asset[asset].cron !== 'undefined' && global.hybrixd.cronCounter % global.hybrixd.asset[asset].cron === 0) {
      var processID = scheduler.init(0, {sessionID: 1, path: ['asset', asset, 'cron'], command: ['cron'], recipe: global.hybrixd.asset[asset]});
      var target = global.hybrixd.asset[asset]; target.symbol = asset;
      var mode = (typeof target.mode !== 'undefined' ? target.mode : null);
      var factor = (typeof target.factor !== 'undefined' ? target.factor : 8);
      if (modules.module.hasOwnProperty(global.hybrixd.asset[asset].module) && modules.module[global.hybrixd.asset[asset].module].hasOwnProperty('main') && typeof modules.module[global.hybrixd.asset[asset].module].main.exec === 'function') {
        modules.module[global.hybrixd.asset[asset].module].main.exec({processID: processID, target: target, mode: mode, factor: factor, command: ['cron']});
      }
    }
  }
  for (var source in global.hybrixd.source) {
    if (typeof global.hybrixd.source[source].module !== 'undefined' && typeof global.hybrixd.source[source].cron !== 'undefined' && global.hybrixd.cronCounter % global.hybrixd.source[source].cron === 0) {
      var processID = scheduler.init(0, {sessionID: 1, path: ['source', source, 'cron'], command: ['cron'], recipe: global.hybrixd.source[source]});
      var target = global.hybrixd.source[source]; target.id = source; target.source = source;
      var mode = (typeof target.mode !== 'undefined' ? target.mode : null);
      if (modules.module.hasOwnProperty(global.hybrixd.source[source].module) && modules.module[global.hybrixd.source[source].module].hasOwnProperty('main') && typeof modules.module[global.hybrixd.source[source].module].main.exec === 'function') {
        modules.module[global.hybrixd.source[source].module].main.exec({processID: processID, target: target, mode: mode, command: ['cron']});
      }
    }
  }
  for (var engine in global.hybrixd.engine) {
    if (typeof global.hybrixd.engine[engine].module !== 'undefined' && typeof global.hybrixd.engine[engine].cron !== 'undefined' && global.hybrixd.cronCounter % global.hybrixd.engine[engine].cron === 0) {
      var processID = scheduler.init(0, {sessionID: 1, path: ['engine', engine, 'cron'], command: ['cron'], recipe: global.hybrixd.engine[engine]});
      var target = global.hybrixd.engine[engine]; target.id = engine; target.engine = engine;
      var mode = (typeof target.mode !== 'undefined' ? target.mode : null);
      if (modules.module.hasOwnProperty(global.hybrixd.engine[engine].module) && modules.module[global.hybrixd.engine[engine].module].hasOwnProperty('main') && typeof modules.module[global.hybrixd.engine[engine].module].main.exec === 'function') {
        modules.module[global.hybrixd.engine[engine].module].main.exec({processID: processID, target: target, mode: mode, command: ['cron']});
      }
    }
  }
}

function purge () {
  // purge stale processes
  var count = 0;
  var procpurgetime = global.hybrixd.schedulerProcPurgeTime || 600; // process purge time (sec): two minutes
  var now = Date.now();
  for (var processID in global.hybrixd.proc) {
    if (global.hybrixd.proc.hasOwnProperty(processID)) {
      var process = global.hybrixd.proc[processID];

      // -1 if indefinite, 0 is directly time out
      var proctimeout = (typeof process.timeout === 'undefined' || process.timeout === null) ? 15000 : process.timeout;

      if (typeof global.hybrixd.proc[processID] !== 'undefined') {
        // started stale processes are purged here
        if (proctimeout >= 0 && process.stopped && process.stopped < now - procpurgetime * 1000) {
          if (DEBUG) { console.log(` [D] processing engine purging process ${processID}`); }
          delete global.hybrixd.proc[processID];
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
            var fixedProcess = global.hybrixd.proc[fixedProcessId];
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
    console.log(' [i] purged ' + count + ' stale processes');
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
