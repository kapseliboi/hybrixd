//
// hybrixd - proc.js
// Main processing engine and scheduler

/* global DEBUG : true */
/* eslint no-new-func: "off" */
let parse = require('./parse');
let Quartz = require('./quartz');
let quartz = new Quartz.Quartz();

/*
  properties
  - sessionID   The sessionID, 0 = no session, 1 = root
  - data        The data with which the process is initialized (passed from parent, or POST API call)
  - path        The full path used to execute the command for example : /asset/dummy/balance/_dummyaddress_ (in array form)
  - command     The command part of the path for example : balance/_dummyaddress_ (in array form)
  - recipe      The recipe of the associate asset, source, engine for example the JSON content of asset.dummy.json
  - qrtz        The qrtz code for this step.

  - subprocesses (only from fire)
*/

/*
  TODO reorder properties,processID  =>  sessionID, path, command, recipe, [data], [processId]

  processID is only used by fire and quartz.fork
  spread out properties as seperate variables to underline importance
*/
let init = function init (processID, properties) {
  let sessionID = 0; // default to no session
  if (!properties) { properties = {}; } // this should not be the case
  let labels = {};
  if (typeof properties !== 'undefined') {
    if (typeof properties.sessionID !== 'undefined') {
      sessionID = properties.sessionID;
    }

    if (typeof properties.subprocesses !== 'undefined') {
      for (let i = 0; i < properties.subprocesses.length;) { // parse labels and remove comments
        let subprocess = properties.subprocesses[i];
        if (subprocess.trim().startsWith('@')) { // define labels
          labels[subprocess.substr(1)] = i;
          properties.subprocesses.splice(i, 1);
        } else if (subprocess.trim().startsWith('#')) { // remove comments
          properties.subprocesses.splice(i, 1);
        } else {
          ++i;
        }
      }

      global.hybrixd.procqueue[processID] = properties.subprocesses;
    }
  }
  if (processID === 0) { // create a new process
    let suffix = `000${Math.random() * 999}`.slice(-3);
    processID = Date.now() + suffix.toString();
  } else if (processID.endsWith('.')) {
    let requestPID;
    for (let i = 0; i < 1000; ++i) {
      requestPID = processID + i;
      if (!global.hybrixd.proc.hasOwnProperty(requestPID)) {
        break;
      }
    }
    processID = requestPID;
  } else if (global.hybrixd.proc.hasOwnProperty(processID) && global.hybrixd.proc[processID].hasOwnProperty('data') && global.hybrixd.proc[processID].stopped) {
    return processID; // Process was already initialized and stopped, so do not restart it again
  }
  // initialize process variables
  let process = {};
  process.busy = false;
  process.step = null;
  process.steps = null;
  process.subproc = null;
  process.progress = 0;
  process.autoprog = true;
  process.timeout = null;
  process.started = Date.now();
  process.stopped = null;
  process.sid = sessionID;
  process.labels = labels;
  process.hook = null; // determines on failure behaviour (for process errors and API queue time outs)
  process.timeHook = null; // determines on failure behaviour (for process time outs)
  process.vars = {}; // variables used by quartz.poke and quartz.peek

  //  process.offset : Does not need to be defined here but can be set by wchan
  //  process.length : Does not need to be defined here but can be set by wchan
  //  process.hash : Does not need to be defined here but can be set by wchan
  //  process.type : Does not need to be defined here but can be set for wchan

  if (properties.hasOwnProperty('data')) {
    process.data = properties.data;
  } else if (global.hybrixd.proc.hasOwnProperty(processID) && global.hybrixd.proc[processID].hasOwnProperty('data')) {
    process.data = global.hybrixd.proc[processID].data; // if there's already data in the process keep it there
  } else {
    process.data = null;
  }

  if (properties.hasOwnProperty('path')) {
    process.path = properties.path;
  } else if (global.hybrixd.proc.hasOwnProperty(processID) && global.hybrixd.proc[processID].hasOwnProperty('path')) {
    process.path = global.hybrixd.proc[processID].path; // if there's already data in the process keep it there
  } else {
    process.path = null;
  }

  if (properties.hasOwnProperty('command')) {
    process.command = properties.command;
  } else if (global.hybrixd.proc.hasOwnProperty(processID) && global.hybrixd.proc[processID].hasOwnProperty('command')) {
    process.command = global.hybrixd.proc[processID].command; // if there's already data in the process keep it there
  } else {
    process.command = null;
  }

  if (properties.hasOwnProperty('recipe')) {
    process.recipe = properties.recipe;
  } else if (global.hybrixd.proc.hasOwnProperty(processID) && global.hybrixd.proc[processID].hasOwnProperty('recipe')) {
    process.recipe = global.hybrixd.proc[processID].recipe; // if there's already data in the process keep it there
  } else {
    process.recipe = null;
  }

  global.hybrixd.proc[processID] = process;
  return processID;
};

