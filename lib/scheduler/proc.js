//
// hybridd - scheduler.js
// Main processing engine and scheduler

/* global DEBUG : true*/
/* eslint no-new-func: "off"*/

// required libraries in this context
var functions = require("../functions");

var init = function init (processID, properties) {

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

var stop = function(processID, properties) {
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

var next = function(processID, subprocesses) {
  var step = typeof global.hybridd.proc[processID].step === 'undefined'?0:global.hybridd.proc[processID].step;

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

          next(processID, subprocesses);

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

      next(processID, subprocesses);

    }, 200);

  }
  return 1;

};

var start = function(processID, subprocesses) {

  global.hybridd.proc[processID].step = 0;
  global.hybridd.proc[processID].steps = subprocesses.length - 1;
  global.hybridd.proc[processID].busy = false;
  if (DEBUG) {

    console.log(` [D] (${processID}) initializing sequence processing for ${global.hybridd.proc[processID].steps + 1} steps...`);

  }
  // prepare stepping array
  for (var step = 0; step < subprocesses.length; step += 1) {


    init(`${processID}.${step}`);
    subprocesses[step] = subprocesses[step].replace(`"processID":"${processID}"`, `"processID":"${processID}.${step}"`);
    global.hybridd.proc[`${processID}.${step}`].request = subprocesses[step];

  }
  if(subprocesses.length>0){
    global.hybridd.proc[`${processID}.0`].data = global.hybridd.proc[processID].data;
  }

  next(processID, subprocesses);	// start stepping

};

var fire = function (processID, subprocesses) {

  var result = true;
  if (typeof subprocesses !== "undefined") {

    if (subprocesses.length > -1) {
      var sessionID = 1;

      if (DEBUG) {console.log(` [D] adding ${processID} to processing queue`);}

      if (typeof global.hybridd.proc[processID] !== "undefined" && typeof global.hybridd.proc[processID].sid !== "undefined") {

        sessionID = global.hybridd.proc[processID].sid;

      }

      var data = global.hybridd.proc[processID].data;
      init(processID, {
        sessionID:sessionID,
        subprocesses:subprocesses,
        data:data
      });


      result = false;

    }

  }

  return result;
};



exports.init = init; // initialize a new process
exports.stop = stop; // functionally stop a process
exports.start = start; // functionally stop a process
exports.fire = fire; // queue subprocess steps
