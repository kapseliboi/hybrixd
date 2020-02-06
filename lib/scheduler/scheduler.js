//
// hybrixd - scheduler.js
// Main processing engine and scheduler

/* global DEBUG : true */

const sequential = require('../util/sequential');
const conf = require('../conf/conf');
const qrtzProcess = require('./process');

const MAX_USAGE_DEFAULT = 100;
const SCHEDULER_CRON_INTERVAL = 1000;
const CRON_COUNTER_RESET = 86400;

let cronCounter = 0;

let schedulerCoreInterval = null; // the schedulers core interval loop
let schedulerCronInterval = null; // the schedulers cron interval loop

let schedulerInitiated = false; // whether the scheduler has been initiated
let schedulerParallelProcesses = 0; // number of processes
let schedulerCoreBusy = false;

let maxParallelProcesses;
let maxUsage;

function isRunning () {
  return !!schedulerCoreInterval;
}

function isReady () {
  return schedulerInitiated;
}
// pause the scheduler
function pause (cbArr) {
  if (schedulerCoreInterval) {
    console.log(' [i] scheduler has been paused');
  }
  clearInterval(schedulerCoreInterval);
  clearInterval(schedulerCronInterval);
  schedulerCoreInterval = null;
  schedulerCronInterval = null;
  schedulerInitiated = false;
  sequential.next(cbArr);
}

function stopAll (cbArr) {
  qrtzProcess.stopAll();
  sequential.next(cbArr);
}

// resume the scheduler
function resume (cbArr) {
  if (!schedulerCoreInterval) {
    console.log(' [i] scheduler has been started');
    initialize(cbArr);
  } else {
    sequential.next(cbArr);
  }
}

function coreLoop () {
  if (schedulerCoreBusy) {
    return false; // only execute when previous timeframe has finished
  } else {
    schedulerCoreBusy = true;
    schedulerParallelProcesses = 1;
    executeProcesses();
    schedulerCoreBusy = false;
  }
}

function executeProcesses () {
  qrtzProcess.updateProcesses(maxUsage);
}

function initialize (cbArr) {
  maxUsage = conf.get('scheduler.tick') * conf.get('scheduler.maxusage') / MAX_USAGE_DEFAULT; // limit the amount of time spent during cycle "throttle"
  maxParallelProcesses = conf.get('scheduler.MaxParallelProcesses');
  schedulerCoreInterval = setInterval(runScheduler.bind({cbArr}), conf.get('scheduler.tick')); // every tick perform tasks from the queue and execute all processes...
  schedulerCronInterval = setInterval(processAndPurge, SCHEDULER_CRON_INTERVAL); // run every second
}

function execInitAndCron (recipeType) {
  for (let id in global.hybrixd[recipeType]) {
    const recipe = global.hybrixd[recipeType][id];
    if (recipe.hasOwnProperty('quartz') && recipe.quartz.hasOwnProperty('init') && recipe.initialized !== true) {
      recipe.initialized = true;
      qrtzProcess.create({recipe, command: ['init'], sessionID: 1});
    }

    if (typeof recipe.cron !== 'undefined' && cronCounter % recipe.cron === 0 && recipe.hasOwnProperty('quartz') && recipe.quartz.hasOwnProperty('cron')) {
      qrtzProcess.create({recipe, command: ['cron'], sessionID: 1});
    }
  }
}

function cron () {
  const recipes = ['asset', 'source', 'engine'];
  if (cronCounter >= CRON_COUNTER_RESET) { cronCounter = 0; } // reset after 24 hours
  recipes.forEach(execInitAndCron);
  cronCounter++; // counting seconds
}

function purge () {
  qrtzProcess.purgeProcesses();
}

// process recipe and module crons, and purge old processes
function processAndPurge () {
  cron();
  purge();
}

function runScheduler () {
  if (!schedulerInitiated) {
    schedulerInitiated = true;
    console.log(' [i] scheduler is running');
    sequential.next(this.cbArr);
  }
  coreLoop();
}

exports.initialize = initialize; // main scheduler initializer
exports.pause = pause; // pause the scheduler
exports.resume = resume; // resume the scheduler

exports.stopAll = stopAll;
exports.isRunning = isRunning;
exports.isReady = isReady;
