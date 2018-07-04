//
// hybridd - scheduler.js
// Main processing engine and scheduler

/* global DEBUG : true*/
/* eslint no-new-func: "off"*/


// required libraries in this context
var functions = require("./functions");
var proc = require("./scheduler/proc.js");

// pause the scheduler
var pause = function pause(callbackArray){
  if(global.hybridd.schedulerCoreInterval){
    console.log("[i] Scheduler has been paused.");
  }
  clearInterval(global.hybridd.schedulerCoreInterval);
  clearInterval(global.hybridd.schedulerCronInterval);
  global.hybridd.schedulerCoreInterval = null;
  global.hybridd.schedulerCronInterval = null;
  global.hybridd.schedulerInitiated = false;
  functions.sequential(callbackArray);
}

// resume the scheduler
var resume = function resume(callbackArray){
  if(!global.hybridd.schedulerCoreInterval){
    console.log("[i] Scheduler has been started...");
    initialize(callbackArray);
  }else{
    functions.sequential(callbackArray);
  }
}

var unqueue = function(){
  // Start processes from the queue
  for (var processID in global.hybridd.procqueue) {
    if(global.hybridd.schedulerParallelProcesses < global.hybridd.schedulerMaxParallelProcesses){ // limit amount of active processes

      if (DEBUG) { console.log(` [D] processing engine creating process ${processID}`);}

      proc.start(processID, global.hybridd.procqueue[processID]);

      delete global.hybridd.procqueue[processID];
    }
  }
}

var coreLoop = function(){
  if(global.hybridd.schedulerCoreBusy){return;} // only execute when previous timeframe has finished
  unqueue();

  global.hybridd.schedulerCoreBusy = true;
  var maxUsage = global.hybridd.schedulerTick*global.hybridd.schedulerMaxUsage/100; // limit the amount of time spent during cycle "throttle"
  var end = Date.now() + maxUsage; // end of the allowed timeframe

  global.hybridd.schedulerParallelProcesses=1;

  while(Date.now()<= end && global.hybridd.schedulerParallelProcesses>0){  // run through all processes for a maximum timeframe if there are active processes
    global.hybridd.schedulerParallelProcesses = 0;
    for (var processID in global.hybridd.proc) {
      if(proc.next(processID)){ // if a process is active add it to the process count
        global.hybridd.schedulerParallelProcesses++;
      }
    }
  }
  global.hybridd.schedulerCoreBusy = false;
}


var initialize = function initialize (callbackArray) {
  global.hybridd.quartz = fs.readFileSync("./scheduler/quartz.js", "utf8");

  global.hybridd.schedulerCoreInterval = setInterval( function(){

    if(!global.hybridd.schedulerInitiated){
      global.hybridd.schedulerInitiated = true;
      console.log(" [i] scheduler is running");
      functions.sequential(this.callbackArray);
    }

    coreLoop();

  }.bind({callbackArray:callbackArray}),global.hybridd.schedulerTick);
  // every tick perform tasks from the queue and execute all processes...

  global.hybridd.schedulerCronInterval = setInterval(() => {   // process recipe and module crons, and purge old processes
    cron();
    purge();
  }, 1000); // run every second

};

function cron(){
  global.hybridd.cronCounter++; // counting seconds
  if(global.hybridd.cronCounter>=86400) { global.hybridd.cronCounter=0; } // reset after 24 hours

  // process recipe and module crons
  for (var asset in global.hybridd.asset) {
    if(typeof global.hybridd.asset[asset].module !== "undefined" && typeof global.hybridd.asset[asset].cron !== "undefined" && global.hybridd.cronCounter%global.hybridd.asset[asset].cron === 0) {
      var processID = scheduler.init(0);
      var target = global.hybridd.asset[asset]; target.symbol = asset;
      var mode = (typeof target.mode!="undefined"?target.mode:null);
      var factor = (typeof target.factor!="undefined"?target.factor:8);
      modules.module[global.hybridd.asset[asset].module].main.exec({processID:processID,target:target,mode:mode,factor:factor,command:['cron']});
    }
  }
  for (var source in global.hybridd.source) {
    if(typeof global.hybridd.source[source].module !== "undefined" && typeof global.hybridd.source[source].cron !== "undefined" && global.hybridd.cronCounter%global.hybridd.source[source].cron === 0) {
      var processID = scheduler.init(0);
      var target = global.hybridd.source[source]; target.id = source; target.source = source;
      var mode = (typeof target.mode!="undefined"?target.mode:null);
      modules.module[global.hybridd.source[source].module].main.exec({processID:processID,target:target,mode:mode,command:['cron']});
    }
  }
  for (var engine in global.hybridd.engine) {
    if(typeof global.hybridd.engine[engine].module !== "undefined" && typeof global.hybridd.engine[engine].cron !== "undefined" && global.hybridd.cronCounter%global.hybridd.engine[engine].cron === 0) {
      var processID = scheduler.init(0);
      var target = global.hybridd.engine[engine]; target.id = engine; target.engine = engine;
      var mode = (typeof target.mode!="undefined"?target.mode:null);
      modules.module[global.hybridd.engine[engine].module].main.exec({processID:processID,target:target,mode:mode,command:['cron']});
    }
  }
}

function purge(){
  // purge processes
  var procpurgetime = global.hybridd.SchedulerProcPurgeTime; // process purge time (sec): two minutes
  var now = Date.now();
  for (var processID in global.hybridd.proc) {

    if (global.hybridd.proc.hasOwnProperty(processID)) {
      var process = global.hybridd.proc[processID];
      var proctimeout = process.timeout === null ? 15000 : process.timeout;
      if (typeof global.hybridd.proc[processID] !== "undefined") {

        // started stale processes are purged here
        if (proctimeout > 0 && process.started < now - procpurgetime * 1000) {

          if (DEBUG) {console.log(` [D] processing engine purging process ${processID}`);}

          delete global.hybridd.proc[processID];

        } else {

          // set error when process has timed out on its short-term action
          if (proctimeout > 0 && (process.stopped === null && process.started < now - proctimeout)) {

            if (DEBUG) {console.log(` [D] process ${processID} has timed out`);}
            proc.error(processID, "Process timeout");
          }
        }
      }
    }
  }
}

exports.initialize = initialize; // main scheduler initializer
exports.pause = pause; // pause the scheduler
exports.resume = resume; // resume the scheduler

exports.fire = proc.fire; // queue subprocess steps
exports.init = proc.init; // initialize a new process
exports.stop = proc.stop; // functionally stop a process
