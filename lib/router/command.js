// proc.js -> handle proc calls
//
// (c)2016 metasync r&d / internet of coins project - Amadeus de Koning / Joachim de Koning
//

// export every function
exports.process = process;

var conf = require('../conf');
var servers = require('../servers');
var recipes = require('../recipes');
var modules = require('../modules');
var scheduler = require('../scheduler');
var functions = require('../functions');
var APIqueue = require('../APIqueue');
var cache = require('../cache');
var fs = require('fs');

// functions start here
function process (request, xpath) {
  var result = null;
  if (request.sessionID !== 1) { // only root
    return {error: 1, id: 'command', data: 'Insufficient permissions.'};
  }
  if (xpath.length === 1) {
    result = {error: 1, id: 'command', data: 'No command specified.'};
  } else if (xpath[1] === 'apiqueue') {
    result = commandAPIqueue(xpath);
  } else if (xpath[1] === 'cache') {
    result = commandCache(xpath);
  } else if (xpath[1] === 'exec') {
    result = commandExec(xpath);
  } else if (xpath[1] === 'reload') {
    result = commandReload(xpath);
  } else if (xpath[1] === 'restart' && request.sessionID === 1) {
    result = {error: 1, id: 'command/restart', data: 'NOT YET IMPLEMENTED!'};// TODO
  } else if (xpath[1] === 'scheduler') {
    result = commandScheduler(xpath);
  } else if (xpath[1] === 'stop') {
  //  process.exit();
  } else if (xpath[1] === 'userinterface') {
    result = commandUserInterface(xpath);
  } else if (xpath[1] === 'restinterface') {
    result = commandRestInterface(xpath);
  } else {
    result = {error: 1, id: 'command/', data: "The command specified '" + xpath[1] + "'does not exist!"};
  }
  return result;
}

// command specific functions start here

function commandCache (xpath) {
  if (xpath[2] === 'clear') {
    cache.clear();
    return {error: 0, id: 'command/cache/clear', data: 'Cache cleared.'};
  } else {
    return {error: 1, id: 'command/cache', data: 'Unknown cache command.'};
  }
}

