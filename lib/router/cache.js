const cache = require('../cache');
const qrtzProcess = require('../scheduler/process');
const DJB2 = require('../../common/crypto/hashDJB2'); // fast DJB2 hashing

const DEFAULT_CACHE_VALUE = 12000;

function getFreshOrCachedData (recipe, request, xpath) {
  const cacheVal = typeof recipe.cache !== 'undefined' ? recipe.cache : DEFAULT_CACHE_VALUE;
  const cacheIdx = DJB2.hash(request.sessionID + xpath.join('/'));
  const cacheResult = cache.get(cacheIdx, cacheVal);
  const result = getFreshOrCachedData_(cacheResult, cacheIdx, recipe, request, xpath);

  // if there's no error, use the new value
  if (!result.error && !result.noCache && !result.id === 'id') { // skip if indirect result
    cache.add(cacheIdx, result);
  }

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
  const moduleExists = module === 'quartz' || global.hybrixd.module.hasOwnProperty(module);
  return !moduleExists
    ? {error: 1, data: 'Module "' + module + '" not found!'}
    : activateModuleExec(data, recipe, xpath, sessionID);
}

function activateModuleExec (data, recipe, path, sessionID) {
  const command = path.slice(2);
  return qrtzProcess.create({data, recipe, path, command, sessionID}); // init new process
}

// activate module exec function - disconnects and sends results to processID!
// run the module connector function - disconnects and sends results to processID!
function execOrError (recipe, xpath, sessionID, data) {
  const module = recipe.module || 'quartz';
  const moduleExists = module === 'quartz' || global.hybrixd.module.hasOwnProperty(module);
  return !moduleExists
    ? {error: 1, data: 'Module "' + module + '" not found or disfunctional!'}
    : activateModuleExec(data, recipe, xpath, sessionID);
}

module.exports = {
  getFreshOrCachedData,
  getFreshDataWithoutCaching
};