// if a process is killed but it has a hook then it will cause a break to the "bubble up" of the error
let kill = function (processID, data, now, err) {
  if (processID && global.hybrixd.proc.hasOwnProperty(processID)) {
    let process = global.hybrixd.proc[processID];

    if (process.stopped === null) {
      process.busy = false;
      process.stopped = now;
      process.data = data;

      if (err && process.hook) {
        if (process.hook.hasOwnProperty('jump')) { // on error jump to the specified process
          // reset process

          if (process.hook.jump > process.steps) { // if the jump jumps beyon end of program, then set the error
            process.step = process.hook.jump;
            err = 1;
            data = 'hook: illegal out of bounds jump.';
          } else if (process.hook.jump === process.step - 1) {
            process.step = process.hook.jump;
            err = 1;
            data = 'hook: illegal zero jump.';
          } else if (process.hook.jump < 0) {
            process.step = process.hook.jump;
            err = 1;
            data = 'hook: illegal negative jump.';
          } else {
            process.busy = false;
            process.stopped = null;
            process.progress = 0;
            process.step = process.hook.jump;
            // find the process step to jump to
            let processStepID = processID + '.' + process.step;
            if (global.hybrixd.proc.hasOwnProperty(processStepID)) {
              let processStep = global.hybrixd.proc[processStepID];
              // reset the process step
              processStep.busy = false;
              processStep.stopped = null;
              processStep.progress = 0;
              processStep.err = 0;
            }
            return {break: true}; // break the bubbeling up
          }
          process.data = data;
        } else if (process.hook.hasOwnProperty('data')) { // on error stop the process with the provided data/messsage and error code
          if (process.hook.err) {
            process.data = process.hook.data;
            err = process.hook.err;
            data = process.hook.data;
          } else {
            delete process.type; // remove process type, we won't be using this.
            process.data = process.hook.data;
            process.progress = 1;
            return {break: true}; // break the bubbeling up
          }
        }
      }
      if (err) {
        process.err = err; // do not set progress, keep this as debug info
      } else {
        process.progress = 1;
        process.err = 0;
      }
    }
  }
  return {break: false, data: data};
};
let stop = function (processID, err, data) {
  let processIDSplit = processID.split('.');
  let now = Date.now();
  if (err) { // on error stop all parent processes and process steps
    if (processIDSplit.length % 2 === 1) { // processID is a process, seek it's active step so it can be stopped
      if (global.hybrixd.proc.hasOwnProperty(processID)) {
        const processStepID = processID + '.' + global.hybrixd.proc[processID].step;
        let k = kill(processStepID, data, now, err);
        if (k.break) { return; }
        data = k.data;
      }
    }
    for (let i = processIDSplit.length - 1; i >= 0; --i) {
      const parentID = processIDSplit.slice(0, i + 1).join('.');
      let k = kill(parentID, data, now, err);
      if (k.break) { return; }
      data = k.data;
    }
  } else {
    let processStepID;
    if (processIDSplit.length % 2 === 0) { // processID is a processStepID
      processStepID = processID;
      processID = processIDSplit.slice(0, processIDSplit.length - 1).join('.');
    } else { // processID is a process, seek it's active step so it can be stopped
      if (global.hybrixd.proc.hasOwnProperty(processID)) {
        processStepID = processID + '.' + global.hybrixd.proc[processID].step;
      }
    }
    kill(processID, data, now);
    kill(processStepID, data, now);
  }
};

