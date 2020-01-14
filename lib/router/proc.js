// proc.js -> handle proc calls
//
// (c)2016 metasync r&d / internet of coins project - Amadeus de Koning / Joachim de Koning
//

const scheduler = require('../scheduler/scheduler');

const ROOT_SESSION_ID = 1;

function process (request, xpath) {
  const sessionID = request.sessionID;
  const processArgument = xpath[1];
  const sndArgument = xpath[2];
  let result = null;

  // DEBUG console.log(' [i] returning proc on request '+JSON.stringify(xpath));
  if (xpath.length === 1) {
    result = procList(sessionID);
  } else if (processArgument === 'peek' && sessionID === ROOT_SESSION_ID) { // only root
    if (xpath.length === 3) {
      result = procData(sndArgument, sessionID, true);
    }
  } else if (processArgument === 'queue' && sessionID === ROOT_SESSION_ID) { // only root
    result = getQueuedProcessOrList(sndArgument, xpath);
  } else if (processArgument === 'kill') {
    result = procKill(sndArgument, sessionID);
  } else if (processArgument === 'debug') {
    result = procDebug(sndArgument);
  } else if (processArgument === 'exec') {
    result = procExec(xpath, request.data);
  } else if (processArgument === 'pause') {
    result = pauseProcess(sndArgument, processArgument, sessionID, xpath);
  } else if (processArgument === 'resume') {
    result = procPauseOrResume(processArgument, sndArgument, sessionID);
  } else {
    result = procData(processArgument, sessionID);
  }
  if (result.error === 0) {
    result.noCache = true;
  }
  return result;
}

function getQueuedProcessOrList (a, xpath) {
  return xpath.length === 3
    ? getQueuedProcess(a)
    : queueList();
}

function pauseProcess (sndArgument, processArgument, sessionID, xpath) {
  return xpath.length === 3
    ? procPauseOrResume(processArgument, sndArgument, sessionID)
    : procListPaused(sessionID);
}

function getQueuedProcess (a) {
  const sndArgumentIsValid = typeof global.hybrixd.procqueue[a] !== 'undefined';
  return sndArgumentIsValid
    ? {error: 0, data: global.hybrixd.procqueue[a]}
    : {error: 404, data: 'The queue item specified does not exist!'};
}

// proc specific functions start here
function queueList () {
  const queue = Object.keys(global.hybrixd.procqueue);

  return {error: 0, data: queue};
}

function procList (sessionID) {
  const procs = Object.keys(global.hybrixd.proc)
    .reduce(mkProcessList(sessionID), []);

  return {error: 0, data: procs};
}

function mkProcessList (sessionID) {
  return function (acc, key) {
    const hasCorrectSessionID = sessionID === ROOT_SESSION_ID || sessionID === global.hybrixd.proc[key].sessionID;

    return hasCorrectSessionID
      ? acc.concat(key)
      : acc;
  };
}

function procData (processID, sessionID, peek) {
  const processExists = global.hybrixd.proc.hasOwnProperty(processID);
  const process = global.hybrixd.proc[processID];

  const hasCorrectSessionID = process && (sessionID === ROOT_SESSION_ID || sessionID === process.sessionID);
  return processExists && hasCorrectSessionID
    ? peekedOrDefaultData(global.hybrixd.proc, processID, peek)
    : {error: 404, data: 'Process ' + processID + ' cannot be accessed!'};
}

function peekedOrDefaultData (processes, processID, peek) {
  let process = processes[processID];
  return peek
    ? process
    : getDefaultProcessData(process, processID);
}

function getDefaultProcessData (process, processID) {
  return {
    error: (process.err || 0),
    data: process.data,
    help: process.help,
    id: processID,
    timeout: process.timeout,
    progress: process.progress,
    started: process.started,
    stopped: process.stopped,
    path: process.path,
    offset: process.offset,
    length: process.length,
    hash: process.hash,
    type: process.type
  };
}

function procKill (processID, sessionID) {
  const processes = global.hybrixd.proc;

  if (typeof global.hybrixd.proc[processID] !== 'undefined' && (sessionID === ROOT_SESSION_ID || sessionID === global.hybrixd.proc[processID.split('.')[0]].sessionID)) {
    killProcessIfExists(processes, processID, 'proc'); // Kill running processes
    killProcessIfExists(processes, processID, 'procPaused'); // Kill paused processes

    return {error: 0, data: 'The process and child processes have been been terminated.'};
  } else {
    return {error: 404, data: 'The process specified cannot be accessed.'};
  }
}

