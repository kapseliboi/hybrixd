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
  if(global.hybridd.schedulerInterval){
    console.log("[i] Scheduler has been paused.");
  }
  clearInterval(global.hybridd.schedulerInterval);
  global.hybridd.schedulerInterval = null;
  global.hybridd.schedulerInitiated = false;
  functions.sequential(callbackArray);
}

// resume the scheduler
var resume = function resume(callbackArray){
  if(!global.hybridd.schedulerInterval){
    console.log("[i] Scheduler has been started...");
    initialize(callbackArray);
  }else{
    functions.sequential(callbackArray);
  }
}

var initialize = function initialize (callbackArray) {

  global.hybridd.schedulerInterval = setInterval( function(){
    global.hybridd.quartz =  fs.readFileSync("./scheduler/quartz.js", "utf8");

    if(!global.hybridd.schedulerInitiated){
      global.hybridd.schedulerInitiated = true;
      console.log(" [i] scheduler is running");
      functions.sequential(this.callbackArray);
    }

    for (var processID in global.hybridd.procqueue) {

      if (DEBUG) {

        console.log(` [D] processing engine creating process ${processID}`);

      }
      proc.start(processID, global.hybridd.procqueue[processID]);
      delete global.hybridd.procqueue[processID];
    }

  }.bind({callbackArray:callbackArray}), 50);
  // every 50 milliseconds perform tasks from the queue...

  // process recipe and module crons, and purge old processes
  return setInterval(() => {

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

    // purge processes

    var procpurgetime = 120; // process purge time (sec): two minutes
    for (var processID in global.hybridd.proc) {

      if (global.hybridd.proc.hasOwnProperty(processID)) {

        var proctimeout = global.hybridd.proc[processID].timeout === null ? 15000 : global.hybridd.proc[processID].timeout;
        if (typeof global.hybridd.proc[processID] !== "undefined") {

          // started stale processes are purged here
          if (proctimeout > 0 && global.hybridd.proc[processID].started < Date.now() - procpurgetime * 1000) {

            if (DEBUG) {

              console.log(` [D] processing engine purging process ${processID}`);

            }
            delete global.hybridd.proc[processID];

          } else {

            // set error when process has timed out on its short-term action
            if (proctimeout > 0 && (global.hybridd.proc[processID].stopped === null && global.hybridd.proc[processID].started < Date.now() - proctimeout)) {

              if (DEBUG) {

                console.log(` [D] process ${processID} has timed out`);

              }
              global.hybridd.proc[processID].err = 1;
              global.hybridd.proc[processID].info = "Process timeout!";
              global.hybridd.proc[processID].busy = false;
              global.hybridd.proc[processID].stopped = Date.now();

            }

          }

        }

      }

    }

  }, 1000); // run every second

};

exports.initialize = initialize; // main scheduler initializer
exports.init = proc.init; // initialize a new process
exports.stop = proc.stop; // functionally stop a process
exports.fire = proc.fire; // queue subprocess steps
exports.pause = pause; // pause the scheduler
exports.resume = resume; // resume the scheduler