let pass = function (processStepID, err, data) {
  if (processStepID && global.hybrixd.proc.hasOwnProperty(processStepID)) {
    let processStep = global.hybrixd.proc[processStepID];
    if (processStep.stopped === null) {
      processStep.busy = false;
      processStep.stopped = Date.now();
      processStep.data = data;
      processStep.progress = 1;
      processStep.err = typeof err === 'undefined' ? 1 : err;
    }
  }
};

// set the type for the data
let type = function (processID, newType) {
  let processStepID;
  let processIDSplit = processID.split('.');
  if (processIDSplit.length % 2 === 0) { // processID is a processStepID
    processStepID = processID;
    processID = processIDSplit.slice(0, processIDSplit.length - 1).join('.');
  }
  if (global.hybrixd.proc.hasOwnProperty(processID)) {
    let process = global.hybrixd.proc[processID];
    process.type = newType;
  }
  if (global.hybrixd.proc.hasOwnProperty(processStepID)) {
    let processStep = global.hybrixd.proc[processStepID];
    processStep.type = newType;
  }
};

// set the type for the data
let help = function (processID, newHelp) {
  let processStepID;
  let processIDSplit = processID.split('.');
  if (processIDSplit.length % 2 === 0) { // processID is a processStepID
    processStepID = processID;
    processID = processIDSplit.slice(0, processIDSplit.length - 1).join('.');
  }
  if (global.hybrixd.proc.hasOwnProperty(processID)) {
    let process = global.hybrixd.proc[processID];
    process.help = newHelp;
  }
  if (global.hybrixd.proc.hasOwnProperty(processStepID)) {
    let processStep = global.hybrixd.proc[processStepID];
    processStep.help = newHelp;
  }
};

let error = function (processID, info) {
  stop(processID, 1, info);
};

let next = function (processID) {
  if (!global.hybrixd.proc.hasOwnProperty(processID)) { return false; } // indicate that the process was already stopped / is not valid

  let process = global.hybrixd.proc[processID];

  if (process.stopped) { return false; } // indicate that the process was already stopped / is not valid

  let step = typeof process.step === 'undefined' ? 0 : process.step;

  let subprocessID = `${processID}.${step}`;
  let subprocess = global.hybrixd.proc[subprocessID];

  let prevSubprocessID = process.subproc;
  let prevSubprocess = global.hybrixd.proc[prevSubprocessID];

  if (!global.hybrixd.proc.hasOwnProperty(subprocessID)) { return false; } // indicate that the process was already stopped / is not valid

  let data = null;
  let err = null;

  if (typeof prevSubprocess !== 'undefined') {
    err = typeof prevSubprocess.err !== 'undefined' ? prevSubprocess.err : 0;
    data = typeof prevSubprocess.data !== 'undefined' ? prevSubprocess.data : null;
  } else {
    err = process.hasOwnProperty('err') ? process.err : 0;
    data = process.hasOwnProperty('data') ? process.data : null;
  }

  // wait for subprocess step to finish
  if (process.busy === true) { //  || global.hybrixd.proc[processID].step < step
    // check if the subprocess is already finished
    if (subprocess.progress === 1) { // && global.hybrixd.proc[processID].progress < 1
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
        stop(processID, err, data);
      }
    } else if (process.autoprog === true) {
      if (process.steps > 0) {
        process.progress = (process.step / process.steps) + (subprocess.progress / process.steps);
      }
    }

    // initialize subprocess step
  } else if (process.busy !== true && process.stopped === null && process.step <= process.steps) {
    process.busy = true;

    global.hybrixd.proc[subprocessID].data = data;

    if (DEBUG) { console.log(` [D] (${processID}) running step ${step + 1} of ${process.steps + 1}`); }

    let processIDSplit = processID.split('.');
    let rootProcessID = processIDSplit[0];
    let rootProcess = global.hybrixd.proc[rootProcessID];
    let parentVars;
    if (processIDSplit.length > 2) {
      let parentProcessID = processIDSplit.slice(0, processIDSplit.length - 2).join('.');
      parentVars = global.hybrixd.proc[parentProcessID].vars;
    }

    let statement = subprocess.qrtz;
    if (statement) {
      let parsedStatement = parse.parseLine(statement, process.labels, step, processID, rootProcess.recipe, process.command || rootProcess.command, data, process.vars, parentVars);
      if (!parsedStatement.hasOwnProperty('error')) {
        if (quartz.hasOwnProperty(parsedStatement.head)) {
          // set previous ID step to current subprocess ID
          process.subproc = subprocessID;
          // fire off the subprocess
          let procInsert = {
            'parentID': processID,
            'processID': `${processID}.${step}`
          };
          parsedStatement.parameters.unshift(procInsert); // Set  this argument to null, pass process
          try {
            quartz[parsedStatement.head].apply(quartz, parsedStatement.parameters); // head(p,param1,param2,...)
          } catch (result) {
            console.log(` [!] (${processID}) proc error: \n    ${statement}\n     ${result || 'UNKNOWN ERROR!'}`);
            error(processID, 'Proc error.', data);
            return false;
          }
        } else {
          console.log(` [!] (${processID}) Quartz does not have function "` + parsedStatement.head + '"');
          error(processID, 'Proc error.', data);
        }
      } else {
        console.log(` [!] (${processID}) parsing error: \n     ${statement}\n     ` + parsedStatement.error);
        error(processID, 'Proc error.', data);
        return false;
      }
    } else {
      console.log(` [!] (${processID}) parsing error: \n     Process seems empty!\n     `);
      error(processID, 'Proc error.', data);
      return false;
    }
  }
  return true; // indicate that the process has been updated
};

