const cache = require('../cache');
const scheduler = require('../scheduler/scheduler');
const DJB2 = require('../../common/crypto/hashDJB2'); // fast DJB2 hashing

const DEFAULT_CACHE_VALUE = 12000;

function getFreshOrCachedData (recipe, request, xpath) {
  const cacheVal = typeof recipe.cache !== 'undefined' ? recipe.cache : DEFAULT_CACHE_VALUE;
  const cacheIdx = DJB2.hash(request.sessionID + xpath.join('/'));
  const cacheResult = cache.get(cacheIdx, cacheVal);
  const result = getFreshOrCachedData_(cacheResult, cacheIdx, recipe, request, xpath);

  // if there's no error, use the new value
  if (!result.error && !result.noCache) cache.add(cacheIdx, result);

  return result;
}

function getFreshDataWithoutCaching (recipe, request, xpath) {
  const result = execOrError(recipe, xpath, request.sessionID, request.data);
  return Object.assign(result, {noCache: true});
}

function getFreshOrCachedData_ (cacheResult, cacheIdx, recipe, request, xpath) {
  return cacheResult && cacheResult.fresh
    ? cacheResult.data
    : getExecDataorCached(cacheIdx, cacheResult, recipe, request, xpath);
}

// TODO: See TODO above :)
function getExecDataorCached (cacheIdx, cacheResult, recipe, request, xpath) {
  let result = moduleExecOrError(recipe, xpath, request.sessionID, request.data); // We do a fresh call
  return !result.error || !cacheResult
    ? result
    : cacheResult.data;
}

function moduleExecOrError (recipe, xpath, sessionID, data) {
  const module = recipe.module || 'quartz';
  const moduleExists = global.hybrixd.module.hasOwnProperty(module);
  return !moduleExists
    ? {error: 1, data: 'Module "' + module + '" not found!'}
    : activateModuleExec(data, recipe, xpath, sessionID);
}

function activateModuleExec (data, recipe, xpath, sessionID) {
  const command = xpath.slice(2);
  return scheduler.exec(data, recipe, xpath, command, sessionID); // init new process
}

// activate module exec function - disconnects and sends results to processID!
// run the module connector function - disconnects and sends results to processID!
function execOrError (recipe, xpath, sessionID, data) {
  const module = recipe.module || 'quartz';
  const moduleExec = global.hybrixd.module[module];
  return !moduleExec
    ? {error: 1, data: 'Module "' + module + '" not found or disfunctional!'}
    : activateModuleExec(data, recipe, xpath, sessionID);
}

module.exports = {
  getFreshOrCachedData,
  getFreshDataWithoutCaching
};
