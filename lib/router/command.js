// proc.js -> handle proc calls
//
// (c)2016 metasync r&d / internet of coins project - Amadeus de Koning / Joachim de Koning
//

// export every function
exports.process = processRequest;

let conf = require('../conf/conf');
let servers = require('../servers/servers');
let recipes = require('../recipes');
let modules = require('../modules');
let scheduler = require('../scheduler/scheduler');
let sequential = require('../util/sequential');
let APIqueue = require('../APIqueue/APIqueue');
let cache = require('../cache');
let fs = require('fs');

// functions start here
function processRequest (request, xpath) {
  let result = null;
  if (request.sessionID !== 1) { // only root
    return {error: 403, data: 'Insufficient permissions.'};
  } else if (xpath.length === 1) {
    result = {error: 400, data: 'No command specified.'};
  } else if (xpath[1] === 'apiqueue') {
    result = commandAPIqueue(xpath);
  } else if (xpath[1] === 'cache') {
    result = commandCache(xpath);
  } else if (xpath[1] === 'conf') {
    result = commandConf(xpath);
  } else if (xpath[1] === 'exec') {
    result = commandExec(xpath);
  } else if (xpath[1] === 'reload') {
    result = commandReload(xpath);
  } else if (xpath[1] === 'restart') {
    result = {error: 500, data: 'NOT YET IMPLEMENTED!'};// TODO
  } else if (xpath[1] === 'scheduler') {
    result = commandScheduler(xpath);
  } else if (xpath[1] === 'stop') {
    sequential.next([
      APIqueue.pause,
      cache.pause,
      scheduler.pause,
      servers.closeAll,
      scheduler.stopAll,
      () => { process.exitCode = 0; }
    ]);
    result = {error: 0, data: 'Stopping Hybrixd...'};
  } else if (xpath[1] === 'endpoint') {
    result = commandEndpoint(xpath);
  } else {
    result = {error: 400, data: "The command specified '" + xpath[1] + "'does not exist!"};
  }
  return result;
}

// command specific functions start here

function commandCache (xpath) {
  if (xpath[2] === 'clear') {
    cache.clear();
    return {error: 0, data: 'Cache cleared.'};
  } else {
    return {error: 400, data: 'Unknown cache command.'};
  }
}

function commandConf (xpath) {
  if (xpath[2] === 'get') {
    return {error: 0, data: conf.get(xpath[3])};
  } else if (xpath[2] === 'list') {
    return {error: 0, data: conf.list(xpath[3])};
  } else if (xpath[2] === 'set') {
    const changed = conf.set(xpath[3], xpath[4]);
    return {error: 0, data: xpath[3] + ' ' + (changed ? 'unchanged' : 'updated')};
  } else {
    return {error: 400, data: 'Unknown conf command.'};
  }
}