let start = function (processID, subprocesses) {
  let process = global.hybrixd.proc[processID];

  process.step = 0;
  process.steps = subprocesses.length - 1;
  process.busy = false;

  if (DEBUG) { console.log(` [D] (${processID}) initializing sequence processing for ${process.steps + 1} steps...`); }
  // prepare stepping array
  for (let step = 0; step < subprocesses.length; step += 1) {
    let subprocessID = `${processID}.${step}`;

    init(subprocessID);
    subprocesses[step] = subprocesses[step].replace(`"processID":"${processID}"`, `"processID":"${subprocessID}"`);
    global.hybrixd.proc[subprocessID].qrtz = subprocesses[step]; // Set the quartz code for the subprocess
  }
  if (subprocesses.length > 0) {
    let firstSubprocessID = `${processID}.0`;
    global.hybrixd.proc[firstSubprocessID].data = process.data;
  } else {
    stop(processID, 0, process.data);
  }
};

let fire = function (processID, subprocesses) {
  if (typeof subprocesses !== 'undefined') {
    if (subprocesses.length > -1) {
      let sessionID = 0; // if no session ID is provided then use 0 = least access
      //  if (global.hybrixd.proc.hasOwnProperty(processID)) {  // TODO check if process exists

      let process = global.hybrixd.proc[processID];

      if (DEBUG) {
        console.log(` [D] adding ${processID} to processing queue with ${subprocesses.length} steps.`);
      }

      if (typeof process !== 'undefined' && typeof process.sid !== 'undefined') {
        sessionID = process.sid;
      }

      let data = process.data;
      init(processID, {
        sessionID: sessionID,
        subprocesses: subprocesses,
        data: data
      });
    }
  }
};

let finish = function (processId, data) {
  return function (callbackArray) {
    require('../scheduler').stop(this.processId, 0, this.data);
    require('../functions').sequential(callbackArray);
  }.bind({processId, data});
};

let resultMessage = function (processID) {
  if (global.hybrixd.proc.hasOwnProperty(processID)) {
    let process = global.hybrixd.proc[processID];
    let path = process.path ? process.path.join('/') : undefined;
    return {
      'error': 0,
      'id': 'id',
      'path': path,
      'data': processID
    };
  } else {
    return {
      'error': 1,
      'data': 'Command process ID not found.'
    };
  }
};

exports.init = init; // initialize a new process
exports.stop = stop; // functionally stop a process and all its subprocesses
exports.type = type; // set the type of the process data
exports.help = help; // set the type of the process data
exports.pass = pass; // pass data to to a process step
exports.start = start; // starts a process (moves it from queue to active processes)
exports.fire = fire; // adds a process to the queue
exports.next = next; // performs an update of the process
exports.error = error; // functionally stop a process with an error info message
exports.finish = finish; // creates a callback function that stops this process when finished
exports.result = resultMessage; // creates an API result message, a follow-up
