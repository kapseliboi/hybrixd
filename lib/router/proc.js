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
    } else {
      return {error: 500, data: 'Not yet implemented.'};// TODO
    }
  } else if (processArgument === 'finished') {
    return {error: 0, data: qrtzProcess.getFinishedProcessList(sessionID)};
  } else if (processArgument === 'busy') {
    return {error: 0, data: qrtzProcess.getBusyProccessList(sessionID)};
  } else if (processArgument === 'queue') {
    return {error: 0, data: qrtzProcess.getQueuedProccessList(sessionID)};
  } else if (processArgument === 'kill') { // TODO
    return {error: 500, data: 'Not yet implemented.'};// TODO
  } else if (processArgument === 'debug') {
    result = procDebug(sndArgument, sessionID);
  } else if (processArgument === 'code') {
    result = procCode(xpath[2], xpath[3], xpath[4], sessionID);
  } else if (processArgument === 'exec') {
    result = procExec(xpath, request.data);
  } else if (processArgument === 'pause') {
    return {error: 500, data: 'Not yet implemented.'}; // TODO
  } else if (processArgument === 'resume') {
    return {error: 500, data: 'Not yet implemented.'}; // TODO
  } else {
    result = procData(processArgument, sessionID);
  }
  if (result.error === 0) result.noCache = true;
  return result;
}

function procList (sessionID) {
  const data = qrtzProcess.getProcessList(sessionID);
  return {error: 0, data};
}

function procData (processID, sessionID) {
  return qrtzProcess.getInfo(processID, sessionID);
}

function stringifyStatement (statement) {
  return typeof statement === 'string' ? statement : statement.toString();
}

function stringifyFunction (statements, type, id, func) {
  return (statements instanceof Array
    ? statements
    : ['#/' + type + '/' + id + '/' + statements.getSignature(), ...statements.getLines()]).map(stringifyStatement);
}

function stringifyQrtz (quartz, type, id) {
  const result = {};
  for (let func in quartz) result[func] = stringifyFunction(quartz[func], type, id, func);
  return result;
}

function procCode (type, id, func, session) {
  if (type === 'code.js') {
    return {error: 0, data: 'lib/router/code/code.js', mime: 'file:text/javascript'};
  } else if (typeof type === 'undefined') {
    return {error: 0, data: 'lib/router/code/code.html', mime: 'file:text/html'};
  }

  if (type === 'a') type = 'asset';
  else if (type === 'e') type = 'engine';
  else if (type === 's') type = 'source';

  if (!['asset', 'engine', 'source'].includes(type)) return {error: 404, data: 'Unknown type ' + type};
  let step;
  if (typeof func === 'string' && func.includes(':')) [func, step] = func.split(':');
  let recipe;
  const list = global.hybrixd[type];
  if (list.hasOwnProperty(id)) recipe = list[id];
  else return {error: 404, data: 'Unknown ' + type + 'id ' + id};
  const quartz = typeof recipe === 'object' && recipe !== null && recipe.hasOwnProperty('quartz')
    ? recipe.quartz
    : {};
  if (!func) return {error: 0, data: stringifyQrtz(quartz, type, id)};
  else if (quartz.hasOwnProperty(func)) {
    const statements = stringifyFunction(quartz[func], type, id, func);
    if (typeof step === 'undefined') return {error: 0, data: statements};
    else if (step >= 0 && step < statements.length) return {error: 0, data: statements[step]};
    else return {error: 404, data: 'Unknown step : ' + id + '/' + func + ':' + step};
  } else return {error: 404, data: 'Unknown function : ' + id + '/' + func};
}

function procDebug (processID, sessionID) {
  if (processID === 'debug.js') {
    return {error: 0, data: 'lib/router/debug/debug.js', mime: 'file:text/javascript'};
  } else if (typeof processID === 'undefined') {
    return {error: 0, data: 'lib/router/debug/debug.html', mime: 'file:text/html'};
  } else { // debug a proccessID   /p/debug/124125214.23
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
exports.process = process;
