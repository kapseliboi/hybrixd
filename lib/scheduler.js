//
// hybrixd - scheduler.js
// Main processing engine and scheduler

/* global DEBUG : true */
/* eslint no-new-func: "off" */

// required libraries in this context
const functions = require('./functions');
const scheduler = require('./scheduler');
const modules = require('./modules');
const proc = require('./scheduler/proc.js');

const PROCESS_PURGE_TIME = 600; // process purge time (sec): ten minutes
const DEFAULT_PROCESS_TIMEOUT = 15000;
const DEFAULT_ASSET_FACTOR = 8;

// pause the scheduler
function pause (callbackArray) {
  if (global.hybrixd.schedulerCoreInterval) {
    console.log(' [i] scheduler has been paused');
  }
  clearInterval(global.hybrixd.schedulerCoreInterval);
  clearInterval(global.hybrixd.schedulerCronInterval);
  global.hybrixd.schedulerCoreInterval = null;
  global.hybrixd.schedulerCronInterval = null;
  global.hybrixd.schedulerInitiated = false;
  functions.sequential(callbackArray);
}

// resume the scheduler
function resume (callbackArray) {
  if (!global.hybrixd.schedulerCoreInterval) {
    console.log(' [i] scheduler has been started');
    initialize(callbackArray);
  } else {
    functions.sequential(callbackArray);
  }
}

function unqueue () {
  // Start processes from the queue
  for (let processID in global.hybrixd.procqueue) {
    if (global.hybrixd.schedulerParallelProcesses < global.hybrixd.schedulerMaxParallelProcesses) { // limit amount of active processes
      if (DEBUG) { console.log(` [D] processing engine creating process ${processID}`); }

      proc.start(processID, global.hybrixd.procqueue[processID]);

      delete global.hybrixd.procqueue[processID];
    }
  }
}

function coreLoop () {
  if (global.hybrixd.schedulerCoreBusy) {
    return false; // only execute when previous timeframe has finished
  } else {
    unqueue();
    global.hybrixd.schedulerCoreBusy = true;
    global.hybrixd.schedulerParallelProcesses = 1;
    executeProcesses();
    global.hybrixd.schedulerCoreBusy = false;
  }
}

function executeProcesses () {
  const maxUsage = global.hybrixd.schedulerTick * global.hybrixd.schedulerMaxUsage / 100; // limit the amount of time spent during cycle "throttle"
  const end = Date.now() + maxUsage; // end of the allowed timeframe

  while (Date.now() <= end && global.hybrixd.schedulerParallelProcesses > 0) { // run through all processes for a maximum timeframe if there are active processes
    global.hybrixd.schedulerParallelProcesses = 0;
    let total = 0;
    for (let processID in global.hybrixd.proc) {
      ++total;
      if (proc.next(processID)) { // if a process is active add it to the process count
        ++global.hybrixd.schedulerParallelProcesses;
      }
    }
    if (DEBUG) { console.log(' [D] Active/Total Processes' + global.hybrixd.schedulerParallelProcesses + '/' + total); }
  }
}

function initialize (callbackArray) {
  global.hybrixd.schedulerCoreInterval = setInterval(runScheduler.bind({callbackArray}), global.hybrixd.schedulerTick); // every tick perform tasks from the queue and execute all processes...
  global.hybrixd.schedulerCronInterval = setInterval(processAndPurge, 1000); // run every second
}

// process recipe and module crons, and purge old processes
function processAndPurge () {
  cron();
  purge();
}

function runScheduler () {
  if (!global.hybrixd.schedulerInitiated) {
    global.hybrixd.schedulerInitiated = true;
    console.log(' [i] scheduler is running');
    functions.sequential(this.callbackArray);
  }
  coreLoop();
}

function mainProcessDataOrError (main, processID, recipe, command) {
  try {
    return main.exec({
      processID: processID,
      target: recipe,
      command: command
    });
  } catch (e) {
    console.log(' [!] Error executing function /' + command.join('/') + ' : ' + e);
    return {error: 1, data: 'Error executing function.'};
  }
}

