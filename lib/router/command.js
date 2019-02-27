// proc.js -> handle proc calls
//
// (c)2016 metasync r&d / internet of coins project - Amadeus de Koning / Joachim de Koning
//

// export every function
exports.process = process;

let conf = require('../conf');
let servers = require('../servers');
let recipes = require('../recipes');
let modules = require('../modules');
let scheduler = require('../scheduler');
let functions = require('../functions');
let APIqueue = require('../APIqueue');
let cache = require('../cache');
let fs = require('fs');

const reloadSequences = {
  default: processID => [APIqueue.pause, scheduler.pause, conf.reload, recipes.init, modules.init, scheduler.resume, APIqueue.resume, scheduler.finish(processID, 'Reload succesfully')],
  conf: processID => [conf.reload, scheduler.finish(processID, 'Configuration reloaded succesfully.')],
  modules: processID => [APIqueue.pause, scheduler.pause, modules.init, scheduler.resume, APIqueue.resume, scheduler.finish(processID, 'Modules reloaded succesfully.')],
  recipes: processID => [APIqueue.pause, scheduler.pause, recipes.init, modules.init, scheduler.resume, APIqueue.resume, scheduler.finish(processID, 'Recipes reloaded succesfully.')]
};

// functions start here
function process (request, xpath) {
  const isRoot = request.sessionID !== 1; // only root

  return isRoot
    ? {error: 1, data: 'Insufficient permissions.'}
    : startSpecifiedCommandOrError(request, xpath);
}

function startSpecifiedCommandOrError (request, xpath) {
  const isCommandSpecified = xpath.length === 1;
  const process = xpath[1];

  return isCommandSpecified
    ? {error: 1, data: 'No command specified.'}
    : getProcessResult(process, request, xpath);
}

function getProcessResult (process, request, xpath) {
  if (process === 'apiqueue') {
    return commandAPIqueue(xpath);
  } else if (process === 'cache') {
    return commandCache(xpath);
  } else if (process === 'exec') {
    return commandExec(xpath);
  } else if (process === 'reload') {
    return commandReload(xpath);
  } else if (process === 'restart' && request.sessionID === 1) {
    return {error: 1, data: 'NOT YET IMPLEMENTED!'};// TODO
  } else if (process === 'scheduler') {
    return commandScheduler(xpath);
  } else if (process === 'stop') {
    //  process.exit();
  } else if (process === 'endpoint') {
    return commandEndpoint(xpath);
  } else {
    return {error: 1, data: "The command specified '" + xpath[1] + "'does not exist!"};
  }
}

// command specific functions start here

/// ////////
// CACHE //
/// ////////

function commandCache (xpath) {
  const isClear = xpath[2] === 'clear';

  if (isClear) {
    cache.clear();
    return {error: 0, data: 'Cache cleared.'};
  } else {
    return {error: 1, data: 'Unknown cache command.'};
  }
}

/// //////////
// EXECUTE //
/// //////////

function commandExec (xpath) {
  let filePath = '../' + xpath.slice(2).join('/');

  // check if file exists
  return fs.existsSync(filePath)
    ? retrieveSchedulerResult(filePath, xpath)
    : {error: 1, data: 'File ' + filePath + ' not found.'};
}

