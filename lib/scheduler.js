//
// hybridd - scheduler.js
// Main processing engine and scheduler

/* global DEBUG : true*/
/* eslint no-new-func: "off"*/

// required libraries in this context
var functions = require("./functions");

var initproc = function initproc (processID, properties) {

  var sessionID = 1;
  if (typeof properties !== "undefined") {

    if (typeof properties.subprocesses !== "undefined") {

      global.hybridd.procqueue[processID] = properties.subprocesses;

    }
    if (typeof properties.sessionID !== "undefined") {

      sessionID = properties.sessionID;

    }

  }
  if (processID === 0) {

    var suffix = `000${Math.random() * 999}`.slice(-3);
    processID = Date.now() + suffix.toString();

  }
  // initialize process variables
  global.hybridd.proc[processID] = {};
  global.hybridd.proc[processID].err = 0;
  global.hybridd.proc[processID].busy = null;
  global.hybridd.proc[processID].step = null;
  global.hybridd.proc[processID].steps = null;
  global.hybridd.proc[processID].subproc = null;
  global.hybridd.proc[processID].progress = 0;
  global.hybridd.proc[processID].autoprog = true;
  global.hybridd.proc[processID].timeout = null;
  global.hybridd.proc[processID].started = Date.now();
  global.hybridd.proc[processID].stopped = null;
  global.hybridd.proc[processID].request = null;

  if(properties && properties.hasOwnProperty("data")){

    global.hybridd.proc[processID].data = properties.data;

  }else if(global.hybridd.proc[processID].hasOwnProperty("data")){

  }else{
    global.hybridd.proc[processID].data = null;
  }

  // root parent only
  if (processID.indexOf(".", 15) === -1) {

    global.hybridd.proc[processID].sid = sessionID;
    global.hybridd.proc[processID].vars = {};

  }
  return processID;

};

var stopproc = function stopproc (processID, properties) {
  if (typeof properties === "undefined") {

    properties = {};

  }
  try {

    if (global.hybridd.proc[processID].stopped === null) {

      global.hybridd.proc[processID].err = typeof properties.err === "undefined"
        ? 0
        : properties.err;
      global.hybridd.proc[processID].data = typeof properties.data === "undefined"
        ? null
        : properties.data;
      global.hybridd.proc[processID].progress = 1;
      global.hybridd.proc[processID].stopped = Date.now();

    } else {

      if (DEBUG) {

        console.log(` [D] (${processID}) process was already stopped`);

      }

    }

  } catch (result) {

    if (DEBUG) {

      console.log(` [D] process ${processID} no longer exists, or cannot be stopped`);

    }

  }
  return 1;
};

var evaluate = function evaluate (runprocess, p, err, data) {
  return ( new Function("p", "err", "data",
                        `${global.hybridd.quartz}
    ${runprocess}`
                       ) )(p, err, data);
};