function commandExec (xpath) {
  let filePath = '../' + xpath.slice(2).join('/');

  if (fs.existsSync(filePath)) { //  check if file exists
    let recipe;
    try {
      recipe = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch (e) {
      return {error: 400, data: 'Error parsing JSON: ' + e + 'Faulty recipe.'};
    }
    let processID = scheduler.init(0, {sessionID: 1, path: xpath, recipe: recipe, command: xpath.slice(2)});
    // TODO check if quartz module exists
    modules.module.quartz.main.exec({command: ['main'], target: recipe, processID: processID});
    return scheduler.result(processID, xpath.join('/'));
  } else {
    return {error: 404, data: 'File ' + filePath + ' not found.'};
  }
}

function commandReload (xpath) {
  let result;
  let processID;
  if (xpath.length === 2) { // Reload everything
    processID = scheduler.init(0, {sessionID: 1, path: xpath, command: ['reload']});
    scheduler.fire(processID, ['wait()']);
    sequential.next([APIqueue.pause, scheduler.pause, conf.reload, recipes.init, modules.init, scheduler.resume, APIqueue.resume, scheduler.finish(processID, 'Reload successfully')]);
    result = scheduler.result(processID, 'command/reload');
  } else if (xpath[2] === 'conf') {
    processID = scheduler.init(0, {sessionID: 1, path: xpath, command: ['reload', 'conf']});
    scheduler.fire(processID, ['wait()']);
    sequential.next([conf.reload, scheduler.finish(processID, 'Configuration reloaded successfully.')]);
    result = scheduler.result(processID, 'command/reload/conf');
  } else if (xpath[2] === 'modules') {
    processID = scheduler.init(0, {sessionID: 1, path: xpath, command: ['reload', 'modules']});
    scheduler.fire(processID, ['wait()']);
    sequential.next([APIqueue.pause, scheduler.pause, modules.init, scheduler.resume, APIqueue.resume, scheduler.finish(processID, 'Modules reloaded successfully.')]);
    result = scheduler.result(processID, 'command/reload/modules');
  } else if (xpath[2] === 'recipes') {
    processID = scheduler.init(0, {sessionID: 1, path: xpath, command: ['reload', 'recipes']});
    scheduler.fire(processID, ['wait()']);
    sequential.next([APIqueue.pause, scheduler.pause, recipes.init, modules.init, scheduler.resume, APIqueue.resume, scheduler.finish(processID, 'Recipes reloaded succesfully.')]);
    result = scheduler.result(processID, 'command/reload/recipes');
  } else if (xpath[2] === 'sessions') {
    // TODO
  } else {
    result = {error: 400, data: 'Unknown reload command.'};
  }
  return result;
}

function commandScheduler (xpath) {
  let result;
  if (xpath.length === 2) {
    result = {error: 400, data: 'Specify command for scheduler.'};
  } else if (xpath[2] === 'pause') {
    if (scheduler.isRunning()) {
      scheduler.pause();
      result = {error: 0, data: 'Scheduler paused.'};
    } else {
      result = {error: 0, data: 'Scheduler already paused.'};
    }
  } else if (xpath[2] === 'resume') {
    if (scheduler.isRunning()) {
      result = {error: 0, data: 'Scheduler already running.'};
    } else {
      scheduler.resume();
      result = {error: 0, data: 'Scheduler resumed.'};
    }
  } else if (xpath[2] === 'status') {
    if (scheduler.isRunning()) {
      if (scheduler.isReady()) {
        result = {error: 0, data: 'Scheduler is running.'};
      } else {
        result = {error: 0, data: 'Scheduler is starting up.'};
      }
    } else {
      result = {error: 0, data: 'Scheduler is paused.'};
    }
  } else {
    result = {error: 400, data: 'Unknown scheduler command.'};
  }
  return result;
}

function commandAPIqueue (xpath) {
  let result;
  if (xpath.length === 2) {
    result = {error: 400, data: 'Specify command for API Queue.'};
  } else if (xpath[2] === 'pause') {
    if (APIqueue.isRunning()) {
      APIqueue.pause();
      result = {error: 0, data: 'API Queue paused.'};
    } else {
      result = {error: 0, data: 'API Queue already paused.'};
    }
  } else if (xpath[2] === 'resume') {
    if (APIqueue.isRunning()) {
      result = {error: 0, data: 'API Queue already running.'};
    } else {
      APIqueue.resume();
      result = {error: 0, data: 'API Queue resumed.'};
    }
  } else if (xpath[2] === 'status') {
    if (APIqueue.isRunning()) {
      if (APIqueue.isReady()) {
        result = {error: 0, data: 'API Queue is running.'};
      } else {
        result = {error: 0, data: 'API Queue is starting up.'};
      }
    } else {
      result = {error: 0, data: 'API Queue is paused.'};
    }
  } else if (xpath.length === 4 && xpath[2] === 'test' && (xpath[3] === 'start' || xpath[3] === 'force')) {
    APIqueue.testStart(xpath[3] === 'force');
    result = {error: 0, data: 'API Queue in test mode.'};
  } else if (xpath.length === 4 && xpath[2] === 'test' && xpath[3] === 'start') {
    APIqueue.testStop();
    result = {error: 0, data: 'API Queue in test mode.'};
  } else if (xpath.length === 4 && xpath[2] === 'test' && xpath[3] === 'status') {
    if (APIqueue.isTesting()) {
      result = {error: 0, data: 'API Queue is in test mode.'};
    } else {
      result = {error: 0, data: 'API Queue is not in test mode.'};
    }
  } else {
    result = {error: 400, data: 'Unknown API Queue command.'};
  }
  return result;
}

function commandEndpoint (xpath) {
  if (xpath.length === 2) {
    return {error: 0, data: servers.list()};
  }
  if (xpath[2] === 'close') {
    servers.closeAll();
    return {error: 0, data: 'All endpoints closed.'};
  } else {
    const protocol = xpath[2];
    const hostname = xpath[3];
    const endpoint = protocol + '//' + hostname;
    if (!servers.exists(endpoint)) {
      return {error: 404, data: 'Unknown endpoint: ' + endpoint};
    } else {
      switch (xpath[4]) {
        case 'close':
          if (servers.status(endpoint)()) {
            servers.close(endpoint)();
            return {error: 0, data: 'Closing endpoint ' + endpoint + '...'};
          } else {
            return {error: 0, data: 'Endpoint ' + endpoint + ' already closed.'};
          }
        case 'status':
          return {error: 0, data: 'Endpoint ' + endpoint + ' is ' + (servers.status(endpoint)() ? 'open' : 'closed') + '.'};
        case 'open':
          if (!servers.status(endpoint)()) {
            servers.open(endpoint)();
            return {error: 0, data: 'Opening endpoint ' + endpoint + '...'};
          } else {
            return {error: 0, data: 'Endpoint' + endpoint + '  already openend.'};
          }
      }
    }
  }
}