function exec (data, recipe, xpath, command, sessionID) {
  const processID = scheduler.init(0, {sessionID, data, path: xpath, command, recipe});
  // Is this a pure function? => No it has a side effect / main prupose  of creating a proccess. Kind of anti-pure :)
  const main = global.hybrixd.module[recipe.module].main;
  const doesNotHaveExec = !main.hasOwnProperty('exec');
  const recipesQuartz = recipe.hasOwnProperty('quartz') && recipe.quartz.hasOwnProperty(command[0]);
  const mainProcess = doesNotHaveExec || recipesQuartz ? global.hybrixd.module['quartz'].main : main;
  const result = mainProcessDataOrError(mainProcess, processID, recipe, command);

  return typeof result === 'undefined'
    ? scheduler.result(processID, xpath)
    : result;
}

function execCron (recipeType) {
  for (let id in global.hybrixd[recipeType]) {
    const recipe = global.hybrixd[recipeType][id];
    if (typeof recipe.cron !== 'undefined' && global.hybrixd.cronCounter % recipe.cron === 0) {
      console.log(' [i] Excuting cron job for ' + recipeType + ' ' + id + ' every ' + recipe.cron + ' seconds.');
      exec(null, recipe, [recipeType, id, 'cron'], ['cron'], 1);
    }
  }
}

function cron () {
  const recipes = ['asset', 'source', 'engine'];

  recipes.forEach(execCron);
  global.hybrixd.cronCounter++; // counting seconds
  if (global.hybrixd.cronCounter >= 86400) { global.hybrixd.cronCounter = 0; } // reset after 24 hours
}

// purge stale processes
function purge () {
  const procPurgeTime = global.hybrixd.schedulerProcPurgeTime || PROCESS_PURGE_TIME; // process purge time (sec): two minutes
  const now = Date.now();
  let count = 0;

  for (let processID in global.hybrixd.proc) {
    if (global.hybrixd.proc.hasOwnProperty(processID)) {
      const process = global.hybrixd.proc[processID];
      const procTimeOut = (typeof process.timeout === 'undefined' || process.timeout === null) ? DEFAULT_PROCESS_TIMEOUT : process.timeout; // -1 if indefinite, 0 is directly time out

      if (typeof global.hybrixd.proc[processID] !== 'undefined') {
        // started stale processes are purged here
        if (procTimeOut >= 0 && process.stopped && process.stopped < now - procPurgeTime * 1000) {
          if (DEBUG) { console.log(` [D] processing engine purging process ${processID}`); }
          delete global.hybrixd.proc[processID];
          ++count;
        } else if (procTimeOut >= 0 && (process.stopped === null && process.started < now - procTimeOut)) { // set error when process has timed out on its short-term action
          setFixedProcess(processID, procTimeOut);
        }
      }
    }
  }
  if (count > 0) {
    console.log(' [i] purged ' + count + ' stale processes');
  }
}

// Create a processID that points to a process, not a processStep
// we want to check the process for a timeHook, if that is present then execute the stop with parameters provided by the hook
function setFixedProcess (processID, procTimeOut) {
  const processIDSplit = processID.split('.');
  const fixedProcessId = processIDSplit.length % 2 === 0
    ? processIDSplit.slice(0, processIDSplit.length - 1).join('.')
    : processID;
  const fixedProcess = global.hybrixd.proc[fixedProcessId];

  if (DEBUG) { console.log(` [D] process ${processID} has timed out`); }

  typeof fixedProcess !== 'undefined' && fixedProcess.timeHook
    ? proc.stop(processID, fixedProcess.timeHook.err, fixedProcess.timeHook.data)
    : proc.error(processID, 'Process ' + processID + ' timeout after ' + procTimeOut + 'ms');
}

exports.initialize = initialize; // main scheduler initializer
exports.pause = pause; // pause the scheduler
exports.resume = resume; // resume the scheduler

exports.exec = exec; // execute a process

exports.fire = proc.fire; // queue subprocess steps
exports.init = proc.init; // initialize a new process
exports.stop = proc.stop; // functionally stop a process and all its subprocess
exports.pass = proc.pass; // pass data to to a process step

exports.help = proc.help; // set the help of the proc
exports.type = proc.type; // set the type of the proc data
exports.error = proc.error; // functionally stop a process with an error
exports.finish = proc.finish; // creates a callback function that stops this process when finished
exports.result = proc.result; // creates an API result message, a follow-up