function killProcessIfExists (ps, processID, status) {
  for (let pid in global.hybrixd[status]) {
    const processExists = pid.startsWith(processID);
    if (processExists) {
      delete ps[pid];
    }
  }
}

function procPauseOrResume (action, processID, sessionID) {
  const processStatus = action === 'resume' ? global.hybrixd.procPaused : global.hybrixd.proc;
  const processStatusInverted = action === 'resume' ? global.hybrixd.proc : global.hybrixd.procPaused;
  const resumedOrPausedStr = action === 'resume' ? 'resumed' : 'paused';
  const resumedOrPausedProcessStr = action === 'resume' ? 'paused ' : '';

  if (typeof processStatus[processID] !== 'undefined' && (sessionID === ROOT_SESSION_ID || sessionID === processStatus[processID.split('.')[0]].sessionID)) {
    for (let pid in global.hybrixd.proc) {
      if (pid.startsWith(processID)) {
        processStatusInverted[pid] = processStatus[pid];
        delete processStatus[pid];
      }
    }
    return {error: 0, data: `The process and child processes have been been ${resumedOrPausedStr}.`};
  } else {
    return {error: 404, data: `The ${resumedOrPausedProcessStr}process specified cannot be accessed.`};
  }
}

function procListPaused (sessionID) {
  const data = Object.keys(global.hybrixd.procPaused)
    .reduce(getPausedProcesses(sessionID), []);

  return {error: 0, data};
}

function getPausedProcesses (sessionID) {
  return function (procs, processID) {
    const isRootSession = sessionID === ROOT_SESSION_ID;
    const isNotASubprocess = processID.indexOf('.', 15) === -1;
    const hasCorrectSessionID = isRootSession || sessionID === global.hybrixd.proc[processID].sessionID;

    return isNotASubprocess && hasCorrectSessionID
      ? procs.concat(processID)
      : procs;
  };
}

function procDebug (procID) {
  if (procID === 'debug.js') {
    return {error: 0, data: 'lib/router/debug/debug.js', type: 'file:text/javascript'};
  } else if (typeof procID === 'undefined') {
    return {error: 0, data: 'lib/router/debug/debug.html', type: 'file:text/html'};
  } else if (global.hybrixd.proc.hasOwnProperty(procID)) {
    const process = global.hybrixd.proc[procID];

    const data = Object.keys(global.hybrixd.proc)
      .reduce(assignProcessData(procID), {});
    return {error: 0, data, progress: process.progress, started: process.started, stopped: process.stopped};
  } else {
    return {error: 404, data: 'Process not found.'};
  }
}

function procExec (xpath, data) {
  if (typeof data === 'string') {
    let steps;
    let recipe;
    let command;
    if (data.startsWith('{')) {
      try {
        recipe = JSON.parse(data);
        if (recipe.hasOwnProperty('quartz')) {
          const func = xpath[2];
          if (recipe.quartz.hasOwnProperty(func)) {
            command = xpath.slice(2);
            steps = recipe.quartz[func];
          } else if (recipe.quartz.hasOwnProperty('main')) {
            command = ['main'].concat(xpath.slice(2));
            steps = recipe.quartz['main'];
          } else {
            return {error: 1, data: 'Function "' + func + '" or "main" is not available.'};
          }
        } else {
          return {error: 400, data: 'Missing quartz code in recipe.'};
        }
      } catch (e) {
        return {error: 400, data: 'Failed to parse JSON.'};
      }
    } else {
      command = ['main'].concat(xpath.slice(2));
      recipe = {};
      steps = data.split('\n').filter(x => x !== '');
    }

    const processId = scheduler.init(0, {
      sessionID: 1,
      recipe,
      path: xpath,
      command
    });
    if (steps.length > 0) {
      const lastStep = steps[steps.length - 1];
      if (!lastStep.startsWith('done') && !lastStep.startsWith('fail') && !lastStep.startsWith('stop')) {
        steps.push('done');
      }
      scheduler.fire(processId, steps);
      return {error: 0, id: 'id', data: processId};
    } else {
      return {error: 0, data: null};
    }
  } else {
    return {error: 400, data: 'Expects qrtz script.'};
  }
}

function assignProcessData (processID) {
  return function (acc, pid) {
    if (pid === processID || pid.startsWith(processID + '.')) {
      const process = global.hybrixd.proc[pid];
      acc[pid] = {data: process.data, err: process.err, labels: process.labels, progress: process.progress, qrtz: process.qrtz, path: process.path, started: process.started, stopped: process.stopped};
    }

    return acc;
  };
}

exports.process = process;
