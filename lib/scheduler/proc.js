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

function setProperties (properties, labels, sessionID, processID) {
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
  return properties;
}

function init (processID, properties) {
  let sessionID = 0; // default to no session
  if (!properties) { properties = {}; } // this should not be the case
  let labels = {};
  const properties_ = setProperties(properties, labels, sessionID, processID);

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
  let process = {
    busy: false,
    step: null,
    steps: null,
    subproc: null,
    progress: 0,
    autoprog: true,
    timeout: null,
    started: Date.now(),
    stopped: null,
    sid: sessionID,
    labels: labels,
    hook: null, // determines on failure behaviour (for process errors and API queue time outs)
    timeHook: null, // determines on failure behaviour (for process time outs)
    vars: {} // variables used by quartz.poke and quartz.peek
  };

  //  process.offset : Does not need to be defined here but can be set by wchan
  //  process.length : Does not need to be defined here but can be set by wchan
  //  process.hash : Does not need to be defined here but can be set by wchan
  //  process.type : Does not need to be defined here but can be set for wchan

  const processes = ['data', 'path', 'command', 'recipe'];

  processes.forEach(setProcess(process, processID, properties_));

  global.hybrixd.proc[processID] = process;
  return processID;
}

function setProcess (globalProcess, processID, properties) {
  return function (process_) {
    if (properties.hasOwnProperty(process_)) {
      globalProcess[process_] = properties[process_];
    } else if (global.hybrixd.proc.hasOwnProperty(processID) && global.hybrixd.proc[processID].hasOwnProperty(process_)) {
      globalProcess[process_] = global.hybrixd.proc[processID][process_]; // if there's already data in the process keep it there
    } else {
      globalProcess[process_] = null;
    }
  };
}

// if a process is killed but it has a hook then it will cause a break to the "bubble up" of the error
function kill (processID, data, now, err) {
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
}

function stop (processID, err, data) {
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
}

function pass (processStepID, err, data) {
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
}

// set the mime type for the data
function mime (processID, newType) {
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
}

// set the type for the data
function help (processID, newHelp) {
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
}

function error (processID, info) {
  stop(processID, 1, info);
}

function dataAndErrorFromPrevSubProcess (process, prevSubprocess) {
  let data = null;
  let err = null;

  if (typeof prevSubprocess !== 'undefined') {
    err = typeof prevSubprocess.err !== 'undefined' ? prevSubprocess.err : 0;
    data = typeof prevSubprocess.data !== 'undefined' ? prevSubprocess.data : null;
  } else {
    err = process.hasOwnProperty('err') ? process.err : 0;
    data = process.hasOwnProperty('data') ? process.data : null;
  }

  return {
    err,
    data
  };
}

function updateProcess (process, processID, subprocess, step, data, err) {
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
  return process;
}

function next (processID) {
  if (!global.hybrixd.proc.hasOwnProperty(processID)) { return false; } // indicate that the process was already stopped / is not valid

  let process = global.hybrixd.proc[processID];

  if (process.stopped) { return false; } // indicate that the process was already stopped / is not valid

  let step = typeof process.step === 'undefined' ? 0 : process.step;

  let subprocessID = `${processID}.${step}`;
  let subprocess = global.hybrixd.proc[subprocessID];

  let prevSubprocessID = process.subproc;
  let prevSubprocess = global.hybrixd.proc[prevSubprocessID];

  if (!global.hybrixd.proc.hasOwnProperty(subprocessID)) { return false; } // indicate that the process was already stopped / is not valid

  const data = dataAndErrorFromPrevSubProcess(process, prevSubprocess).data;
  const err = dataAndErrorFromPrevSubProcess(process, prevSubprocess).err;

  // wait for subprocess step to finish
  if (process.busy === true) { //  || global.hybrixd.proc[processID].step < step
    process = updateProcess(process, processID, subprocess, step, data, err);
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

    const statement = subprocess.qrtz;
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
          parsedStatement.parameters.unshift(procInsert); // Set this argument to null, pass process
          try {
            quartz[parsedStatement.head].apply(quartz, parsedStatement.parameters); // head(p,param1,param2,...)
          } catch (result) {
            return logAndError(data, processID, ` [!] (${processID}) proc error: \n    ${statement}\n     ${result || 'UNKNOWN ERROR!'}`);
          }
        } else {
          return logAndError(data, processID, ` [!] (${processID}) Quartz does not have function "` + parsedStatement.head + '"');
        }
      } else {
        return logAndError(data, processID, ` [!] (${processID}) parsing error: \n     ${statement}\n     ` + parsedStatement.error);
      }
    } else {
      return logAndError(data, processID, ` [!] (${processID}) parsing error: \n     Process seems empty!\n     `);
    }
  }
  return true; // indicate that the process has been updated
}

function logAndError (data, processID, errorStr) {
  console.log(errorStr);
  error(processID, 'Proc error.', data);
  return false;
}

function start (processID, subprocesses) {
  let process = Object.assign(global.hybrixd.proc[processID], {
    step: 0,
    steps: subprocesses.length - 1,
    busy: false
  });

  if (DEBUG) { console.log(` [D] (${processID}) initializing sequence processing for ${process.steps + 1} steps...`); }
  // prepare stepping array
  for (let step = 0; step < subprocesses.length; step += 1) {
    let subprocessID = `${processID}.${step}`;

    init(subprocessID);
    subprocesses[step] = subprocesses[step].replace(`"processID":"${processID}"`, `"processID":"${subprocessID}"`);
    global.hybrixd.proc[subprocessID].qrtz = subprocesses[step]; // Set the quartz code for the subprocess
  }

  subprocesses.length > 0
    ? global.hybrixd.proc[`${processID}.0`].data = process.data
    : stop(processID, 0, process.data);
}

function fire (processID, subprocesses) {
  if (typeof subprocesses !== 'undefined' && subprocesses.length > -1) {
    const process = global.hybrixd.proc[processID];
    const sessionID = typeof process !== 'undefined' && typeof process.sid !== 'undefined'
      ? process.sid
      : 0; // if no session ID is provided then use 0 = least access

    //  if (global.hybrixd.proc.hasOwnProperty(processID)) {  // TODO check if process exists
    if (DEBUG) console.log(` [D] adding ${processID} to processing queue with ${subprocesses.length} steps.`);

    init(processID, {
      sessionID: sessionID,
      subprocesses: subprocesses,
      data: process.data
    });
  }
}

function finish (processId, data) {
  return function (cbArr) {
    require('./scheduler').stop(this.processId, 0, this.data);
    require('../functions').sequential(cbArr);
  }.bind({processId, data});
}

function resultMessage (processID) {
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
}

exports.init = init; // initialize a new process
exports.stop = stop; // functionally stop a process and all its subprocesses
exports.mime = mime; // set the type of the process data
exports.help = help; // set the type of the process data
exports.pass = pass; // pass data to to a process step
exports.start = start; // starts a process (moves it from queue to active processes)
exports.fire = fire; // adds a process to the queue
exports.next = next; // performs an update of the process
exports.error = error; // functionally stop a process with an error info message
exports.finish = finish; // creates a callback function that stops this process when finished
exports.result = resultMessage; // creates an API result message, a follow-up
