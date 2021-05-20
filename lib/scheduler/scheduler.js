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
const SHUTDOWN_GRACE_PERIOD = 8000;

let cronCounter = 0;
let shutdownInitiated = false;

let schedulerCoreInterval = null; // the schedulers core interval loop
let schedulerCronInterval = null; // the schedulers cron interval loop

let schedulerInitiated = false; // whether the scheduler has been initiated
let schedulerCoreBusy = false;

let maxParallelProcesses; // TODO reuse
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
    global.hybrixd.logger(['info', 'scheduler'], 'Scheduler has been paused');
  }
  clearInterval(schedulerCoreInterval);
  clearInterval(schedulerCronInterval);
  schedulerCoreInterval = null;
  schedulerCronInterval = null;
  schedulerInitiated = false;
  sequential.next(cbArr);
}

function stopAll (cbArr) {
  if (shutdownInitiated) sequential.next(cbArr);
  else {
    qrtzProcess.stopAll();
    shutdownInitiated = true; // indicate that we're shutting down, this will prevent cronjobs from firing
    const recipes = ['asset', 'source', 'engine'];
    recipes.forEach(execStop);
    setTimeout(() => pause(cbArr), SHUTDOWN_GRACE_PERIOD);
  }
}

// resume the scheduler
function resume (cbArr) {
  if (!schedulerCoreInterval) {
    global.hybrixd.logger(['info', 'scheduler'], 'Scheduler has been started');
    initialize(cbArr);
  } else sequential.next(cbArr);
}

function coreLoop () {
  if (schedulerCoreBusy) return false;
  else {
    schedulerCoreBusy = true;
    executeProcesses();
    schedulerCoreBusy = false;
  }
}

function executeProcesses () {
  qrtzProcess.updateProcesses(maxUsage, maxParallelProcesses);
}

function initialize (cbArr) {
  maxUsage = conf.get('scheduler.tick') * conf.get('scheduler.maxusage') / MAX_USAGE_DEFAULT; // limit the amount of time spent during cycle "throttle"
  maxParallelProcesses = conf.get('scheduler.MaxParallelProcesses');
  schedulerCoreInterval = setInterval(runScheduler.bind({cbArr}), conf.get('scheduler.tick')); // every tick perform tasks from the queue and execute all processes...
  schedulerCronInterval = setInterval(processAndPurge, SCHEDULER_CRON_INTERVAL); // run every second
}

function execInitAndCron (recipeType) {
  if (shutdownInitiated) return;
  for (const id in global.hybrixd[recipeType]) {
    if ((recipeType === 'engine' || recipeType === 'source') && !conf.get(id + '.enabled')) continue; // skip disabled engines and sources

    const recipe = global.hybrixd[recipeType][id];
    const recipehasInitFunction = recipe.hasOwnProperty('quartz') && recipe.quartz.hasOwnProperty('init');
    const recipeHasBeenInitialized = recipe.initialized;
    recipe.initialized = true;

    // execute init
    if (recipehasInitFunction && !recipeHasBeenInitialized) qrtzProcess.create({recipe, command: ['init'], sessionID: 1});

    const recipeHasCronFunction = typeof recipe.cron === 'number' && recipe.hasOwnProperty('quartz') && recipe.quartz.hasOwnProperty('cron');
    const cronOffset = typeof recipe.cronOffset === 'number' ? recipe.cronOffset : 0;
    const isTimeForCron = cronOffset < recipe.cron
      ? cronCounter % recipe.cron === cronOffset // stagger for small offset
      : ((cronCounter - cronOffset) % recipe.cron === 0 && cronCounter >= cronOffset); // delay for large offset

    // execute cron
    if (recipeHasCronFunction && isTimeForCron) {
      qrtzProcess.create({recipe, command: ['cron'], sessionID: 1});
    }
  }
}

function execStop (recipeType) {
  for (const id in global.hybrixd[recipeType]) {
    if ((recipeType === 'engine' || recipeType === 'source') && !conf.get(id + '.enabled')) continue; // skip disabled engines and sources
    const recipe = global.hybrixd[recipeType][id];
    const recipehasStopFunction = recipe.hasOwnProperty('quartz') && recipe.quartz.hasOwnProperty('stop');
    const recipeHasBeenInitialized = recipe.initialized;
    if (recipehasStopFunction && recipeHasBeenInitialized) {
      const r = qrtzProcess.create({recipe, command: ['stop'], sessionID: 1});
      // DEBUG: console.log(id, r);
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
    global.hybrixd.logger(['info', 'scheduler'], 'Scheduler is running');
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