// TODO: Probably split the concerns here.
function retrieveSchedulerResult (filePath, xpath) {
  let recipe;
  try {
    recipe = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (e) {
    return {error: 1, data: 'Error parsing JSON: ' + e + 'Faulty recipe.'};
  }

  let processID = scheduler.init(0, {sessionID: 1, path: xpath, recipe, command: xpath.slice(2)});
  // TODO check if quartz module exists
  modules.module.quartz.main.exec({command: ['main'], target: recipe, processID});
  return scheduler.result(processID, xpath.join('/'));
}

/// /////////
// RELOAD //
/// /////////

function commandReload (xpath) {
  const cmd = xpath[2];
  const reloadAll = xpath.length === 2;
  const cmdHasReloadSequences = Object.keys(reloadSequences).includes(cmd);

  if (reloadAll) { // Reload everything
    return reloadAllOrSingleProcess('/', null, 'default', xpath);
  } else if (cmdHasReloadSequences) {
    return reloadAllOrSingleProcess(`/${cmd}`, cmd, cmd, xpath);
  } else if (cmd === 'sessions') {
    // TODO
  } else {
    return {error: 1, data: 'Unknown reload command.'};
  }
}

function reloadAllOrSingleProcess (path, cmd, sequence, xpath) {
  const allOrSingleProcess = cmd === null ? ['reload'] : ['reload', cmd];
  const processID = getProcessID(xpath, allOrSingleProcess);
  const seq = reloadSequences[sequence](processID);
  return reloadProcess(xpath, path, seq, processID);
}

function getProcessID (command, path) {
  return scheduler.init(0, {sessionID: 1, path, command});
}

function reloadProcess (xpath, cmd, seq, processID) {
  const path = `command/reload${cmd}`;
  scheduler.fire(processID, ['wait()']);
  functions.sequential(seq);
  return scheduler.result(processID, path);
}

/// ////////////
// SCHEDULER //
/// ////////////

function commandScheduler (xpath) {
  const defaultStatus = {error: 0};
  const result = Object.assign(defaultStatus, checkSchedulerArguments(xpath));

  if (result.hasOwnProperty('cmd')) scheduler[result.cmd]();

  return result;
}

function checkSchedulerArguments (xpath) {
  const cmd = xpath[2];
  const hasNotEnoughArguments = xpath.length === 2; // TODO: description is correct?

  return hasNotEnoughArguments
    ? {error: 1, data: 'Specify command for scheduler.'}
    : getStatus(cmd, 'scheduler', 'scheduler');
}

/// ////////////
// API Queue //
/// ////////////

function commandAPIqueue (xpath) {
  const defaultStatus = {error: 0};
  const result = Object.assign(defaultStatus, checkAPIqueueArguments(xpath));

  if (result.hasOwnProperty('cmd')) APIqueue[result.cmd]();

  return result;
}

function checkAPIqueueArguments (xpath) {
  const cmd = xpath[2];
  const hasNotEnoughArguments = xpath.length === 2; // TODO: description is correct?

  return hasNotEnoughArguments
    ? {error: 1, data: 'Specify command for API Queue.'}
    : getStatus(cmd, 'API Queue', 'APIqueue');
}

function commandEndpoint (xpath) {
  return xpath.length === 2
    ? mkEndpointData()
    : checkServerStatus(xpath);
}

function mkEndpointData () {
  let data = {};
  for (let server in global.hybrixd.endpoints) {
    data[server] = global.hybrixd.endpoints[server].entryPoint;
  }
  return {error: 0, data};
}

function checkServerStatus (xpath) {
  let protocol = xpath[2];
  let hostname = xpath[3];
  let url = protocol + '//' + hostname;

  return !global.hybrixd.endpoints.hasOwnProperty(url)
    ? {error: 1, data: 'Unknown endpoint: ' + url}
    : getServerStatusAndMaybeExecuteCmd(url, xpath[4]);
}

function getServerStatusAndMaybeExecuteCmd (url, xpath) {
  const server = global.hybrixd.endpoints[url];
  const serverStatus = getServerStatus(server, xpath);

  if (serverStatus.hasOwnProperty('cmd')) servers[serverStatus.cmd](server)();

  return serverStatus;
}

function getServerStatus (server, cmd) {
  switch (cmd) {
    case 'close':
      if (servers.status(server)) {
        return {error: 0, data: 'Closing endpoint ' + server.endpoint + '...', cmd: 'close'};
      } else {
        return {error: 0, data: 'Endpoint already closed.'};
      }
    case 'status':
      return {error: 0, data: 'Endpoint is ' + servers.status(server) + '...'};
    case 'open':
      if (!servers.status(server)) {
        return {error: 0, data: 'Opening endpoint ' + server.endpoint + '...', cmd: 'open'};
      } else {
        return {error: 0, data: 'Endpoint already opened.'};
      }
  }
}

function getStatus (cmd, process, process_) {
  const processWithCapital = capitalizeFirstLetter(process);
  const processInterval = `${process_}Interval`;
  const processInitiated = `${process_}Initiated`;

  if (cmd === 'pause') {
    return global.hybrixd[processInterval]
      ? {data: `${processWithCapital} paused.`, cmd: 'pause'}
      : {data: `${processWithCapital} already paused.`};
  } else if (cmd === 'resume') {
    return global.hybrixd[processInterval]
      ? {data: `${processWithCapital} already running.`}
      : {data: `${processWithCapital} resumed.`, cmd: 'resume'};
  } else if (cmd === 'status') {
    // TODO: This always defaults to 'else' in Scheduler. since 'global.hybrixd.schedulerInterval' is undefined, even when scheduler has just resumed...
    if (global.hybrixd[processInterval]) {
      return global.hybrixd[processInitiated]
        ? {data: `${processWithCapital} is running.`}
        : {data: `${processWithCapital} is starting up.`};
    } else {
      return {data: `${processWithCapital} is paused.`};
    }
  } else {
    return {error: 1, data: `Unknown ${process} command.`};
  }
}

// TODO: Make into library function
function capitalizeFirstLetter (s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