function commandExec (xpath) {
  var filePath = '../' + xpath.slice(2).join('/');

  if (fs.existsSync(filePath)) { //  check if file exists
    var recipe;
    try {
      recipe = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch (e) {
      return {error: 1, id: 'command/exec', data: 'Error parsing JSON: ' + e + 'Faulty recipe.'};
    }
    var processID = scheduler.init(0, {sessionID: 1, path: xpath, recipe: recipe, command: xpath.slice(2)});
    // TODO check if quartz module exists
    modules.module.quartz.main.exec({command: ['main'], target: recipe, processID: processID});
    return scheduler.result(processID, xpath.join('/'));
  } else {
    return {error: 1, id: 'command/exec', data: 'File ' + filePath + ' not found.'};
  }
}

function commandReload (xpath) {
  var result;
  var processID;
  if (xpath.length === 2) { // Reload everything
    processID = scheduler.init(0, {sessionID: 1, path: xpath, command: ['reload']});
    scheduler.fire(processID, ['wait()']);
    functions.sequential([APIqueue.pause, scheduler.pause, conf.reload, recipes.init, modules.init, scheduler.resume, APIqueue.resume, scheduler.finish(processID, 'Reload succesfully')]);
    result = scheduler.result(processID, 'command/reload');
  } else if (xpath[2] === 'conf') {
    processID = scheduler.init(0, {sessionID: 1, path: xpath, command: ['reload', 'conf']});
    scheduler.fire(processID, ['wait()']);
    functions.sequential([conf.reload, scheduler.finish(processID, 'Configuration reloaded succesfully.')]);
    result = scheduler.result(processID, 'command/reload/conf');
  } else if (xpath[2] === 'modules') {
    processID = scheduler.init(0, {sessionID: 1, path: xpath, command: ['reload', 'modules']});
    scheduler.fire(processID, ['wait()']);
    functions.sequential([APIqueue.pause, scheduler.pause, modules.init, scheduler.resume, APIqueue.resume, scheduler.finish(processID, 'Modules reloaded succesfully.')]);
    result = scheduler.result(processID, 'command/reload/modules');
  } else if (xpath[2] === 'recipes') {
    processID = scheduler.init(0, {sessionID: 1, path: xpath, command: ['reload', 'recipes']});
    scheduler.fire(processID, ['wait()']);
    functions.sequential([APIqueue.pause, scheduler.pause, recipes.init, modules.init, scheduler.resume, APIqueue.resume, scheduler.finish(processID, 'Recipes reloaded succesfully.')]);
    result = scheduler.result(processID, 'command/reload/recipes');
  } else if (xpath[2] === 'sessions') {
    // TODO
  } else {
    result = {error: 1, id: 'command/reload', data: 'Unknown reload command.'};
  }
  return result;
}

function commandScheduler (xpath) {
  var result;
  if (xpath.length === 2) {
    result = {error: 1, id: 'command/scheduler', data: 'Specify command for scheduler.'};
  } else if (xpath[2] === 'pause') {
    if (global.hybrixd.schedulerInterval) {
      scheduler.pause();
      result = {error: 0, id: 'command/scheduler/pause', data: 'Scheduler paused.'};
    } else {
      result = {error: 0, id: 'command/scheduler/pause', data: 'Scheduler already paused.'};
    }
  } else if (xpath[2] === 'resume') {
    if (global.hybrixd.schedulerInterval) {
      result = {error: 0, id: 'command/scheduler/resume', data: 'Scheduler already running.'};
    } else {
      scheduler.resume();
      result = {error: 0, id: 'command/scheduler/resume', data: 'Scheduler resumed.'};
    }
  } else if (xpath[2] === 'status') {
    if (global.hybrixd.schedulerInterval) {
      if (global.hybrixd.schedulerInitiated) {
        result = {error: 0, id: 'command/scheduler/status', data: 'Scheduler is running.'};
      } else {
        result = {error: 0, id: 'command/scheduler/status', data: 'Scheduler is starting up.'};
      }
    } else {
      result = {error: 0, id: 'command/scheduler/status', data: 'Scheduler is paused.'};
    }
  } else {
    result = {error: 1, id: 'command/scheduler', data: 'Unknown scheduler command.'};
  }
  return result;
}

function commandAPIqueue (xpath) {
  var result;
  if (xpath.length === 2) {
    result = {error: 1, id: 'command/apiqueue', data: 'Specify command for API Queue.'};
  } else if (xpath[2] === 'pause') {
    if (global.hybrixd.APIqueueInterval) {
      APIqueue.pause();
      result = {error: 0, id: 'command/apiqueue/pause', data: 'API Queue paused.'};
    } else {
      result = {error: 0, id: 'command/apiqueue/pause', data: 'API Queue already paused.'};
    }
  } else if (xpath[2] === 'resume') {
    if (global.hybrixd.APIqueueInterval) {
      result = {error: 0, id: 'command/apiqueue/resume', data: 'API Queue already running.'};
    } else {
      APIqueue.resume();
      result = {error: 0, id: 'command/apiqueue/resume', data: 'API Queue resumed.'};
    }
  } else if (xpath[2] === 'status') {
    if (global.hybrixd.APIqueueInterval) {
      if (global.hybrixd.APIqueueInitiated) {
        result = {error: 0, id: 'command/apiqueue/status', data: 'API Queue is running.'};
      } else {
        result = {error: 0, id: 'command/apiqueue/status', data: 'API Queue is starting up.'};
      }
    } else {
      result = {error: 0, id: 'command/apiqueue/status', data: 'API Queue is paused.'};
    }
  } else {
    result = {error: 1, id: 'command/apiqueue', data: 'Unknown API Queue command.'};
  }
  return result;
}

function commandUserInterface (xpath) {
  var result;
  var userinterface = typeof global.hybrixd.userinterface !== 'undefined' ? global.hybrixd.userinterface : 'enabled';

  if (xpath.length === 2) {
    result = {error: 1, id: 'command/userinterface', data: 'Specify command for User Interface.'};
  } else if (xpath[2] === 'close') {
    if (userinterface === 'disabled') {
      result = {error: 1, id: 'command/userinterface/close', data: 'User Interface is disabled.'};
    } else if (global.hybrixd.uiServer) {
      if (global.hybrixd.uiServer.listening) {
        servers.public.close();
        result = {error: 0, id: 'command/userinterface/close', data: 'Closing User Interface...'};
      } else {
        result = {error: 0, id: 'command/userinterface/close', data: 'User Interface already closed.'};
      }
    } else {
      result = {error: 1, id: 'command/userinterface/close', data: 'User Interface not running.'};
    }
  } else if (xpath[2] === 'listen') {
    if (userinterface === 'disabled') {
      result = {error: 1, id: 'command/userinterface/listen', data: 'User Interface is disabled.'};
    } else if (global.hybrixd.uiServer) {
      if (global.hybrixd.uiServer.listening) {
        result = {error: 0, id: 'command/userinterface/listen', data: `User Interface is already listening on: http://${global.hybrixd.userbind}:${global.hybrixd.userport}`};
      } else {
        servers.public.listen();
        result = {error: 0, id: 'command/userinterface/listen', data: `User Interface resumed listening on: http://${global.hybrixd.userbind}:${global.hybrixd.userport}`};
      }
    } else {
      result = {error: 1, id: 'command/userinterface/listen', data: 'User Interface not running.'};
    }
  } else if (xpath[2] === 'status') {
    if (userinterface === 'disabled') {
      result = {error: 0, id: 'command/userinterface/status', data: 'User Interface is disabled.'};
    } else if (global.hybrixd.uiServer) {
      if (global.hybrixd.uiServer.listening) {
        result = {error: 0, id: 'command/userinterface/status', data: `User Interface is running on: http://${global.hybrixd.userbind}:${global.hybrixd.userport}`};
      } else {
        result = {error: 0, id: 'command/userinterface/status', data: 'User Interface is closed.'};
      }
    } else {
      result = {error: 0, id: 'command/userinterface/status', data: 'User Interface is not running.'};
    }
  } else {
    result = {error: 1, id: 'command/userinterface', data: 'Unknown User Interface command.'};
  }
  return result;
}

function commandRestInterface (xpath) {
  var result;
  var restinterface = typeof global.hybrixd.restinterface !== 'undefined' ? global.hybrixd.restinterface : 'enabled';

  if (xpath.length === 2) {
    result = {error: 1, id: 'command/restinterface', data: 'Specify command for Rest Interface.'};
  } else if (xpath[2] === 'close') {
    if (restinterface === 'disabled') {
      result = {error: 1, id: 'command/restinterface/close', data: 'Rest Interface is disabled.'};
    } else if (global.hybrixd.restServer) {
      if (global.hybrixd.restServer.listening) {
        servers.local.close();
        result = {error: 0, id: 'command/restinterface/close', data: 'Closing Rest Interface...'};
      } else {
        result = {error: 0, id: 'command/restinterface/close', data: 'Rest Interface already closed.'};
      }
    } else {
      result = {error: 1, id: 'command/restinterface/close', data: 'Rest Interface not running.'};
    }
  } else if (xpath[2] === 'listen') {
    if (restinterface === 'disabled') {
      result = {error: 1, id: 'command/restinterface/listen', data: 'Rest Interface is disabled.'};
    } else if (global.hybrixd.restServer) {
      if (global.hybrixd.restServer.listening) {
        result = {error: 0, id: 'command/restinterface/listen', data: `Rest Interface is already listening on: http://${global.hybrixd.restbind}:${global.hybrixd.restport}`};
      } else {
        servers.local.listen();
        result = {error: 0, id: 'command/restinterface/listen', data: `Rest Interface resumed listening on: http://${global.hybrixd.restbind}:${global.hybrixd.restport}`};
      }
    } else {
      result = {error: 1, id: 'command/restinterface/listen', infodata: 'Rest Interface not running.'};
    }
  } else if (xpath[2] === 'status') {
    if (restinterface === 'disabled') {
      result = {error: 0, id: 'command/restinterface/status', data: 'Rest Interface is disabled.'};
    } else if (global.hybrixd.restServer) {
      if (global.hybrixd.restServer.listening) {
        result = {error: 0, id: 'command/restinterface/status', data: `Rest Interface is running on: http://${global.hybrixd.restbind}:${global.hybrixd.restport}`};
      } else {
        result = {error: 0, id: 'command/restinterface/status', data: 'Rest Interface is closed.'};
      }
    } else {
      result = {error: 0, id: 'command/restinterface/status', data: 'Rest Interface is not running.'};
    }
  } else {
    result = {error: 1, id: 'command/restinterface', data: 'Unknown Rest Interface command.'};
  }
  return result;
}
