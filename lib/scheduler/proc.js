//
// hybridd - proc.js
// Main processing engine and scheduler

/* global DEBUG : true*/
/* eslint no-new-func: "off"*/


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
  var process = {} ;
  process.step = null;
  process.steps = null;
  process.subproc = null;
  process.progress = 0;
  process.autoprog = true;
  process.timeout = null;
  process.started = Date.now();
  process.stopped = null;
  process.request = null;

  if(properties && properties.hasOwnProperty("data")){
    process.data = properties.data;

  }else if(global.hybridd.proc.hasOwnProperty(processID) && global.hybridd.proc[processID].hasOwnProperty("data")){
    // if there's already data in the process keep it there
  }else{
    process.data = null;
  }

  // root parent only
  if (processID.indexOf(".", 15) === -1) {

    process.sid = sessionID;
    process.vars = {};

  }
  global.hybridd.proc[processID] = process;
  return processID;
};

var stop = function(processID, properties) {
  if (typeof properties === "undefined") {

    properties = {};

  }
  if(!global.hybridd.proc.hasOwnProperty(processID)){

    if (DEBUG) {console.log(` [D] process ${processID} no longer exists, or cannot be stopped`);}

  }else{
    var  process = global.hybridd.proc[processID];

    if (process.stopped === null) {

      process.err = typeof properties.err === "undefined"
        ? 0
        : properties.err;
      process.data = typeof properties.data === "undefined"
        ? null
        : properties.data;
      if(process.err === 0 ){
        process.progress = 1; // only set progress when without error, else keep progress info as error indication
      }
      process.stopped = Date.now();

    } else {

      if (DEBUG) {console.log(` [D] (${processID}) process was already stopped`);}

    }
  }
};

var evaluate = function evaluate (runprocess, p, err, data) {
  return ( new Function("p", "err", "data",
                        `${global.hybridd.quartz}
    ${runprocess}`
                       ) )(p, err, data);
};

var next = function(processID) {

  if(!global.hybridd.proc.hasOwnProperty(processID)){return false;} //indicate that the process was already stopped / is not valid

  var  process = global.hybridd.proc[processID];

  if(process.stopped){return false;} //indicate that the process was already stopped / is not valid

  var step = typeof process.step === 'undefined'?0:process.step;

  var subprocessID = `${processID}.${step}`;
  var subprocess = global.hybridd.proc[subprocessID];

  var prevSubprocessID = process.subproc;
  var prevSubprocess = global.hybridd.proc[prevSubprocessID];

  if(!global.hybridd.proc.hasOwnProperty(subprocessID)){return false;}  //indicate that the process was already stopped / is not valid

  // wait for subprocess step to finish
  if (process.busy === true) { //  || global.hybridd.proc[processID].step < step

    // check if the subprocess is already finished
    if (subprocess.progress === 1) { // && global.hybridd.proc[processID].progress < 1

      if (DEBUG) {

        console.log(` [D] (${processID}) finished step ${step + 1} of ${process.steps + 1}`);

      }
      if (process.autoprog === true) {

        process.progress = process.step / process.steps;

      }
      process.busy = false;
      // set time process has stopped
      if (process.progress === 1) {

        process.stopped = Date.now();

      } else {

        process.step++;

      }
      // if all steps have been done, stop to pass data to parent process
      if (step === process.steps) {

        var data = null;
        var err = null;
        if (typeof prevSubprocess !== "undefined") {

          err = prevSubprocess.err === "undefined" ? 1 : prevSubprocess.err;
          data = prevSubprocess.data === "undefined" ? null : prevSubprocess.data;
        }else{
          err = process.hasOwnProperty("err")?process.err: 1;
          data = process.hasOwnProperty("data")?process.data:null;

        }
        var p = {
          "parentID": processID,
          "processID": `${processID}.${step}`
        };
        stop(processID,{err,data});

      }

    } else if (process.autoprog === true) {

      if (subprocess.steps > 0) {

        process.progress = (process.step - 1) / process.steps + 1 / process.steps * subprocess.progress;

      }

    }

    // initialize subprocess step

  } else if (process.busy !== true && process.stopped === null && process.step <= process.steps) {

    process.busy = true;

    if (DEBUG) {console.log(` [D] (${processID}) running step ${step + 1} of ${process.steps + 1}`);}

    var data = null;
    var err = null;

    if (typeof prevSubprocess !== "undefined") {

      err = typeof prevSubprocess.err !== "undefined" ? prevSubprocess.err : 1;
      data = typeof prevSubprocess.data !== "undefined" ? prevSubprocess.data : null;

    }else{
      err = process.hasOwnProperty("err")?process.err : 1;
      data = process.hasOwnProperty("data")?process.data:null;
    }

    // if base command is used, insert extra properties
    var subinsert = `{parentID:"${processID}",processID:"${subprocessID}"}`;
    var runprocess = subprocess.request.replace(/peek\(/g, `peek(${subinsert},`); // .replace(/json\(/g,'json('+subinsert+',');

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
    ].indexOf(subprocess.request.substr(0, 4)) > -1) {

      runprocess = `${runprocess.slice(0, 5) + subinsert},${runprocess.slice(5)}`;

    }else{
      console.log(' [!] Unknown Quartz command: "'+subprocess.request.substr(0, 4)+'"');
      stop(processID,{err:1,data});
    }
    // set previous ID step to current subprocess ID
    process.subproc = subprocessID;
    // fire off the subprocess
    try {

      evaluate(runprocess, p, err, data);

    } catch (result) {

      console.log(` [!] (${processID}) proc error: \n     ${runprocess}\n     ${result ? result : "UNKNOWN ERROR!"}`);
      stop(processID,{err:1,data});

    }
  }
  return true; //indicate that the process has been updated
};

var start = function(processID, subprocesses) {

  var process = global.hybridd.proc[processID];

  process.step = 0;
  process.steps = subprocesses.length - 1;
  process.busy = false;

  if (DEBUG) {console.log(` [D] (${processID}) initializing sequence processing for ${process.steps + 1} steps...`);}
  // prepare stepping array
  for (var step = 0; step < subprocesses.length; step += 1) {
    var subprocessID = `${processID}.${step}`;

    init(subprocessID);
    subprocesses[step] = subprocesses[step].replace(`"processID":"${processID}"`, `"processID":"${subprocessID}"`);
    global.hybridd.proc[subprocessID].request = subprocesses[step];

  }
  if(subprocesses.length>0){
    var firstSubprocessID = `${processID}.0`;
    global.hybridd.proc[firstSubprocessID].data = process.data;
  }
};

var fire = function (processID, subprocesses) {

  if (typeof subprocesses !== "undefined") {

    if (subprocesses.length > -1) {
      var sessionID = 1;
      var process = global.hybridd.proc[processID];

      if (DEBUG) {console.log(` [D] adding ${processID} to processing queue`);}

      if (typeof process !== "undefined" && typeof process.sid !== "undefined") {

        sessionID = process.sid;

      }

      var data = process.data;
      init(processID, {
        sessionID:sessionID,
        subprocesses:subprocesses,
        data:data
      });
    }
  }
};

exports.init = init;   // initialize a new process
exports.stop = stop;   // functionally stop a process
exports.start = start; // starts a process (moves it from queue to active processes)
exports.fire = fire;   // adds a process to the queue
exports.next = next;   // performs an update of the process
