// proc.js -> handle proc calls
//
// (c)2016 metasync r&d / internet of coins project - Amadeus de Koning / Joachim de Koning
//

const recipes = require('../recipes');
const qrtzProcess = require('../scheduler/process');

const ROOT_SESSION_ID = 1;

function process (request, xpath) {
  const sessionID = request.sessionID;
  const processArgument = xpath[1];
  const sndArgument = xpath[2];
  let result = null;

  if (xpath.length === 1) {
    result = procList(sessionID);
  } else if (processArgument === 'peek' && sessionID === ROOT_SESSION_ID) { // only root
    if (xpath.length === 3) {
      result = procData(sndArgument, sessionID, true);
    }
  } else if (processArgument === 'queue' && sessionID === ROOT_SESSION_ID) { // TODO
  } else if (processArgument === 'kill') { // TODO
  } else if (processArgument === 'debug') { // TODO
    result = procDebug(sndArgument, sessionID);
  } else if (processArgument === 'exec') {
    result = procExec(xpath, request.data);
  } else if (processArgument === 'pause') { // TODO
  } else if (processArgument === 'resume') { // TODO
  } else {
    result = procData(processArgument, sessionID);
  }
  if (result.error === 0) {
    result.noCache = true;
  }
  return result;
}

function procList (sessionID) {
  const data = qrtzProcess.getProcessList(sessionID);
  return {error: 0, data};
}

function procData (processID, sessionID) {
  return qrtzProcess.getInfo(processID, sessionID);
}

function procDebug (processID, sessionID) {
  if (processID === 'debug.js') {
    return {error: 0, data: 'lib/router/debug/debug.js', mime: 'file:text/javascript'};
  } else if (typeof processID === 'undefined') {
    return {error: 0, data: 'lib/router/debug/debug.html', mime: 'file:text/html'};
  } else {
    return qrtzProcess.getDebug(processID, sessionID);
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

        const id = recipe.id || recipe.asset || recipe.engine || recipe.source || 'customQrtzExec' + Math.floor(1 + Math.random() * 1000);
        recipe = recipes.handleImport(recipe, [], id);

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
    if (steps.length > 0) {
      try {
        return qrtzProcess.create({
          steps,
          sessionID: 1,
          recipe,
          path: xpath,
          command
        });
      } catch (e) {
        return {error: 400, data: e.toString()};
      }
    } else {
      return {error: 0, data: null};
    }
  } else {
    return {error: 400, data: 'Expects qrtz script.'};
  }
}

/* function procKill (processID, sessionID) {
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
} */
exports.process = process;
