// proc.js -> handle proc calls
//
// (c)2016 metasync r&d / internet of coins project - Amadeus de Koning / Joachim de Koning
//
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
    : {error: 1, data: 'The queue item specified does not exist!'};
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
    const hasCorrectSessionID = sessionID === ROOT_SESSION_ID || sessionID === global.hybrixd.proc[key].sid;

    return hasCorrectSessionID
      ? acc.concat(key)
      : acc;
  };
}

function procData (processID, sessionID, peek) {
  const processExists = global.hybrixd.proc.hasOwnProperty(processID);
  const process = global.hybrixd.proc[processID];

  const hasCorrectSessionID = sessionID === ROOT_SESSION_ID || sessionID === process.sid;
  return processExists && hasCorrectSessionID
    ? peekedOrDefaultData(global.hybrixd.proc, processID, peek)
    : {error: 1, data: 'The process specified cannot be accessed!'};
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

  if (typeof global.hybrixd.proc[processID] !== 'undefined' && (sessionID === ROOT_SESSION_ID || sessionID === global.hybrixd.proc[processID.split('.')[0]].sid)) {
    killProcessIfExists(processes, processID, 'proc'); // Kill running processes
    killProcessIfExists(processes, processID, 'procPaused'); // Kill paused processes

    return {error: 0, data: 'The process and child processes have been been terminated.'};
  } else {
    return {error: 1, data: 'The process specified cannot be accessed.'};
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

  if (typeof processStatus[processID] !== 'undefined' && (sessionID === ROOT_SESSION_ID || sessionID === processStatus[processID.split('.')[0]].sid)) {
    for (let pid in global.hybrixd.proc) {
      if (pid.startsWith(processID)) {
        processStatusInverted[pid] = processStatus[pid];
        delete processStatus[pid];
      }
    }
    return {error: 0, data: `The process and child processes have been been ${resumedOrPausedStr}.`};
  } else {
    return {error: 1, data: `The ${resumedOrPausedProcessStr}process specified cannot be accessed.`};
  }
}

function procListPaused (sessionID) {
  const data = Object.keys(global.hybrixd.procPaused)
    .reduce(getPausedProcesses(sessionID), []);

  return {error: 0, path: '/proc/paused', data};
}

function getPausedProcesses (sessionID) {
  return function (procs, processID) {
    const isRootSession = sessionID === ROOT_SESSION_ID;
    const isNotASubprocess = processID.indexOf('.', 15) === -1;
    const hasCorrectSessionID = isRootSession || sessionID === global.hybrixd.proc[processID].sid;

    return isNotASubprocess && hasCorrectSessionID
      ? procs.concat(processID)
      : procs;
  };
}

function procDebug (procID) {
  const data = Object.keys(global.hybrixd.proc)
    .reduce(assignProcessData(procID), {});

  return {error: 0, data};
}

function assignProcessData (processID) {
  return function (acc, pid) {
    if (pid === processID || pid.startsWith(processID + '.')) {
      let process = global.hybrixd.proc[pid];
      acc[pid] = {data: process.data, err: process.err, progress: process.progress, qrtz: process.qrtz, path: process.path};
    }

    return acc;
  };
}

exports.process = process;
