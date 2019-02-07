// proc.js -> handle proc calls
//
// (c)2016 metasync r&d / internet of coins project - Amadeus de Koning / Joachim de Koning
//

// export every function
exports.process = process;

// functions start here

function process (request, xpath) {
  var result = null;
  // DEBUG console.log(' [i] returning proc on request '+JSON.stringify(xpath));
  if (xpath.length === 1) {
    result = proclist(request.sessionID);
  } else if (xpath[1] === 'peek' && request.sessionID === 1) { // only root
    if (xpath.length === 3) {
      result = procdata(xpath[2], request.sessionID, true);
    }
  } else if (xpath[1] === 'queue' && request.sessionID === 1) { // only root
    if (xpath.length === 3) {
      if (typeof global.hybrixd.procqueue[xpath[2]] !== 'undefined') {
        result = {error: 0, data: global.hybrixd.procqueue[xpath[2]]};
      } else {
        result = {error: 1, data: 'The queue item specified does not exist!'};
      }
    } else {
      result = queuelist();
    }
  } else if (xpath[1] === 'kill') {
    result = procKill(xpath[2], request.sessionID);
  } else if (xpath[1] === 'debug') {
    result = procDebug(xpath[2], request.sessionID);
  } else if (xpath[1] === 'pause') {
    if (xpath.length === 3) {
      result = procPause(xpath[2], request.sessionID);
    } else {
      result = procListPaused(request.sessionID);
    }
  } else if (xpath[1] === 'resume') {
    result = procResume(xpath[2], request.sessionID);
  } else {
    result = procdata(xpath[1], request.sessionID);
  }
  if (result.error === 0) {
    result.noCache = true;
  }
  return result;
}

// proc specific functions start here
function queuelist () {
  var qcnt = 0;
  var queue = [];
  for (var key in global.hybrixd.procqueue) {
    queue[qcnt] = key;
    qcnt++;
  }
  return {error: 0, count: qcnt, data: queue};
}

function proclist (sessionID) {
  var proccnt = 0;
  var sproccnt = 0;
  var procs = [];
  for (var key in global.hybrixd.proc) {
    if (key.indexOf('.', 15) === -1) {
      if (sessionID === 1 || sessionID === global.hybrixd.proc[key].sid) {
        procs[proccnt] = key;
        proccnt++;
      }
    } else if (sessionID === 1 || sessionID === global.hybrixd.proc[key.split('.')[0]].sid) {
      sproccnt++;
    }
  }
  return {error: 0, count: proccnt, subprocesses: sproccnt, data: procs};
}

function procdata (processID, sessionID, peek) {
  var result;
  if (typeof global.hybrixd.proc[processID] !== 'undefined' && (sessionID === 1 || sessionID === global.hybrixd.proc[processID.split('.')[0]].sid)) {
    var process = global.hybrixd.proc[processID];
    if (peek) {
      result = process;
    } else {
      var err = process.err;
      var info = (typeof process.info !== 'undefined' ? process.info : 'Process data.');

      result = {error: (err || 0), data: info, id: processID, progress: process.progress, started: process.started, stopped: process.stopped, data: process.data, path: process.path, offset: process.offset, length: process.length, hash: process.hash, type: process.type};
    }
  } else {
    result = {error: 1, data: 'The process specified cannot be accessed!'};
  }
  return result;
}

function procKill (processID, sessionID) {
  if (typeof global.hybrixd.proc[processID] !== 'undefined' && (sessionID === 1 || sessionID === global.hybrixd.proc[processID.split('.')[0]].sid)) {
    // Kill running processes
    for (var pid in global.hybrixd.proc) {
      if (pid.startsWith(processID)) {
        delete global.hybrixd.proc[pid];
      }
    }
    // Kill paused processes
    for (var pid in global.hybrixd.procPaused) {
      if (pid.startsWith(processID)) {
        delete global.hybrixd.proc[pid];
      }
    }

    return {error: 0, data: 'The process and child processes have been been terminated.'};
  } else {
    return {error: 1, data: 'The process specified cannot be accessed.'};
  }
}

function procPause (processID, sessionID) {
  if (typeof global.hybrixd.proc[processID] !== 'undefined' && (sessionID === 1 || sessionID === global.hybrixd.proc[processID.split('.')[0]].sid)) {
    for (var pid in global.hybrixd.proc) {
      if (pid.startsWith(processID)) {
        global.hybrixd.procPaused[pid] = global.hybrixd.proc[pid];
        delete global.hybrixd.proc[pid];
      }
    }
    return {error: 0, data: 'The process and child processes have been been paused.'};
  } else {
    return {error: 1, data: 'The process specified cannot be accessed.'};
  }
}

function procResume (processID, sessionID) {
  if (typeof global.hybrixd.procPaused[processID] !== 'undefined' && (sessionID === 1 || sessionID === global.hybrixd.procPaused[processID.split('.')[0]].sid)) {
    for (var pid in global.hybrixd.proc) {
      if (pid.startsWith(processID)) {
        global.hybrixd.proc[pid] = global.hybrixd.procPaused[pid];
        delete global.hybrixd.procPaused[pid];
      }
    }
    return {error: 0, data: 'The process and child processes have been been resumed.'};
  } else {
    return {error: 1, data: 'The paused process specified cannot be accessed.'};
  }
}

function procListPaused (sessionID) {
  var proccnt = 0;
  var sproccnt = 0;
  var procs = [];
  for (var key in global.hybrixd.procPaused) {
    if (key.indexOf('.', 15) === -1) {
      if (sessionID === 1 || sessionID === global.hybrixd.proc[key].sid) {
        procs[proccnt] = key;
        proccnt++;
      }
    } else if (sessionID === 1 || sessionID === global.hybrixd.proc[key.split('.')[0]].sid) {
      sproccnt++;
    }
  }
  return {error: 0, path: '/proc/paused', count: proccnt, subprocesses: sproccnt, data: procs};
}

function procDebug (procID, sessionID) {
  var data = {};

  for (var pid in global.hybrixd.proc) {
    if (pid === procID || pid.startsWith(procID + '.')) {
      var proc = global.hybrixd.proc[pid];
      data[pid] = {data: proc.data, err: proc.err, progress: proc.progress, qrtz: proc.qrtz, path: proc.path};
    }
  }
  return {error: 0, id: 'proc', data: data};
}