var seqstep = function seqstep (processID, subprocesses, step) {
  //TODO remove console.log("seqstep: "+processID+" " + global.hybridd.proc[processID].data);
  // wait for subprocess step to finish
  if (global.hybridd.proc[processID].busy === true) { //  || global.hybridd.proc[processID].step < step

    // check if the subprocess is already finished
    if (global.hybridd.proc[`${processID}.${step}`].progress === 1) { // && global.hybridd.proc[processID].progress < 1

      if (DEBUG) {

        console.log(` [D] (${processID}) finished step ${step + 1} of ${global.hybridd.proc[processID].steps + 1}`);

      }
      if (global.hybridd.proc[processID].autoprog === true) {

        global.hybridd.proc[processID].progress = global.hybridd.proc[processID].step / global.hybridd.proc[processID].steps;

      }
      global.hybridd.proc[processID].busy = false;
      // set time process has stopped
      if (global.hybridd.proc[processID].progress === 1) {

        global.hybridd.proc[processID].stopped = Date.now();

      } else {

        global.hybridd.proc[processID].step += 1;

      }
      // if all steps have been done, stop to pass data to parent process
      if (step === global.hybridd.proc[processID].steps) {

        var prevID = global.hybridd.proc[processID].subproc;
        var data = null;
        var err = null;
        if (typeof global.hybridd.proc[prevID] !== "undefined") {

          err = typeof global.hybridd.proc[prevID].err === "undefined" ? 1 : global.hybridd.proc[prevID].err;
          data = typeof global.hybridd.proc[prevID].data === "undefined" ? null : global.hybridd.proc[prevID].data;
        }else{
          err = global.hybridd.proc[processID].hasOwnProperty("err")?global.hybridd.proc[processID].err: 1;
          data = global.hybridd.proc[processID].hasOwnProperty("data")?global.hybridd.proc[processID].data:null;

        }
        var p = {
          "parentID": processID,
          "processID": `${processID}.${step}`
        };
        evaluate("stop(p,err,data);", p, err, data);

      }

    } else if (global.hybridd.proc[processID].autoprog === true) {

      if (global.hybridd.proc[`${processID}.${step}`].steps > 0) {

        global.hybridd.proc[processID].progress = (global.hybridd.proc[processID].step - 1) / global.hybridd.proc[processID].steps + 1 / global.hybridd.proc[processID].steps * global.hybridd.proc[`${processID}.${step}`].progress;

      }

    }
    // run next step
    setTimeout(() => {

      if (typeof global.hybridd.proc[processID] !== "undefined") {

        if (typeof global.hybridd.proc[processID].step !== "undefined") {

          seqstep(processID, subprocesses, global.hybridd.proc[processID].step);

        }

      }

    }, 200);
    // initialize subprocess step

  } else if (global.hybridd.proc[processID].busy !== true && global.hybridd.proc[processID].stopped === null && global.hybridd.proc[processID].step <= global.hybridd.proc[processID].steps) {

    global.hybridd.proc[processID].busy = true;
    if (DEBUG) {

      console.log(` [D] (${processID}) running step ${step + 1} of ${global.hybridd.proc[processID].steps + 1}`);

    }
    prevID = global.hybridd.proc[processID].subproc;


    if (typeof global.hybridd.proc[prevID] !== "undefined") {

      err = typeof global.hybridd.proc[prevID].err !== "undefined" ? global.hybridd.proc[prevID].err : 1;
      data = typeof global.hybridd.proc[prevID].data !== "undefined" ? global.hybridd.proc[prevID].data : null;

    }else{
      err = global.hybridd.proc[processID].hasOwnProperty("err")?global.hybridd.proc[processID].err : 1;
      data = global.hybridd.proc[processID].hasOwnProperty("data")?global.hybridd.proc[processID].data:null;

    }

    // if base command is used, insert extra properties
    var subinsert = `{parentID:"${processID}",processID:"${processID}.${step}"}`;
    var runprocess = subprocesses[step].replace(/peek\(/g, `peek(${subinsert},`); // .replace(/json\(/g,'json('+subinsert+',');
    if ([
      "call",
      "curl",
      "coll",
      "dump",
      "expl",
      "each",
      "find",
      "fork",
      "func",
      "jpar",
      "impl",
      "jump",
      "logs",
      "next",
      "pass",
      "poke",
      "prog",
      "prwt",
      "read",
      "stop",
      "test",
      "tran",
      "form",
      "time",
      "wait"
    ].indexOf(subprocesses[step].substr(0, 4)) > -1) {

      runprocess = `${runprocess.slice(0, 5) + subinsert},${runprocess.slice(5)}`;

    }else{
      console.log(' [!] Unknown Quartz command: "'+subprocesses[step].substr(0, 4)+'"');
    }
    // set previous ID step
    global.hybridd.proc[processID].subproc = `${processID}.${step}`;
    // fire off the subprocess
    try {

      evaluate(runprocess, p, err, data);

    } catch (result) {

      console.log(` [!] (${processID}) proc error: \n     ${runprocess}\n     ${result ? result : "UNKNOWN ERROR!"}`);

    }
    setTimeout(() => {

      seqstep(processID, subprocesses, global.hybridd.proc[processID].step);

    }, 200);

  }
  return 1;

};

var seqproc = function seqproc (processID, subprocesses) {

  global.hybridd.proc[processID].step = 0;
  global.hybridd.proc[processID].steps = subprocesses.length - 1;
  global.hybridd.proc[processID].busy = false;
  if (DEBUG) {

    console.log(` [D] (${processID}) initializing sequence processing for ${global.hybridd.proc[processID].steps + 1} steps...`);

  }
  // prepare stepping array
  for (var step = 0; step < subprocesses.length; step += 1) {


    initproc(`${processID}.${step}`);
    subprocesses[step] = subprocesses[step].replace(`"processID":"${processID}"`, `"processID":"${processID}.${step}"`);
    global.hybridd.proc[`${processID}.${step}`].request = subprocesses[step];

  }
  if(subprocesses.length>0){
    global.hybridd.proc[`${processID}.0`].data = global.hybridd.proc[processID].data;
  }

  return seqstep(processID, subprocesses, 0);	// start stepping

};

var subqueue = function subqueue (processID, subprocesses) {

  var result = true;
  if (typeof subprocesses !== "undefined") {

    if (subprocesses.length > -1) {
      var sessionID = 1;

      if (DEBUG) {

        console.log(` [D] adding ${processID} to processing queue`);

      }
      if (typeof global.hybridd.proc[processID] !== "undefined" && typeof global.hybridd.proc[processID].sid !== "undefined") {

        sessionID = global.hybridd.proc[processID].sid;

      }

      var data = global.hybridd.proc[processID].data;
      initproc(processID, {
        sessionID:sessionID,
        subprocesses:subprocesses,
        data:data
      });


      result = false;

    }

  }

  return result;

};

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
      seqproc(processID, global.hybridd.procqueue[processID]);
      delete global.hybridd.procqueue[processID];

    }

  }.bind({callbackArray:callbackArray}), 50);

  // every 50 milliseconds perform tasks from the queue...
  return setInterval(() => {

    var procpurgetime = 60; // process purge time (sec): one minute
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

  }, 1000); // every second purge old tasks from the proc list...

};

exports.initialize = initialize; // main scheduler initializer
exports.init = initproc; // initialize a new process
exports.stop = stopproc; // functionally stop a process
exports.fire = subqueue; // queue subprocess steps
exports.pause = pause; // pause the scheduler
exports.resume = resume; // resume the scheduler
