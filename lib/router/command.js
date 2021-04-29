// proc.js -> handle proc calls
//
// (c)2016 metasync r&d / internet of coins project - Amadeus de Koning / Joachim de Koning
//

// export every function
exports.process = processRequest;

const conf = require('../conf/conf');
const servers = require('../servers/servers');
const recipes = require('../recipes');
const modules = require('../modules');
const scheduler = require('../scheduler/scheduler');
const sequential = require('../util/sequential');
const APIqueue = require('../APIqueue/APIqueue');
const cache = require('../cache');
const DJB2 = require('../../common/crypto/hashDJB2'); // fast DJB2 hashing

const fs = require('fs');

const qrtzProcess = require('../scheduler/process');

// functions start here
function processRequest (request, xpath) {
  let result = null;
  if (request.sessionID !== 1) return {error: 403, data: 'Insufficient permissions.'};// only root
  else if (xpath.length === 1) result = {error: 400, data: 'No command specified.'};
  else if (xpath[1] === 'apiqueue') result = commandAPIqueue(xpath);
  else if (xpath[1] === 'cache') result = commandCache(xpath);
  else if (xpath[1] === 'conf') result = commandConf(xpath);
  else if (xpath[1] === 'exec') result = commandExec(xpath);
  else if (xpath[1] === 'reload') result = commandReload(xpath);
  else if (xpath[1] === 'restart') result = commandStop(xpath);
  else if (xpath[1] === 'events') result = commandEvents(xpath);
  else if (xpath[1] === 'scheduler') result = commandScheduler(xpath);
  else if (xpath[1] === 'start') result = {error: 400, data: 'hybrixd is already running.'};
  else if (xpath[1] === 'stop') result = commandStop(xpath);
  else if (xpath[1] === 'update') result = commandUpdate(xpath);
  else if (xpath[1] === 'endpoint') result = commandEndpoint(xpath);
  else result = {error: 400, data: "The command specified '" + xpath[1] + "'does not exist!"};
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
  if (xpath[2] === 'conf.js' && xpath.length === 3) {
    return {error: 0, data: 'lib/router/conf/conf.js', mime: 'file:text/javascript'};
  } else if (xpath.length === 2) {
    return {error: 0, data: 'lib/router/conf/conf.html', mime: 'file:text/html'};
  } else if (xpath[2] === 'get') {
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
  // ['command','exec','dir',...,'file.json','param_1',...'param_n']

  let filePathCommand; // ['dir',...,'file.json']
  let command; // ['param_1',...'param_n']

  for (let index = 0; index < xpath.length - 2; ++index) {
    const parameter = xpath[index + 2];
    if (parameter.endsWith('.json')) {
      filePathCommand = xpath.slice(2, index + 3);
      command = xpath.slice(index + 3);
      break;
    }
  }

  if (!filePathCommand) return {error: 400, data: 'Expected file with .json extension.'};

  if (command.length === 0) command = ['main'];

  const filePath = '../' + filePathCommand.join('/');
  if (fs.existsSync(filePath)) { //  check if file exists
    const content = fs.readFileSync(filePath, 'utf-8');
    let recipe;
    try {
      recipe = JSON.parse(content);
    } catch (e) {
      return {error: 400, data: 'Error parsing JSON: ' + e + 'Faulty recipe.'};
    }

    const id = recipe.id || recipe.asset || recipe.engine || recipe.source || 'script' + DJB2.hash(content);

    recipe = recipes.handleImport(recipe, [], id);
    recipe.id = id;
    recipe.customQrtzExec = id;
    recipe.filename = 'custom.' + id + '.json';
    const result = qrtzProcess.create({sessionID: 1, path: xpath, recipe: recipe, command});
    return result;
  } else return {error: 404, data: 'File ' + filePath + ' not found.'};
}

function commandReload (xpath) {
  const sessionID = 1;
  if (xpath.length === 2) { // Reload everything
    const result = qrtzProcess.create({sessionID, path: xpath, command: ['reload'], steps: ['wait']});
    sequential.next([APIqueue.pause, scheduler.pause, conf.reload, recipes.init, modules.init, scheduler.resume, APIqueue.resume, qrtzProcess.sequentialStop(result.data, 'Reload successfully')]);
    return result;
  } else if (xpath[2] === 'conf') {
    const result = qrtzProcess.create({sessionID, path: xpath, command: ['reload', 'conf'], steps: ['wait']});
    const processID = result.data;
    sequential.next([conf.reload, qrtzProcess.sequentialStop(processID, 'Configuration reloaded successfully.')]);
    return result;
  } else if (xpath[2] === 'modules') {
    const result = qrtzProcess.create({sessionID, path: xpath, command: ['reload', 'modules'], steps: ['wait']});
    sequential.next([APIqueue.pause, scheduler.pause, modules.init, scheduler.resume, APIqueue.resume, qrtzProcess.sequentialStop(result.data, 'Modules reloaded successfully.')]);
    return result;
  } else if (xpath[2] === 'recipes') {
    const result = qrtzProcess.create({sessionID, path: xpath, command: ['reload', 'recipes'], steps: ['wait']});
    sequential.next([APIqueue.pause, scheduler.pause, recipes.init, modules.init, scheduler.resume, APIqueue.resume, qrtzProcess.sequentialStop(result.data, 'Recipes reloaded succesfully.')]);
    return result;
  } else if (xpath[2] === 'sessions') {
    // TODO
  } else {
    return {error: 400, data: 'Unknown reload command.'};
  }
}

function commandUpdate (xpath) {
  const sessionID = 1;
  if (xpath.length === 2) { // Update
    return commandStop(xpath);
  } else if (xpath[2] === 'check') {
    const result = qrtzProcess.create({sessionID, path: xpath, command: ['update', 'check'], steps: ['rout /engine/update/check']});
    return result;
  } else {
    return {error: 400, data: 'Unknown reload command.'};
  }
}

// 'blabla %d bla', 1 -> 'blabla 1 bla'
function printf (a, b) {
  if (typeof b === 'undefined') return a + '\n';
  return a.replace(/%./g, () => b) + '\n';
}

function commandEvents (xpath) {
  let data = '';
  const logger = {
    log: (a, b) => { data += printf(a, b); },
    error: (a, b) => { data += printf(a, b); }
  };
  const {introspection} = require('../hybrixd');
  introspection(logger);
  return {error: 0, data};
}

const {stop} = require('../stop');

function commandStop (xpath) {
  const data = stop(xpath[1]);
  return {error: 0, data};
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
